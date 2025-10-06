import { openSocketForGame } from './signalling.js'
import { listenForRemotes } from './peers.js'
import { createMachine, createBot, createProgram, Commands } from './core.js'
import * as ui from './ui.js'
import { eventHub } from './core.js'
import { parse } from './map.js'

// Per connection constants
const secret = new URL(window.location).searchParams.get('secret')

// TODO: Source these from the environment?
const hostId = `h-${Date.now()}`
const gameId = hostId

// Well known constants
const channelLabel = 'chat'

// Game

const b = createBot()
const p = createProgram(b)

const map = parse([
  '+ +',
  ' h ',
  '+ +',
  '   ',
  '0 +',
  ' s ',
])

const createInterpreter = (b) => {
  let command = null
  let index = null

  const { subscribe, notify } = eventHub('interpreter')

  const set = (c, i) => {
    command = c
    index = i
    notify(current())
  }
  const current = () => ({ command, index })

  const run = (p) =>
    p.interpret(step)
      .then(() => set(null, null))

  const step = (cmd, idx, _all) => () => {
    set(cmd, idx)
    return actions[cmd]()
  }

  const actions = {
    [Commands.Up]: () => b.forward(),
    [Commands.Right]: () => b.right(),
    [Commands.Down]: () => b.backward(),
    [Commands.Left]: () => b.left(),
    [Commands.Pause]: () => b.pause(),
  }

  return { current, run, subscribe }
}
const i = createInterpreter(b)

const m = createMachine({
  initial: 'idle',
  idle: {
    on: {
      add: { action: (e) => p.add(e.cmd) },
      reset: { action: () => p.reset() },
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
m.start()

const connectionsManager = () => {
  let remotes = []

  const { subscribe, notify } = eventHub('connections')

  const current = () =>
    remotes.map(r => ({
      id: r.id,
      channel: {
        id: r.channel.channel.id,
        label: r.channel.channel.label,
        readyState: r.channel.channel.readyState,
      },
      connection: {
        connectionState: r.connection.connectionState,
        signalingState: r.connection.signalingState,
      },
    }))

  const publish = () => notify(current())

  const add = (remote) => {
    remotes.push(remote)

    remote.connection.addEventListener('connectionstatechange', publish)
    remote.connection.addEventListener('signalingstatechange', publish)
    remote.connection.addEventListener('datachannel', publish)
    remote.channel.channel.addEventListener('close', publish)
    remote.channel.channel.addEventListener('error', publish)

    publish()
  }

  return { current, add, subscribe }
}
const mgr = connectionsManager()

// Start signalling
const socket = await openSocketForGame(gameId, secret)

// Listen for remotes
const config = { socket, hostId, channelLabel }
listenForRemotes(config, (remote) => {
  const { channel } = remote
  mgr.add(remote)

  // Forward messages from remote to state machine
  channel.onMessage((msg) => m.send(msg))

  // Forward all state changes to remote
  channel.send({ state: m.current() })
  m.subscribe((state) => channel.send({ state }))
})

// UI: DOM
const $remoteLink = document.getElementById('remoteLink')
const $qr = document.getElementById('qr-container')
const $controls = document.getElementById('controls')
const $board = document.getElementById('board')
const $program = document.getElementById('program')
const $connections = document.getElementById('connections')

// UI: Remotes
const remoteUrl = `${$remoteLink.href}?host=${hostId}&secret=${secret}`
ui.remoteLinkUi($remoteLink)(remoteUrl)
ui.remoteQrUi($qr)(remoteUrl)

// UI: Controls
const renderControls = ui.controlsUi($controls, (cmd) => m.send(cmd))
renderControls(m.current())
m.subscribe(renderControls)

// UI: Board
const renderBoard = ui.boardUi($board, map)
renderBoard(b.current())
b.subscribe(renderBoard)

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
