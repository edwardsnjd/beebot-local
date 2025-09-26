export const Directions = { Up: 0, Right: 1, Down: 2, Left: 3 }

export const createBot = () => {
  let position = { x: 0, y: 0 }
  let orientation = { d: Directions.Up, angle: 0 }

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

  let listeners = []
  const subscribe = (cb) => {
    listeners.push(cb)
    return () => listeners = listeners.filter(l => l !== cb)
  }
  const notify = (state) =>
    Promise.all(listeners.map(l => l(state)))

  return { forward, right, backward, left, pause, subscribe }
}
