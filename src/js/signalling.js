/**
 * Open a websocket to the correct room on the signalling server.
 *
 * Only returns once the socket is open, otherwise rejects.
 *
 * @type {string} gameId
 * @type {string} secret
 * @returns {Promise<WebSocket>}
 */
export function openSocketForGame(gameId, secret) {
  const url = buildSocketUrl(gameId, secret)
  return openSocket(url)
}

/**
 * Build the correct URL to the signalling server.
 *
 * @type {string} roomId - name of room to connect to
 * @type {string} secret - authentication secret to allow connection
 */
function buildSocketUrl(roomId, secret) {
  return `wss://signalling.edwardsnjd.com/${roomId}?secret=${secret}`
}

/**
 * Open a websocket to the given URL.
 *
 * Only returns once the socket is open, otherwise rejects.
 *
 * @type {string} url
 * @returns {Promise<WebSocket>}
 */
async function openSocket(url) {
  const ws = new WebSocket(url)

  return await new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve(ws)
    })
    ws.addEventListener('close', (...args) => {
      console.log('onclose', ...args)
      reject('closed')
    })
    ws.addEventListener('error', (...args) => {
      console.log('onerror', ...args)
      reject('error')
    })
  })
}

/**
 * Opinionated constructor for signalling server over a given socket
 * filtered to messages for a given peer.
 *
 * @type {WebSocketSignals} signals
 * @type {string} local - local peer id
 * @returns {WebSocketSignals}
 */
export function signalsForLocal(socket, local) {
  const signals = new WebSocketSignals(socket, {
    wrap: (payload) => ({ from: local, ...payload }),
    unwrap: (envelope) => envelope,
    predicate: (envelope) => envelope.to == local,
  })
  signals['_label'] = `Local(${local} ↔ ???)`
  return signals
}

/**
 * Opinionated constructor for signalling server over a given socket
 * filtered to messages to and from given peers.
 *
 * @type {WebSocketSignals} signals
 * @type {string} local - local peer id
 * @type {string} remote - remote peer id
 * @returns {WebSocketSignals}
 */
export function signalsForPair(socket, local, remote) {
  const signals = new WebSocketSignals(socket, {
    wrap: (payload) => ({ from: local, to: remote, payload }),
    unwrap: (envelope) => envelope.payload,
    predicate: (envelope) => envelope.from == local || envelope.to == local,
  })
  signals['_label'] = `Pair(${local} ↔ ${remote})`
  return signals
}

/**
 * An abstract connection to a rendezvous room on a signalling server.
 *
 * This is used to send/receive public messages in that room.
 *
 * It supports optional wrapping/unwrapping and filtering of delivered payloads,
 * useful for adding routing info.
 */
export class WebSocketSignals {
  #cb
  #predicate
  #socket
  #unwrap
  #wrap

  /**
   * @type {WebSocket} socket
   */
  constructor(socket, opts = {}) {
    this.#socket = socket
    this.#wrap = opts.wrap || (x => x)
    this.#unwrap = opts.unwrap || (x => x)
    this.#predicate = opts.predicate || (() => true)

    socket.addEventListener('message', (...args) => this.#onmessage(...args))
  }

  /**
   * Send the given message, optionally wrapping it first.
   *
   * @param {any} msg
   * @returns {Promise<any>}
   */
  async send(msg) {
    const envelope = this.#wrap(msg)
    const data = JSON.stringify(envelope)
    this.#socket.send(data)
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

  close() {
    this.#socket.close()
  }

  #onmessage(ev) {
    if (!this.#cb) return

    const envelope = JSON.parse(ev.data)
    if (!this.#predicate(envelope)) return

    const msg = this.#unwrap(envelope)
    this.#cb(msg).catch(console.error)
  }
}
