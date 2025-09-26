import { openSocketForGame } from './signalling.js'
import { listenForRemotes } from './peers.js'
import { machine } from './machine.js'
import { createBot } from './bot.js'
import { buildProgram } from './program.js'
import { Commands } from './core.js'
import * as ui from './ui.js'

// Per connection constants
const secret = new URL(window.location).searchParams.get('secret')

// TODO: Source these from the environment
const hostId = 'host'
const gameId = 'game1'

// Well known constants
const channelLabel = 'chat'
const channelId = 100

// Game

const b = createBot()
const p = buildProgram(b)

const onCommand = (cmd) => ({
  [Commands.Up]: () => b.forward(),
  [Commands.Right]: () => b.right(),
  [Commands.Down]: () => b.backward(),
  [Commands.Left]: () => b.left(),
  [Commands.Pause]: () => b.pause(),
}[cmd])

const m = machine({
  initial: 'idle',
  idle: {
    on: {
      add: { action: (e) => p.add(e.cmd) },
      reset: { action: () => p.reset() },
      go: { target: 'running' },
    },
  },
  running: {
    enter: (m) => p.interpret(onCommand)
      .then(() => m.send({ type: 'done' })),
    on: {
      done: { target: 'idle', }
    },
  },
})
m.start()

// Start signalling
const socket = await openSocketForGame(gameId, secret)

// Listen for remotes
const config = { socket, hostId, channelLabel, channelId }
listenForRemotes(config, (remote) => {
  const { id, channel } = remote
  console.log(`Remote connected: ${id}`)

  // Forward messages from remote to state machine
  channel.onMessage((msg) => m.send(msg))

  // Forward all state changes to remote
  channel.send({ state: m.current() })
  m.subscribe((state) => channel.send({ state }))
})

// UI: DOM
const $remoteLink = document.getElementById('remoteLink')
const $qr = document.getElementById('qr-container')
const $bot = document.querySelector('.beebot')
const $controls = document.getElementById('controls')
const $program = document.getElementById('program')
const $status = document.getElementById('status')

// UI: Remotes
const remoteUrl = `${$remoteLink.href}?secret=${secret}`
ui.remoteLinkUi($remoteLink)(remoteUrl)
ui.remoteQrUi($qr)(remoteUrl)

// UI: Controls
const renderControls = ui.controlsUi($controls, m)
renderControls(m.current())
m.subscribe(renderControls)

// UI: Bot
const renderBot = ui.botUi($bot)
b.subscribe(renderBot)

// UI: Program
const renderProgram = ui.programUi($program)
renderProgram(p.current())
p.subscribe(renderProgram)

// UI: Status
const renderStatus = ui.statusUi($status)
renderStatus(m.current())
m.subscribe(renderStatus)
