import { openSocketForGame, signalsForLocal, signalsForPair } from './signalling.js'
import { connectToPeer, openChannel } from './peers.js'
import { machine } from './machine.js'
import { createBot, Directions, sleep } from './bot.js'
import { buildProgram } from './program.js'

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

const b = createBot()

const p = buildProgram(b)

const states = {
  initial: 'idle',
  idle: {
    on: {
      add: { action: (e) => p.addToPrg(e.cmd) },
      reset: { action: () => p.resetPrg() },
      go: { target: 'running' },
    },
  },
  running: {
    enter: (m) => p.runPrg(m),
    on: {
      done: { target: 'idle' ,}
    },
  },
}

const m = machine(states)
m.start()

// UI: Controls
const controlsUi = ($el) => {
  const up = $el.querySelector('.up')
  const right = $el.querySelector('.right')
  const down = $el.querySelector('.down')
  const left = $el.querySelector('.left')
  const go = $el.querySelector('.go')
  const reset = $el.querySelector('.reset')
  const pause = $el.querySelector('.pause')

  up.addEventListener('click', () => m.send({ type: 'add', cmd: 'up' }))
  right.addEventListener('click', () => m.send({ type: 'add', cmd: 'right' }))
  down.addEventListener('click', () => m.send({ type: 'add', cmd: 'down' }))
  left.addEventListener('click', () => m.send({ type: 'add', cmd: 'left' }))
  pause.addEventListener('click', () => m.send({ type: 'add', cmd: 'pause' }))
  go.addEventListener('click', () => m.send({ type: 'go' }))
  reset.addEventListener('click', () => m.send({ type: 'reset' }))
}

controlsUi($controls)

// UI: Bot
const botUi = ($el) => ({ position, orientation }) => {
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

b.subscribe(botUi($bot))
