import { Wall } from './map.js'

export const Commands = {
  Up: 'U',
  Right: 'R',
  Down: 'D',
  Left: 'L',
  Pause: 'P',
}

export const sleep = (delay) =>
  new Promise((resolve) => setTimeout(resolve, delay))

/** Run all given promises in sequence. */
Promise.seq = (ps) =>
  ps.reduce((acc, next) => acc.then(next), Promise.resolve())

/**
 * Create a generic event hub with a single topic.
 */
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

/**
 * Create a state machine from the given state config.
 */
export const createMachine = (config) => {
  if (!config) throw 'Must provide config'
  if (!config.initial) throw 'Must provide initial state'

  let state = null

  const { subscribe, notify } = eventHub('machine')

  const current = () => state

  const start = () => {
    enter(config.initial)
  }

  const send = (e) => {
    if (!e) throw 'Must provide event to send'
    if (!e.type) throw 'Must provide type to send'

    const onSend = config[state]?.on[e.type]
    if (!onSend) return

    const { action, target } = onSend
    if (action) action(e)
    if (target) enter(target)
  }

  const result = { current, start, send, subscribe }

  const enter = (newState) => {
    state = newState

    const onEnter = config[state]?.enter
    if (onEnter) onEnter(result)

    notify(state)
  }

  return result
}

export const createProgram = () => {
  let program = []

  const { subscribe, notify } = eventHub('program')

  const current = () => program
  const add = (cmd) => {
    program.push(cmd)
    notify(program)
  }
  const reset = () => {
    program = []
    notify(program)
  }

  const interpret = (actionFn) =>
    Promise.seq(program.map(actionFn))

  return { current, add, reset, interpret, subscribe }
}

export const Directions = { Up: 0, Right: 1, Down: 2, Left: 3 }

export const createBot = () => {
  let position = { x: 0, y: 0 }
  let orientation = { d: Directions.Up, angle: 0 }

  const { subscribe, notify } = eventHub('bot')

  const current = () => ({
    position,
    angle: orientation.angle,
    direction: orientation.d,
  })
  const update = (newPosition, newOrientation) => {
    position = newPosition
    orientation = newOrientation
    return notify(current())
  }

  const move = ({ x, y }) =>
    update({
      x: position.x + x,
      y: position.y + y,
    }, orientation)
  const rotate = (change) =>
    update(position, {
      d: (orientation.d + 4 + change) % 4,
      angle: orientation.angle + change * 90,
    })

  const orientationVectors = {
    [Directions.Up]: { x: 0, y: -1 },
    [Directions.Right]: { x: 1, y: 0 },
    [Directions.Down]: { x: 0, y: 1 },
    [Directions.Left]: { x: -1, y: 0 },
  }
  const forward = () => {
    const change = orientationVectors[orientation.d]
    return move({ x: change.x, y: change.y })
  }
  const backward = () => {
    const change = orientationVectors[orientation.d]
    return move({ x: -change.x, y: -change.y })
  }
  const right = () => rotate(1)
  const left = () => rotate(-1)
  const pause = () => sleep(1000)
  const waggle = async () => {
    await rotate(0.2)
    await rotate(-0.4)
    await rotate(0.2)
  }
  const goHome = () => Promise.resolve()
    .then(() => move({ x: -position.x, y: -position.y }))
    .then(() => rotate(-orientation.angle / 90))

  return { current, forward, right, backward, left, pause, goHome, waggle, subscribe }
}

export const createInterpreter = (b, map) => {
  if (!b) throw 'Must supply the bot to move'
  if (!map) throw 'Must supply the map'

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
    const ok = canMove(map.walls, b.current(), cmd)
    const action = ok ? actions[cmd] : waggle
    return action()
  }

  const actions = {
    [Commands.Up]: () => b.forward(),
    [Commands.Right]: () => b.right(),
    [Commands.Down]: () => b.backward(),
    [Commands.Left]: () => b.left(),
    [Commands.Pause]: () => b.pause(),
  }
  const waggle = () => b.waggle()

  return { current, run, subscribe }
}

const canMove = (walls, current, command) => {
  const { position, direction } = current

  const findWall = (type, x, y) =>
    walls
      .filter(w => w.type === type)
      .find(w => w.position.x === x && w.position.y === y)

  switch (command) {
    case Commands.Up:
      // Look for wall in direction
      switch (direction) {
        case Directions.Up: return !findWall(Wall.HORIZ, position.x, position.y)
        case Directions.Right: return !findWall(Wall.VERT, position.x + 1, position.y)
        case Directions.Down: return !findWall(Wall.HORIZ, position.x, position.y + 1)
        case Directions.Left: return !findWall(Wall.VERT, position.x, position.y)
      }
    case Commands.Down:
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
