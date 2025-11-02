import { Wall } from './map.js'

export const Commands = {
  Forwards: 'F',
  Right: 'R',
  Backwards: 'B',
  Left: 'L',
  Pause: 'P',
}

export const sleep = (delay) =>
  new Promise((resolve) => setTimeout(resolve, delay))

/** Run all given promises in sequence. */
Promise.seq = (ps) =>
  ps.reduce((acc, next) => acc.then(next), Promise.resolve())

/** Create a generic asynchronous event hub with a single topic. */
export const eventHub = (name = '') => {
  let listeners = []

  const subscribe = (cb) => {
    listeners.push(cb)
    return () => listeners = listeners.filter(l => l !== cb)
  }

  const notify = (state) =>
    Promise.seq(listeners.map(l => () => l(state)))

  return { subscribe, notify }
}

/** Create a generic synchronous event hub with a single topic. */
const syncEventHub = () => {
  let listeners = []

  const subscribe = (cb) => {
    listeners.push(cb)
    return () => listeners = listeners.filter(l => l !== cb)
  }

  const notify = (state) =>
    listeners.forEach((l) => l(state))

  return { subscribe, notify }
}

/**
 * Create a state machine from the given state config.
 */
export const createMachine = (config) => {
  if (!config) throw 'Must provide config'
  if (!config.initial) throw 'Must provide initial state'

  let state = null

  const { subscribe, notify } = eventHub('machine')

  const current = () => state

  const setValue = async (newState) => {
    state = newState
    await notify(state)
  }

  const start = () => enter(config.initial)

  const send = async (e) => {
    if (!e) throw 'Must provide event to send'
    if (!e.type) throw 'Must provide type to send'

    const onSend = config[state]?.on[e.type]
    if (!onSend) return

    const { action, target } = onSend
    if (action) await action(e)
    if (target) await enter(target)
  }

  const result = { current, start, send, subscribe }

  const enter = async (newState) => {
    await setValue(newState)

    const onEnter = config[state]?.enter
    if (onEnter) await onEnter(result)
  }

  return result
}

export const createProgram = () => {
  let program = []

  const { subscribe, notify } = eventHub('program')

  const current = () => program
  const setValue = async (newProgram) => {
    program = newProgram
    await notify(program)
  }

  const add = (cmd) => setValue([...program, cmd])
  const back = () => setValue(program.slice(0, -1))
  const reset = () => setValue([])

  const interpret = (actionFn) =>
    Promise.seq(program.map(actionFn))

  return { current, add, back, reset, interpret, subscribe }
}

export const Directions = { Up: 0, Right: 1, Down: 2, Left: 3 }

export const createBot = () => {
  let state = {
    position: { x: 0, y: 0 },
    orientation: { direction: Directions.Up, angle: 0 },
    home: { x: 0, y: 0 },
  }

  const { subscribe, notify } = eventHub('bot')

  const setValue = (newState) => {
    state = newState
    return notify(moved())
  }
  const updateValue = (updateFn) => setValue(updateFn(state))
  const mergeValue = (updateFn) => setValue({ ...state, ...updateFn(state) })

  // Events
  const current = () => ({ type: 'current', ...state })
  const moved = () => ({ type: 'moved', ...state })
  const waggled = () => ({ type: 'waggled', ...state })

  // Update functions
  const changePosition = (dx, dy) => ({ position }) => ({
    position: {
      x: position.x + dx,
      y: position.y + dy,
    },
  })
  const changeOrientation = (change) => ({ orientation }) => ({
    orientation: {
      direction: (orientation.direction + 4 + change) % 4,
      angle: orientation.angle + change * 90,
    },
  })

  const orientationVectors = {
    [Directions.Up]: { x: 0, y: -1 },
    [Directions.Right]: { x: 1, y: 0 },
    [Directions.Down]: { x: 0, y: 1 },
    [Directions.Left]: { x: -1, y: 0 },
  }

  // Actions
  const forward = () => {
    const change = orientationVectors[state.orientation.direction]
    return mergeValue(changePosition(change.x, change.y))
  }
  const backward = () => {
    const change = orientationVectors[state.orientation.direction]
    return mergeValue(changePosition(-change.x, -change.y))
  }
  const right = () => mergeValue(changeOrientation(1))
  const left = () => mergeValue(changeOrientation(-1))
  const pause = () => sleep(1000)
  const waggle = () => notify(waggled())
  const setHome = (newHome) => mergeValue(() => ({ home: newHome }))
  const goHome = () => mergeValue((s) => ({
    position: s.home,
    ...changeOrientation(-state.orientation.angle / 90)(s),
  }))

  return { current, forward, right, backward, left, pause, setHome, goHome, waggle, subscribe }
}

export const createLevel = (levels) => {
  let level = null
  const { subscribe, notify } = eventHub('level')

  const current = () => level
  const set = (newCode) => {
    level = levels.find(({ code }) => code === newCode)
    return notify(current())
  }

  return { current, set, subscribe }
}

export const createInterpreter = (b, isValid) => {
  if (!b) throw 'Must supply the bot to move'
  if (!isValid) throw 'Must supply the function to check commands'

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
    const ok = isValid(b.current(), cmd)
    const action = ok ? actions[cmd] : waggle
    return action()
  }

  const actions = {
    [Commands.Forwards]: () => b.forward(),
    [Commands.Right]: () => b.right(),
    [Commands.Backwards]: () => b.backward(),
    [Commands.Left]: () => b.left(),
    [Commands.Pause]: () => b.pause(),
  }
  const waggle = () => b.waggle()

  return { current, run, subscribe }
}

export const canMove = (wallsFn) => {
  const findWall = (type, x, y) =>
    wallsFn()
      .filter(w => w.type === type)
      .find(w => w.position.x === x && w.position.y === y)

  return (current, command) => {
    const { position, orientation: { direction } } = current

    switch (command) {
      case Commands.Forwards:
        // Look for wall in direction
        switch (direction) {
          case Directions.Up: return !findWall(Wall.HORIZ, position.x, position.y)
          case Directions.Right: return !findWall(Wall.VERT, position.x + 1, position.y)
          case Directions.Down: return !findWall(Wall.HORIZ, position.x, position.y + 1)
          case Directions.Left: return !findWall(Wall.VERT, position.x, position.y)
        }
      case Commands.Backwards:
        // Look for wall in opposite direction
        switch (direction) {
          case Directions.Up: return !findWall(Wall.HORIZ, position.x, position.y + 1)
          case Directions.Right: return !findWall(Wall.VERT, position.x, position.y)
          case Directions.Down: return !findWall(Wall.HORIZ, position.x, position.y)
          case Directions.Left: return !findWall(Wall.VERT, position.x + 1, position.y)
        }
      default:
        return true
    }
  }
}

export const connectionsManager = () => {
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
