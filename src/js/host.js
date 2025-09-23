import { openSocketForGame, signalsForLocal, signalsForPair } from './signalling.js'
import { connectToPeer, openChannel } from './peers.js'

// Per connection constants
const secret = new URL(window.location).searchParams.get('secret')

// TODO: Source these from the environment
const hostId = 'host'
const gameId = 'game1'

// Well known constants
const channelLabel = 'chat'
const channelId = 100

// DOM
const playerLink = document.getElementById('playerLink')
const qr = document.getElementById('qr-container')
const board = document.getElementById('board')
const playerPieces = new Map()

const addPlayerUi = (playerId) => {
  const piece = document.createElement('div')
  piece.innerText = playerId
  playerPieces.set(playerId, piece)
  board.appendChild(piece)
}

const updatePlayerUid = (playerId, [a, b, g]) => {
  // console.log('orientation', e)
  const piece = playerPieces.get(playerId)
  piece.style.transform =
    `rotateZ(${-a}deg) rotateX(${-b}deg) rotateY(${g}deg)`
}

// Update player link to include secret
const playerUrl = `${playerLink.href}?secret=${secret}`
playerLink.href = playerUrl
qr.innerHTML = `<qr-code contents='${playerUrl}'></qr-code>`

// Start signalling
const socket = await openSocketForGame(gameId, secret)

const addPlayer = async (playerId) => {
  console.log('adding player', playerId)

  const playerSignals = signalsForPair(socket, hostId, playerId)
  const playerConnection = await connectToPeer(playerSignals)
  const playerChannel = await openChannel(playerConnection, channelLabel, channelId)

  // OK add UI
  addPlayerUi(playerId)

  // OK, ready for app
  playerChannel.onMessage(async (msg) => {
    // console.log('player message:', msg)
    if (msg.o) updatePlayerUid(playerId, msg.o)
  })
  setInterval(() => playerChannel.send('hello from host'), 5000)
}

const handlePing = async (envelope) => {
  const { from: playerId, payload: _msg } = envelope
  console.log('received ping, starting new player', playerId)
  await addPlayer(playerId)
}

const signals = signalsForLocal(socket, hostId)

signals.onMessage(async (envelope) => {
  const { payload: msg } = envelope
  switch (msg.type) {
    case 'ping': return await handlePing(envelope)
    default: console.log('Ignoring message', envelope)
  }
})
