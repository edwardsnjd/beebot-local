import { Commands, sleep } from './core.js'

export const remoteLinkUi = ($el) => (url) =>
  $el.href = url

export const remoteQrUi = ($el) => (url) =>
  $el.innerHTML = `<qr-code contents='${url}'></qr-code>`

export const controlsUi = ($el, sendEvent) => {
  const up = $el.querySelector('.up')
  const right = $el.querySelector('.right')
  const down = $el.querySelector('.down')
  const left = $el.querySelector('.left')
  const go = $el.querySelector('.go')
  const reset = $el.querySelector('.reset')
  const pause = $el.querySelector('.pause')
  const home = $el.querySelector('.home')

  up.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Up }))
  right.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Right }))
  down.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Down }))
  left.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Left }))
  pause.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Pause }))
  go.addEventListener('click', () => sendEvent({ type: 'go' }))
  reset.addEventListener('click', () => sendEvent({ type: 'reset' }))
  home.addEventListener('click', () => sendEvent({ type: 'home' }))

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

export const programUi = ($el) => {
  const actionItem = (cmd, idx) =>
    `<span data-cmd-idx="${idx}">${actionIcon(cmd)}</span>`
  const actionIcon = (cmd) => ({
    [Commands.Up]: '⬆️',
    [Commands.Right]: '➡️',
    [Commands.Down]: '⬇️',
    [Commands.Left]: '⬅️',
    [Commands.Pause]: '⏸️',
  })[cmd]

  return (program, interpreter) => {
    const text = program.map(actionItem).join(', ')
    $el.innerHTML = `Program: ${text}`

    if (interpreter.index !== null) {
      const activeItem = $el.querySelector(`[data-cmd-idx="${interpreter.index}"`)
      const itemRect = activeItem.getBoundingClientRect()
      const parentRect = activeItem.parentNode.getBoundingClientRect()
      const left = itemRect.left - parentRect.left
      const top = itemRect.top - parentRect.top
      const width = itemRect.width
      const height = itemRect.height
      const highlight = `<div class="highlight" style="position: absolute; left:${left};top:${top};width:${width};height:${height}">HERE</div>`
      $el.innerHTML += highlight
    }
  }
}

export const statusUi = ($el) => (state) => {
  if (state === 'running') $el.classList.add('running')
  else $el.classList.remove('running')
}

export const connectionsUi = ($el) => (remotes) =>
  $el.innerHTML = JSON.stringify(remotes)
