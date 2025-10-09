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

  up.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Forwards }))
  right.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Right }))
  down.addEventListener('click', () => sendEvent({ type: 'add', cmd: Commands.Backwards }))
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

  const createSprite = (id) => {
    const $sprite = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    $sprite.setAttribute('href', `#${id}`)
    return $sprite
  }

  const createCell = (id, size) => {
    const $cell = createSprite(id)
    $cell.setAttribute('width', size)
    $cell.setAttribute('height', size)
    $cell.classList.add('cell')
    return $cell
  }

  const setSpritePosition = ($sprite, position, angle = 0) => {
    const coord = toCoord(position)
    $sprite.style.transform = `
      translate(${coord.x}px, ${coord.y}px)
      rotate(${angle}deg)
    `
  }
  const setWallPosition = ($sprite, position, angle = 0) => {
    const coord = toCoord(position)
    $sprite.style.transform = `
      translate(${coord.x - 2}px, ${coord.y - 2}px)
      rotate(${angle}deg)
    `
  }

  const spritesInfo = {
    'h': { id: 'hive-template', role: 'target' },
    's': { id: 'start-template', role: 'start' },
    'horizontal': { id: 'horizWall-template' },
    'vertical': { id: 'vertWall-template' },
    'tick': { id: 'tick' },
  }

  let $mapElements = []

  const resetMap = () => {
    $mapElements.forEach($e => $e.remove())
    $mapElements = []
  }

  return ({ cells, walls }) => {
    resetMap()

    const $tick = createCell('tick', step)
    $tick.setAttribute('width', 100)
    $tick.setAttribute('height', 100)
    $tick.setAttribute('x', -40)
    $tick.setAttribute('y', -40)
    $tick.setAttribute('style', 'display: none; opacity: 0.35')
    $el.appendChild($tick)

    const cellsInfo = cells.map(cell => {
      const { content, position } = cell

      const spriteInfo = spritesInfo[content]
      if (!spriteInfo) return null

      const $sprite = createCell(spriteInfo.id, step)
      $el.appendChild($sprite)
      setSpritePosition($sprite, position, 0)

      return { sprite: $sprite, position, role: spriteInfo.role }
    }).filter(Boolean)

    const $walls = walls.map((wall) => {
      const { type, position } = wall

      const spriteInfo = spritesInfo[type]
      if (!spriteInfo) return null

      const $sprite = createCell(spriteInfo.id, step + 2 * wallSize)
      $el.appendChild($sprite)
      setWallPosition($sprite, position)

      return $sprite
    }).filter(Boolean)

    const $bot = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    $bot.classList.add('cell')
    const $botWiggle = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const $botSprite = createCell('bee-template', step)
    $botWiggle.appendChild($botSprite)
    $bot.appendChild($botWiggle)
    $el.appendChild($bot)

    // Record all added elements for this map
    $mapElements = [
      ...cellsInfo.map(({ sprite }) => sprite),
      ...$walls,
      $botSprite,
      $botWiggle,
      $bot,
      $tick,
    ]

    const targets = cellsInfo.filter(({ role }) => role === 'target')

    const move = async (position, angle) => {
      const viewBox = viewBoxFor(position)
      if (viewBox !== current) {
        $animation.setAttribute('from', current)
        $animation.setAttribute('to', viewBox)
        $animation.beginElement()
        current = viewBox
      }

      // Deselect all targets
      targets.forEach(({ sprite }) => sprite.classList.remove('active'))
      $tick.style.display = 'none'

      const animationDuration = 1500
      $bot.style.transitionDuration = `${animationDuration}ms`
      setSpritePosition($bot, position, angle)

      // HACK: Add a few ms to animation to ensure it's finished
      await sleep(animationDuration + 250)

      // Highlight active targets
      targets.forEach(({ sprite, position: p }) => {
        const isOver = p.x == position.x && p.y === position.y
        if (isOver) {
          sprite.classList.add('active')
          $tick.style.display = 'block'
        }
      })
    }

    const waggle = async () => {
      $botWiggle.classList.add('wiggle')
      await sleep(500)
      $botWiggle.classList.remove('wiggle')
      await sleep(200)
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
    [Commands.Forwards]: '⬆️',
    [Commands.Right]: '➡️',
    [Commands.Backwards]: '⬇️',
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
