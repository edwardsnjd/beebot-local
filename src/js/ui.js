import { Commands, sleep } from './core.js'

export const remoteLinkUi = ($el) => (url) =>
  $el.href = url

export const remoteQrUi = ($el) => (url) =>
  $el.innerHTML = `<qr-code contents='${url}'></qr-code>`

export const controlsUi = ($el, m) => {
  const up = $el.querySelector('.up')
  const right = $el.querySelector('.right')
  const down = $el.querySelector('.down')
  const left = $el.querySelector('.left')
  const go = $el.querySelector('.go')
  const reset = $el.querySelector('.reset')
  const pause = $el.querySelector('.pause')

  up.addEventListener('click', () => m.send({ type: 'add', cmd: Commands.Up }))
  right.addEventListener('click', () => m.send({ type: 'add', cmd: Commands.Right }))
  down.addEventListener('click', () => m.send({ type: 'add', cmd: Commands.Down }))
  left.addEventListener('click', () => m.send({ type: 'add', cmd: Commands.Left }))
  pause.addEventListener('click', () => m.send({ type: 'add', cmd: Commands.Pause }))
  go.addEventListener('click', () => m.send({ type: 'go' }))
  reset.addEventListener('click', () => m.send({ type: 'reset' }))

  return (state) => {
    if (state === 'running') $el.classList.add('disabled')
    else $el.classList.remove('disabled')
  }
}

export const botUi = ($el) => ({ position, angle }) => {
  const animationDuration = 1000
  $el.style.transitionDuration = `${animationDuration}ms`
  $el.style.transform = `
    translate(${position.x}px, ${position.y}px)
    rotate(${angle}deg)
  `
  // HACK: Add 20ms to animation to ensure it's finished
  return sleep(animationDuration + 20)
}

export const programUi = ($el) => (program) => {
  const text = program.length > 0
    ? program.map(actionIcon).join(', ')
    : ''
  $el.innerText = `Program: ${text}`
}
const actionIcon = (cmd) => ({
  [Commands.Up]: '⬆️',
  [Commands.Right]: '➡️',
  [Commands.Down]: '⬇️',
  [Commands.Left]: '⬅️',
  [Commands.Pause]: '⏸️',
})[cmd]

export const statusUi = ($el) => (state) => {
  if (state === 'running') $el.classList.add('running')
  else $el.classList.remove('running')
}
