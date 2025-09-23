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
setInterval(() => hostChannel.send(`hello from ${remoteId}`), 10000)

function requestOrientationPermission() const throttle = (fn, delay) => {
  let lastRun = null
  return (...args) => {

    const now = Date.now()
    const sinceLast = lastRun ? now - lastRun : delay
    if (sinceLast >= delay) {
      lastRun = now
      fn(...args)
    }
  }
}
