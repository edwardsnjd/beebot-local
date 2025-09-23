import { openSocketForGame, signalsForPair } from './signalling.js'
import { connectToPeer, openChannel } from './peers.js'

// Per connection constants
const secret = new URL(window.location).searchParams.get('secret')

// TODO: Source these from the environment
const hostId = 'host'       // From host?
const gameId = 'game1'      // From host?
const playerId = `p-${Date.now()}`

// Well known constants
const channelLabel = 'chat'
const channelId = 100

// Set up P2P message channel to host
const socket = await openSocketForGame(gameId, secret)
const hostSignals = signalsForPair(socket, playerId, hostId)
const hostConnection = await connectToPeer(hostSignals, true)
const hostChannel = await openChannel(hostConnection, channelLabel, channelId)
hostSignals.close()

// OK, ready for app
hostChannel.onMessage((msg) => {
  console.log('host message:', msg)
  document.getElementById('log').innerText += msg
  document.getElementById('log').innerText += '\n'
})
setInterval(() => hostChannel.send(`hello from ${playerId}`), 10000)

function requestOrientationPermission() {
  (typeof DeviceOrientationEvent.requestPermission === 'function'
    ? DeviceOrientationEvent.requestPermission().then(state => state === 'granted')
    : Promise.resolve(true)
  )
    .then(granted => granted
      ? window.addEventListener('deviceorientation', throttledHandler, true)
      : alert('DeviceOrientation permission denied')
    )
    .catch(console.error);
}

function handleOrientation(event) {
  hostChannel.send({
    o: [
      Math.floor(event.alpha),
      Math.floor(event.beta),
      Math.floor(event.gamma),
    ],
  })
}

const throttle = (fn, delay) => {
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

const throttledHandler = throttle(handleOrientation, 20)

// Add a button to request permission
const button = document.createElement('button');
button.innerText = 'Enable Device Orientation';
button.addEventListener('click', requestOrientationPermission);
document.body.appendChild(button);
