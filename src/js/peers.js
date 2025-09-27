import { WebSocketSignals, signalsForLocal, signalsForPair } from './signalling.js'

/**
 * Listen on the given socket for incoming requests to pair and call
 * back with each new remote.
 *
 * This currently only calls back with successful connections.
 *
 * @type {Remote => void} onRemote
 */
export const listenForRemotes = (config, onRemote) => {
  const { socket, hostId } = config

  const signals = signalsForLocal(socket, hostId)

  signals.onMessage(async (envelope) => {
    const { payload: msg } = envelope
    switch (msg.type) {
      case 'ping':
        console.log('received ping, starting new remote', envelope.from)
        const remote = await createRemote(config, hostId, envelope.from)
        return onRemote(remote)
      default:
        console.log('Ignoring message', envelope)
    }
  })
}

/**
 * Create a remote, optionally initiating the connection.
 */
export const createRemote = async (config, localId, remoteId, caller=false) => {
  const { socket, channelLabel, channelId } = config
  const signals = signalsForPair(socket, localId, remoteId)
  const connection = await connectToPeer(signals, caller)
  const channel = await openChannel(connection, channelLabel, channelId)
  return { id: remoteId, channel }
}

/**
 * Build and return a P2P connection to a peer via the given signalling channel.
 *
 * This only resolves to the open connection, otherwise this rejects.
 *
 * @type {WebSocketSignals} signals
 * @returns {Promise<RTCPeerConnection>}
 */
export async function connectToPeer(signals, caller = false) {
  const connection = new RTCPeerConnection({
    // Configuration for ICE servers (STUN server needed for NAT traversal)
    // iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    iceServers: [],
  })

  console.log('Opened a new RTCPeerConnection', { caller })

  // Caller
  const ping = async () => {
    console.log('ping')
    signals.send({ type: 'ping' })
  }

  // Callee
  const pong = async () => {
    console.log('pong')
    signals.send({ type: 'pong' })
  }

  // Caller
  const handlePong = async () => {
    console.log('handlePong')
    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)

    signals.send({ type: 'offer', offer })
  }

  // Callee
  const handleOffer = async (offer) => {
    console.log('handleOffer', offer)
    await connection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)

    signals.send({ type: 'answer', answer })
  }

  // Caller
  const handleAnswer = async (answer) => {
    console.log('handleAnswer', answer)
    await connection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  // Both
  const handleCandidate = async (candidate) => {
    console.log('handleCandidate', candidate)
    await connection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  // Create dummy data channel to force ICE candidate negotiation
  connection.createDataChannel('dummy', { negotiated: true, id: 0 })

  connection.addEventListener('icecandidate', ({ candidate }) => {
    console.log('icecandidate', candidate)
    if (!candidate) return
    signals.send({ type: 'ice-candidate', candidate })
  })

  if (caller) {
    await ping()
  } else {
    await pong()
  }

  signals.onMessage(async (message) => {
    console.log('ICE signalling message', message)
    switch (message.type) {
      case 'pong': return await handlePong()
      case 'offer': return await handleOffer(message.offer)
      case 'answer': return await handleAnswer(message.answer)
      case 'ice-candidate': return await handleCandidate(message.candidate)
      default: console.log('Unexpected ICE signal received', message)
    }
  })

  return new Promise((resolve, reject) => {
    connection.addEventListener('connectionstatechange', () => {
      switch (connection.connectionState) {
        case "connected":
          return resolve(connection)
        case "disconnected":
        case "closed":
        case "failed":
          return reject()
      }
    })
  })
}

/**
 * Build and return a data channel to a peer via their connection.
 *
 * This only resolves to the open channel, otherwise this rejects.
 *
 * @type {RTCPeerConnection} connection
 * @returns {Promise<DataChannelMessages>}
 */
export async function openChannel(connection, label, id) {
  const channel = connection.createDataChannel(label, { negotiated: true, id})
  return new Promise((resolve, _reject) => {
    channel.addEventListener('open', () => {
      console.log('Data channel open')
      resolve(channel)
    })
  }).then(channel => new DataChannelMessages(channel))
}

/**
 * An abstract connection to a rendezvous room on a signalling server.
 *
 * This is used to send/receive public messages in that room.
 *
 * It supports optional wrapping/unwrapping and filtering of delivered payloads,
 * useful for adding routing info.
 */
class DataChannelMessages {
  #cb
  #channel

  /**
   * @type {RTCDataChannel} channel
   */
  constructor(channel) {
    this.#channel = channel
    channel.addEventListener('message', (...args) => this.#onmessage(...args))
  }

  /**
   * Send the given message, optionally wrapping it first.
   *
   * @param {any} msg
   * @returns {Promise<any>}
   */
  async send(msg) {
    const data = JSON.stringify(msg)
    this.#channel.send(data)
  }

  /**
   * Set the sole callback for the socket to the given handler,
   * optionally filtering the delivered wrapped messages first.
   *
   * @param {MessageHandler} cb - async handler function
   */
  onMessage(cb) {
    this.#cb = cb
  }

  #onmessage(ev) {
    if (!this.#cb) return

    const msg = JSON.parse(ev.data)
    Promise.resolve(msg)
      .then(m => this.#cb(m))
      .catch(console.error)
  }
}
