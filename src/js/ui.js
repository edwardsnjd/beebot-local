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

export const boardUi = ($el) => {
  let current = $el.getAttribute('viewBox')
  const [_x, _y, origW, origH] = current.split(' ')

  const $animation = $el.querySelector('animate')

  const viewBoxFor = (position) => {
    const viewBoxPadding = 30
    const width = Math.max(origW, Math.abs(position.x) * 2 + viewBoxPadding)
    const height = Math.max(origH, Math.abs(position.y) * 2 + viewBoxPadding)
    return `${-width/2} ${-height/2} ${width} ${height}`
  }

  return ({ position }) => {
    const viewBox = viewBoxFor(position)
    if (viewBox !== current) {
      $animation.setAttribute('to', viewBox)
      $animation.beginElement()
      current = viewBox
    }
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
  const $listing = $el.querySelector('.listing')
  const $highlight = $el.querySelector('.highlight')

  const actionItem = (cmd, idx) =>
    `<span data-cmd-idx="${idx}">${actionIcon(cmd)}</span>`

  const actionIcon = (cmd) => ({
    [Commands.Up]: '⬆️',
    [Commands.Right]: '➡️',
    [Commands.Down]: '⬇️',
    [Commands.Left]: '⬅️',
    [Commands.Pause]: '⏸️',
  })[cmd]

  return (program, { index }) => {
    const text = program.map(actionItem).join('+ ')
    $listing.innerHTML = `Program: ${text}`

    const showHighlight = index !== null

    $highlight.classList[showHighlight ? 'add' : 'remove']('active')

    if (showHighlight) {
      const activeItem = $el.querySelector(`[data-cmd-idx="${index}"`)
      const { left, top, width, height } = activeItem.getBoundingClientRect()
      const { left: parentLeft, top: parentTop } = $el.getBoundingClientRect()
      const padding = 2;
      $highlight.style.width = `${width + 2*padding}px`
      $highlight.style.height = `${height + 2*padding}px`
      $highlight.style.transitionDuration = `${200}ms`
      $highlight.style.transform = `translate(
        ${left - parentLeft - 2 - padding}px,
        ${top - parentTop - 1 - padding}px
      )`
    }
  }
}

export const connectionsUi = ($el) => (remotes) =>
  $el.innerHTML = JSON.stringify(remotes)
