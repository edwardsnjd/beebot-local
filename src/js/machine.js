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

  const result = { current, start, send }

  const enter = (newState) => {
    state = newState

    const onEnter = config[state]?.enter
    if (onEnter) onEnter(result)
  }

  return result
}
