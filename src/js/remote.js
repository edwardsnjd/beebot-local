import { openSocketForGame } from './signalling.js'
import { createRemote } from './peers.js'
import { controlsUi } from './ui.js'
import { eventHub } from './core.js'

// Per connection constants
const params = new URL(window.location).searchParams
const secret = params.get('secret')
const hostId = params.get('host')
const gameId = hostId
const remoteId = `p-${Date.now()}`

// Well known constants
const channelLabel = 'chat'
const channelId = 100

const connectToHost = async () => {
  // Start signalling
  const socket = await openSocketForGame(gameId, secret)

  // Set up P2P message channel to host
  const config = { socket, hostId, channelLabel, channelId }
  const remote = await createRemote(config, remoteId, hostId, true)

  // No need to keep socket open
  socket.close()

  return remote
}

const remoteManager = (fn) => {
  let remote = null
  let channel = null

  const { subscribe, notify } = eventHub()

  const current = () => remote
  const set = (r) => notify(remote = r)
  const connect = () => fn().then(set)

  const send = (msg) => {
    if (channel) channel.send(msg)
    else console.warn('No channel to send message', msg)
  }
  const messageEvents = eventHub()
  subscribe((r) => {
    channel = r?.channel
    if (channel) channel.onMessage(messageEvents.notify)
  })
  const onMessage = messageEvents.subscribe

  return { current, connect, subscribe, send, onMessage }
}
const remote = remoteManager(connectToHost)
remote.connect()

// OK, ready for app

// UI: DOM
const $connecting = document.getElementById('connecting')
const $controls = document.getElementById('controls')

// UI: Connection
const connectionUi = ($el, gameId) => {
  const $info = $el.querySelector('.info')
  return (connection) => {
    $el.classList[connection ? 'add' : 'remove']('connected')
    $info.innerText = `Game: ${gameId}`
  }
}
const renderConnection = connectionUi($connecting, gameId)
renderConnection(remote.current())
remote.subscribe(renderConnection)

// UI: Controls
const renderControls = controlsUi($controls, remote.send)
renderControls('idle')
remote.onMessage((msg) => {
  console.log('host message:', msg)
  if (msg.state) renderControls(msg.state)
})
