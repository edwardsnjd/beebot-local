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
  let home = { x: 0, y: 0 }
  let position = { x: 0, y: 0 }
  let orientation = { direction: Directions.Up, angle: 0 }

  const { subscribe, notify } = eventHub('bot')

  const current = () => ({ type: 'current', position, orientation })
  const moved = () => ({ type: 'moved', position, orientation })
  const waggled = () => ({ type: 'waggled', position, orientation })

  const move = (newPosition, newOrientation) => {
    position = newPosition
    orientation = newOrientation
    return notify(moved())
  }

  const changePosition = (dx, dy) => ({
    x: position.x + dx,
    y: position.y + dy,
  })
  const changeOrientation = (orientation, change) => ({
    direction: (orientation.direction + 4 + change) % 4,
    angle: orientation.angle + change * 90,
  })

  const orientationVectors = {
    [Directions.Up]: { x: 0, y: -1 },
    [Directions.Right]: { x: 1, y: 0 },
    [Directions.Down]: { x: 0, y: 1 },
    [Directions.Left]: { x: -1, y: 0 },
  }
  const forward = () => {
    const change = orientationVectors[orientation.direction]
    return move(changePosition(change.x, change.y), orientation)
  }
  const backward = () => {
    const change = orientationVectors[orientation.direction]
    return move(changePosition(-change.x, -change.y), orientation)
  }
  const right = () => move(position, changeOrientation(orientation, 1))
  const left = () => move(position, changeOrientation(orientation, -1))
  const pause = () => sleep(1000)
  const waggle = () => notify(waggled())
  const setHome = (newHome) => home = newHome
  const goHome = () => move(
    home,
    changeOrientation(orientation, (-orientation.angle / 90)),
  )

  return { current, forward, right, backward, left, pause, setHome, goHome, waggle, subscribe }
}

export const createInterpreter = (b, findWall) => {
  if (!b) throw 'Must supply the bot to move'
  if (!findWall) throw 'Must supply the map'

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
    const ok = canMove(findWall, b.current(), cmd)
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

const canMove = (findWall, current, command) => {
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
