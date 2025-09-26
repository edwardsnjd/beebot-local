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
export const eventHub = () => {
  let listeners = []

  const subscribe = (cb) => {
    listeners.push(cb)
    return () => listeners = listeners.filter(l => l !== cb)
  }
  const notify = (state) =>
    Promise.all(listeners.map(l => l(state)))

  return { subscribe, notify }
}

/**
 * Create a state machine from the given state config.
 */
export const createMachine = (config) => {
  let state = null

  const { subscribe, notify } = eventHub()

  const current = () => state

  const start = () => {
    enter(config.initial)
  }

  const send = (e) => {
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

  const { subscribe, notify } = eventHub()

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

  const { subscribe, notify } = eventHub()

  const move = ({ x, y }) => {
    position.x += x
    position.y += y
    return notify({ position, angle: orientation.angle })
  }
  const rotate = (change) => {
    orientation.d = (orientation.d + 4 + change) % 4
    orientation.angle += change * 90
    return notify({ position, angle: orientation.angle })
  }

  const step = 20
  const orientationVectors = {
    [Directions.Up]: { x: 0, y: -1 },
    [Directions.Right]: { x: 1, y: 0 },
    [Directions.Down]: { x: 0, y: 1 },
    [Directions.Left]: { x: -1, y: 0 },
  }
  const forward = () => {
    const change = orientationVectors[orientation.d]
    return move({ x: step * change.x, y: step * change.y })
  }
  const backward = () => {
    const change = orientationVectors[orientation.d]
    return move({ x: -step * change.x, y: -step * change.y })
  }
  const right = () => rotate(1)
  const left = () => rotate(-1)
  const pause = () => sleep(1000)
  const goHome = () => Promise.resolve()
    .then(() => move({ x: -position.x, y: -position.y }))
    .then(() => rotate(-orientation.angle / 90))

  return { forward, right, backward, left, pause, goHome, subscribe }
}
