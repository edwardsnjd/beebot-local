export const buildProgram = (b) => {
  let program = []
  const addToPrg = (cmd) => program.push(cmd)
  const resetPrg = () => program = []
  const runPrg = (m) =>
    program
      .map(botCommand)
      .reduce((acc, next) => acc.then(next), Promise.resolve())
      .then(() => m.send({ type: 'done' }))

  const botCommand = (cmd) =>
    ({
      'up': () => b.forward(),
      'right': () => b.right(),
      'down': () => b.backward(),
      'left': () => b.left(),
      'pause': () => b.pause(),
    })[cmd]

  return { addToPrg, resetPrg, runPrg }
}

