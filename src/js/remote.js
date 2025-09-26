import { openSocketForGame } from './signalling.js'
import { createRemote } from './peers.js'
import { controlsUi } from './ui.js'

// Per connection constants
const secret = new URL(window.location).searchParams.get('secret')

// TODO: Source these from the environment
const hostId = 'host'       // From host?
const gameId = 'game1'      // From host?
const remoteId = `p-${Date.now()}`

// Well known constants
const channelLabel = 'chat'
const channelId = 100

// Start signalling
const socket = await openSocketForGame(gameId, secret)

// Set up P2P message channel to host
const config = { socket, hostId, channelLabel, channelId }
const { channel: hostChannel } = await createRemote(config, remoteId, hostId, true)

// No need to keep socket open
socket.close()

// OK, ready for app

// UI: DOM
const $controls = document.getElementById('controls')

// UI: Controls
const renderControls = controlsUi($controls, (cmd) => hostChannel.send(cmd))
renderControls('idle')
hostChannel.onMessage((msg) => {
  console.log('host message:', msg)
  if (msg.state) renderControls(msg.state)
})
