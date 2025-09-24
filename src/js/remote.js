import { openSocketForGame, signalsForPair } from './signalling.js'
import { connectToPeer, openChannel } from './peers.js'

// Per connection constants
const secret = new URL(window.location).searchParams.get('secret')

// TODO: Source these from the environment
const hostId = 'host'       // From host?
const gameId = 'game1'      // From host?
const remoteId = `p-${Date.now()}`

// Well known constants
const channelLabel = 'chat'
const channelId = 100

// DOM
const $controls = document.getElementById('controls')

// Set up P2P message channel to host
const socket = await openSocketForGame(gameId, secret)
const hostSignals = signalsForPair(socket, remoteId, hostId)
const hostConnection = await connectToPeer(hostSignals, true)
const hostChannel = await openChannel(hostConnection, channelLabel, channelId)
hostSignals.close()

// OK, ready for app
hostChannel.onMessage((msg) => {
  console.log('host message:', msg)
  document.getElementById('log').innerText += msg
  document.getElementById('log').innerText += '\n'
})

const sendEvent = (e) =>
  hostChannel.send(e)

const Commands = {
  Up: 'U',
  Right: 'R',
  Down: 'D',
  Left: 'L',
  Pause: 'P',
}

// UI: Controls
const controlsUi = ($el) => {
  const up = $el.querySelector('.up')
  const right = $el.querySelector('.right')
  const down = $el.querySelector('.down')
  const left = $el.querySelector('.left')
  const go = $el.querySelector('.go')
  const reset = $el.querySelector('.reset')
  const pause = $el.querySelector('.pause')

  up.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Up }))
  right.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Right }))
  down.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Down }))
  left.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Left }))
  pause.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Pause }))
  go.addEventListener('click', () => sendEvent({ type: 'go' }))
  reset.addEventListener('click', () => sendEvent({ type: 'reset' }))
}
controlsUi($controls)
