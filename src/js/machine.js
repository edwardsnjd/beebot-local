/**
 * Create a state machine from the given state config.
 */
export const machine = (config) => {
  let state = null

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

  let listeners = []
  const subscribe = (cb) => {
    listeners.push(cb)
    return () => listeners = listeners.filter(l => l !== cb)
  }
  const notify = (state) =>
    Promise.all(listeners.map(l => l(state)))

  const result = { current, start, send, subscribe }

  const enter = (newState) => {
    state = newState

    const onEnter = config[state]?.enter
    if (onEnter) onEnter(result)

    notify(state)
  }

  return result
}
