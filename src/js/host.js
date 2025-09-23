import { openSocketForGame, signalsForLocal, signalsForPair } from './signalling.js'
import { connectToPeer, openChannel } from './peers.js'
import { machine } from './machine.js'

// Per connection constants
const secret = new URL(window.location).searchParams.get('secret')

// TODO: Source these from the environment
const hostId = 'host'
const gameId = 'game1'

// Well known constants
const channelLabel = 'chat'
const channelId = 100

// DOM
const $remoteLink = document.getElementById('remoteLink')
const $qr = document.getElementById('qr-container')
const $bot = document.querySelector('.beebot')
const $controls = document.getElementById('controls')

// Update remote link to include secret
const remoteUrl = `${$remoteLink.href}?secret=${secret}`
$remoteLink.href = remoteUrl
$qr.innerHTML = `<qr-code contents='${remoteUrl}'></qr-code>`

// Start signalling
const socket = await openSocketForGame(gameId, secret)

const addRemote = async (remoteId) => {
  console.log('adding remote', remoteId)

  const remoteSignals = signalsForPair(socket, hostId, remoteId)
  const remoteConnection = await connectToPeer(remoteSignals)
  const remoteChannel = await openChannel(remoteConnection, channelLabel, channelId)

  // OK, ready for app
  remoteChannel.onMessage(async (msg) => {
    console.log('remote message:', msg)
  })
  // setInterval(() => remoteChannel.send('hello from host'), 5000)
}

const handlePing = async (envelope) => {
  const { from: remoteId, payload: _msg } = envelope
  console.log('received ping, starting new remote', remoteId)
  await addRemote(remoteId)
}

const signals = signalsForLocal(socket, hostId)

signals.onMessage(async (envelope) => {
  const { payload: msg } = envelope
  switch (msg.type) {
    case 'ping': return await handlePing(envelope)
    default: console.log('Ignoring message', envelope)
  }
})

// Game

let program = []
const addToPrg = (cmd) => program.push(cmd)
const resetPrg = () => program = []
const runPrg = (m) =>
  program
    .map(botCommand)
    .reduce((acc, next) => acc.then(next), Promise.resolve())
    .then(() => m.send({ type: 'done' }))

const states = {
  initial: 'idle',
  idle: {
    on: {
      add: { action: (e) => addToPrg(e.cmd) },
      reset: { action: resetPrg },
      go: { target: 'running' },
    },
  },
  running: {
    enter: runPrg,
    on: {
      done: { target: 'idle' ,}
    },
  },
}

const m = machine(states)
m.start()

// BOT

const sleep = (delay) =>
  new Promise((resolve) => setTimeout(resolve, delay))

const Directions = { Up: 0, Right: 1, Down: 2, Left: 3 }

const createBot = (cb) => {
  let position = { x: 0, y: 0 }
  let orientation = Directions.Up

  const move = ({ x, y }) => {
    position = { x: position.x + x, y: position.y + y }
    return cb({ position, orientation })
  }
  const rotate = (change) => {
    orientation = (orientation + 4 + change) % 4
    return cb({ position, orientation })
  }

  const step = 20
  const orientationVectors = {
    [Directions.Up]: { x: 0, y: -1 },
    [Directions.Right]: { x: 1, y: 0 },
    [Directions.Down]: { x: 0, y: 1 },
    [Directions.Left]: { x: -1, y: 0 },
  }
  const forward = () => {
    const change = orientationVectors[orientation]
    return move({ x: -step * change.x, y: step * change.y })
  }
  const backward = () => {
    const change = orientationVectors[orientation]
    return move({ x: -step * change.x, y: -step * change.y })
  }
  const right = () => rotate(1)
  const left = () => rotate(-1)
  const pause = () => sleep(1000)

  return { forward, right, backward, left, pause }
}

const updateUi = ($el) => ({ position, orientation }) => {
  const rotation = {
    [Directions.Up]: '0turn',
    [Directions.Right]: '0.25turn',
    [Directions.Down]: '0.50turn',
    [Directions.Left]: '0.75turn',
  }[orientation]
  $el.style.transition = '1000ms ease-in-out'
  $el.style.transform = `
    translate(${position.x}px, ${position.y}px)
    rotate(${rotation})
  `
  return sleep(1005)
}

const b = createBot(updateUi($bot))

const botCommand = (cmd) =>
  ({
    'up': () => b.forward(),
    'right': () => b.right(),
    'down': () => b.backward(),
    'left': () => b.left(),
    'pause': () => b.pause(),
  })[cmd]

// UI: Controls
const ui = ($controls) => {
  const up = $controls.querySelector('.up')
  const right = $controls.querySelector('.right')
  const down = $controls.querySelector('.down')
  const left = $controls.querySelector('.left')
  const go = $controls.querySelector('.go')
  const reset = $controls.querySelector('.reset')
  const pause = $controls.querySelector('.pause')

  up.addEventListener('click', () => m.send({ type: 'add', cmd: 'up' }))
  right.addEventListener('click', () => m.send({ type: 'add', cmd: 'right' }))
  down.addEventListener('click', () => m.send({ type: 'add', cmd: 'down' }))
  left.addEventListener('click', () => m.send({ type: 'add', cmd: 'left' }))
  pause.addEventListener('click', () => m.send({ type: 'add', cmd: 'pause' }))
  go.addEventListener('click', () => m.send({ type: 'go' }))
  reset.addEventListener('click', () => m.send({ type: 'reset' }))
}

ui($controls)
