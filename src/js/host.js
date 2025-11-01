import {
    canMove,
    connectionsManager,
    createBot,
    createInterpreter,
    createLevel,
    createMachine,
    createProgram,
} from './core.js'
import { levels } from './map.js'
import { listenForRemotes } from './peers.js'
import { openSocketForGame } from './signalling.js'
import * as ui from './ui.js'

// Per connection constants
const secret = new URL(window.location).searchParams.get('secret')

// TODO: Source these from the environment?
const hostId = `h-${Date.now()}`
const gameId = hostId

// Well known constants
const channelLabel = 'chat'

// Game

const b = createBot()
const p = createProgram()
const l = createLevel(levels)

l.set(levels[0].code)
b.setHome(l.current().map.home)
b.goHome()

const isOkMove = canMove(() => l.current().map.walls)
const i = createInterpreter(b, isOkMove)

const m = createMachine({
  initial: 'idle',
  idle: {
    on: {
      add: { action: (e) => p.add(e.cmd) },
      reset: { action: () => p.reset() },
      back: { action: () => p.back() },
      home: { action: () => b.goHome() },
      go: { target: 'running' },
    },
  },
  running: {
    enter: (m) => i.run(p)
      .then(() => m.send({ type: 'done' })),
    on: {
      done: { target: 'idle', }
    },
  },
})
await m.start()

const mgr = connectionsManager()

// Start signalling
const socket = await openSocketForGame(gameId, secret)

// Listen for remotes
const config = { socket, hostId, channelLabel }
listenForRemotes(config, (remote) => {
  const { channel } = remote
  mgr.add(remote)

  // Forward messages from remote to state machine
  channel.onMessage((msg) => {
    if (msg.type) m.send(msg)
    if (msg.code) l.set(msg.code)
  })

  // Forward all state changes to remote
  channel.send({ state: m.current() })
  m.subscribe((state) => channel.send({ state }))
  l.subscribe((level) => channel.send({ level: { code: level.code } }))
})

// UI: DOM
const $remoteLink = document.getElementById('remoteLink')
const $controls = document.getElementById('controls')
const $picker = document.getElementById('picker')
const $map = document.getElementById('map')
const $program = document.getElementById('program')
const $connections = document.getElementById('connections')
const $tabs = document.querySelectorAll('.tabs')

// UI: Remotes
const remoteUrl = `${$remoteLink.href}?host=${hostId}&secret=${secret}`
ui.remoteLinkUi($remoteLink)(remoteUrl)

// UI: Picker
const renderPicker = ui.levelsUi($picker, levels, (code) => l.set(code))
l.subscribe(renderPicker)

// UI: Controls
const renderControls = ui.controlsUi($controls, (cmd) => m.send(cmd))
renderControls(m.current())
m.subscribe(renderControls)

// UI: Board
const renderMap = ui.boardUi($map)
let renderBoard = renderMap(l.current().map)
renderBoard(b.current())
b.subscribe((...state) => renderBoard(...state))
l.subscribe(async (l) => {
  p.reset()
  b.setHome(l.map.home)
  renderBoard = renderMap(l.map)
  await b.goHome()
})

// UI: Program
const renderProgram = ui.programUi($program)
const updateProgram = () =>
  renderProgram(p.current(), i.current())
p.subscribe(updateProgram)
i.subscribe(updateProgram)

// UI: Connections
const renderConnections = ui.connectionsUi($connections)
renderConnections(mgr.current())
mgr.subscribe(renderConnections)

// UI: Tabs
$tabs.forEach($tab => ui.tabsUi($tab))
