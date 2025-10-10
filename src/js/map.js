export const Wall = {
  HORIZ: 'horizontal',
  VERT: 'vertical',
}

export const parse = (lines) => {
  let rawHome = { x: 0, y: 0 }
  const rawCells = []
  const rawWalls = []
  let offset = { x: 0, y: 0 }

  lines.forEach((line, i) => {
    const y = i >> 1

    const chars = line.split('')
    const [evens, odds] = partition(chars, (_, idx) => idx % 2 === 0)

    if (i % 2 === 0) {
      evens.forEach((c, x) => {
        if (c === '0') offset = { x, y }
      })
      odds.forEach((c, x) => {
        if (c === '-') rawWalls.push(buildWall(Wall.HORIZ, { x, y }))
      })
    } else {
      evens.forEach((c, x) => {
        if (c === '|') rawWalls.push(buildWall(Wall.VERT, { x, y }))
      })
      odds.forEach((c, x) => {
        if (c !== ' ') rawCells.push(buildCell(c, { x, y }))
        if (c === 's') rawHome = { x, y }
      })
    }
  })

  return {
    cells: rawCells.map(adjustByOffset(offset)),
    walls: rawWalls.map(adjustByOffset(offset)),
    home: minus(rawHome, offset),
  }
}

const buildCell = (content, position) => ({ content, position })
const buildWall = (type, position) => ({ type, position })

const adjustByOffset = (offset) => ({ position, ...rest }) => ({
  position: minus(position, offset),
  ...rest,
})
const minus = ({ x: aX, y: aY }, { x: bX, y: bY }) => ({
  x: aX - bX,
  y: aY - bY,
})

/**
 * Partition items by a predicate.
 *
 * @type {Array[T]} items
 * @type {Predicate[T]} predicate
 *
 * @returns {Array[Array[T]]>} items that match, then those that don't
 */
const partition = (items, predicate) => {
  const ys = []
  const ns = []

  items.forEach((item, idx) => {
    const match = predicate(item, idx)
    const collection = match ? ys : ns
    collection.push(item)
  })

  return [ys, ns]
}

/**
 * The pre-canned levels.
 */
export const levels = [
  {
    code: 'map1',
    group: 'Training',
    map: [
      '+-+',
      '|h|',
      '0 +',
      '|.|',
      '+ +',
      '|s|',
      '+-+',
    ],
  },
  {
    code: 'map2',
    group: 'Training',
    map: [
      '+-+',
      '|s|',
      '0 +',
      '|.|',
      '+ +',
      '|h|',
      '+-+',
    ],
  },
  {
    code: 'map3',
    group: 'Training',
    map: [
      '0-+-+-+',
      '|s . h|',
      '+-+-+-+',
    ],
  },
  {
    code: 'map4',
    group: 'Training',
    map: [
      '+-+-0-+',
      '|h . s|',
      '+-+-+-+',
    ],
  },
  {
    code: 'map5',
    group: 'Training',
    map: [
      '+-+-+',
      '|. h|',
      '0 +-+',
      '|s|',
      '+-+',
    ],
  },
  {
    code: 'map6',
    group: 'Training',
    map: [
      '+-+-+',
      '|h .|',
      '+-0 +',
      '  |s|',
      '+ +-+',
    ],
  },
  {
    code: 'map7',
    group: 'Training',
    map: [
      '+-+',
      '|h|',
      '+ 0-+',
      '|. s|',
      '+-+-+',
    ],
  },
  {
    code: 'map8',
    group: 'Training',
    map: [
      '+ +-+',
      '  |h|',
      '0-+ +',
      '|s .|',
      '+-+-+',
    ],
  },
  {
    code: 'map9',
    group: 'Training',
    map: [
      '  +-+',
      '  |h|',
      '0-+ +',
      '|. .|',
      '+ +-+',
      '|s|',
      '+-+',
    ],
  },
  {
    code: 'map10',
    group: 'Training',
    map: [
      '+-+',
      '|h|',
      '+ 0-+',
      '|. .|',
      '+-+ +',
      '  |s|',
      '  +-+',
    ],
  },
  {
    code: 'map11',
    group: 'Beebot',
    map: [
      '+ + + +',
      ' h . . ',
      '+-+ 0 +',
      '  |. . ',
      '  + + +',
      '   . s ',
      '  + + +',
    ],
  },
  {
    code: 'map12',
    group: 'Beebot',
    map: [
      '+ + + +',
      ' h . . ',
      '+ +-+ +',
      ' .| |. ',
      '+ +-0 + +',
      ' . . . .     ',
      '+ + + + +',
      '     s ',
      '    + +',
    ],
  },
  {
    code: 'map13',
    group: 'Beebot',
    map: [
      '    + + + +',
      '     . h|. ',
      '    + + + +',
      '     . .|. ',
      '+ + 0 + + +',
      '   . . . . ',
      '+ + +-+-+-+',
      ' . . s ',
      '+ + +-+',
      '     . ',
      '    + +',
    ],
  },
  {
    code: 'map14',
    group: 'Beebot',
    map: [
      '+ + + + +',
      ' . . . . ',
      '+ + + + +',
      ' .|. .|. ',
      '+ + 0 + +',
      ' .|.|h|. ',
      '+ + + + +',
      ' s .|. . ',
      '+ + + + +',
    ],
  },
  {
    code: 'map15',
    group: 'Beebot',
    map: [
      '+ + + + +',
      ' . . . . ',
      '+-+ +-+ +',
      ' . h|. . ',
      '+ +-0 +-+',
      ' . . . s ',
      '+-+ +-+ +',
      ' . . . . ',
      '+ + + + +',
    ],
  },
].map(({ code, group ,map }) => ({ code, group, map: parse(map) }))
