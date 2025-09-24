export const buildProgram = () => {
  let program = []
  const current = () => program
  const add = (cmd) => {
    program.push(cmd)
    notify(program)
  }
  const reset = () => {
    program = []
    notify(program)
  }

  let listeners = []
  const subscribe = (cb) => {
    listeners.push(cb)
    return () => listeners = listeners.filter(l => l !== cb)
  }
  const notify = (state) =>
    Promise.all(listeners.map(l => l(state)))

  return { current, add, reset, subscribe }
}

