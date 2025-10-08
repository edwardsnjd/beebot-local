import { Commands, sleep } from './core.js'

export const remoteLinkUi = ($el) => (url) => {
  $el.href = url
  $el.innerHTML = `<qr-code contents='${url}'></qr-code>`
}

export const levelsUi = ($el, levels, cb) => {
  levels.map(({ code }, i) => {
    const $o = document.createElement('option')
    $o.innerText = `Level ${i+1}`
    $o.value = code
    return $o
  }).forEach(($o) => $el.appendChild($o))

  $el.addEventListener('change', (e) => cb(e.target.value))

  return ({ code }) => $el.value = code
}

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

/**
 * @return (DOM -> Level -> Event)
 */
export const boardUi = ($el) => {
  const $animation = $el.querySelector('animate')

  let current = $el.getAttribute('viewBox')
  const [_x, _y, origW, origH] = current.split(' ')

  const step = 20
  const wallSize = 2

  const viewBoxFor = (position) => {
    const viewBoxPadding = 30
    const width = Math.max(origW, Math.abs(position.x * step) * 2 + viewBoxPadding)
    const height = Math.max(origH, Math.abs(position.y * step) * 2 + viewBoxPadding)
    return `${-width / 2} ${-height / 2} ${width} ${height}`
  }

  const toCoord = ({ x, y }) => ({
    x: x * step,
    y: y * step,
  })

  const createSprite = (id, size) => {
    const $cell = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    $cell.setAttribute('href', `#${id}`)
    $cell.setAttribute('width', size)
    $cell.setAttribute('height', size)
    $cell.classList.add('cell')

    return $cell
  }

  const setSpritePosition = ($cell, position, angle = 0) => {
    const coord = toCoord(position)
    $cell.style.transform = `
      translate(${coord.x}px, ${coord.y}px)
      rotate(${angle}deg)
    `
  }
  const setWallPosition = ($wall, position, angle = 0) => {
    const coord = toCoord(position)
    $wall.style.transform = `
      translate(${coord.x - 2}px, ${coord.y - 2}px)
      rotate(${angle}deg)
    `
  }

  const spriteTemplateIds = {
    'h': 'hive-template',
    's': 'start-template',
    'horizontal': 'horizWall-template',
    'vertical': 'vertWall-template',
  }

  let $mapElements = []

  const resetMap = () => {
    $mapElements.forEach($e => $e.remove())
    $mapElements = []
  }

  return ({ cells, walls }) => {
    resetMap()

    const $cells = cells.map(({ content, position }) => {
      const id = spriteTemplateIds[content]
      if (!id) return null

      const $cell = createSprite(id, step)
      $el.appendChild($cell)
      setSpritePosition($cell, position, 0)
      return $cell
    }).filter(Boolean)

    const $walls = walls.map(({ type, position }) => {
      const id = spriteTemplateIds[type]
      if (!id) return null

      const $wall = createSprite(id, step + 2 * wallSize)
      $el.appendChild($wall)
      setWallPosition($wall, position)
      return $wall
    }).filter(Boolean)

    const $bot = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    $bot.classList.add('cell')
    const $botWiggle = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const $botSprite = createSprite('bee-template', step)
    $botWiggle.appendChild($botSprite)
    $bot.appendChild($botWiggle)
    $el.appendChild($bot)

    // Record all added elements for this map
    $mapElements = [...$cells, ...$walls, $bot, $botWiggle, $botSprite]

    const move = async (position, angle) => {
      const viewBox = viewBoxFor(position)
      if (viewBox !== current) {
        $animation.setAttribute('from', current)
        $animation.setAttribute('to', viewBox)
        $animation.beginElement()
        current = viewBox
      }

      const animationDuration = 1500
      $bot.style.transitionDuration = `${animationDuration}ms`
      setSpritePosition($bot, position, angle)

      // HACK: Add a few ms to animation to ensure it's finished
      await sleep(animationDuration + 250)
    }

    const waggle = async () => {
      $botWiggle.classList.add('wiggle')
      await sleep(700)
      $botWiggle.classList.remove('wiggle')
      await sleep(300)
    }

    return (event) => {
      switch (event.type) {
        case 'current':
        case 'moved':
          return move(event.position, event.orientation.angle)
        case 'waggled':
          return waggle()
        default:
          console.error('Unknown type of bot event', event)
      }
    }
  }
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
      $highlight.style.width = `${width + 2 * padding}px`
      $highlight.style.height = `${height + 2 * padding}px`
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
