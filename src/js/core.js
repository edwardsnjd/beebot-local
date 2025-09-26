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
