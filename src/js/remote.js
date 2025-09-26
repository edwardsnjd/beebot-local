import { openSocketForGame, signalsForPair } from './signalling.js'
import { connectToPeer, openChannel } from './peers.js'
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

// Set up P2P message channel to host
const socket = await openSocketForGame(gameId, secret)
const hostSignals = signalsForPair(socket, remoteId, hostId)
const hostConnection = await connectToPeer(hostSignals, true)
const hostChannel = await openChannel(hostConnection, channelLabel, channelId)
hostSignals.close()

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
