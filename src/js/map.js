export const Wall = {
  HORIZ: 'horizontal',
  VERT: 'vertical',
}

export const parse = (lines) => {
  const rawCells = []
  const rawWalls = []
  let offset = [0, 0]

  lines.forEach((line, i) => {
    const y = i >> 1

    const chars = line.split('')
    const [evens, odds] = partition(chars, (_, idx) => idx % 2 === 0)

    if (i % 2 === 0) {
      evens.forEach((c, x) => {
        if (c === '0') offset = [x, y]
      })
      odds.forEach((c, x) => {
        if (c === '-') rawWalls.push(buildWall(Wall.HORIZ, [x, y]))
      })
    } else {
      evens.forEach((c, x) => {
        if (c === '|') rawWalls.push(buildWall(Wall.VERT, [x, y]))
      })
      odds.forEach((c, x) => {
        if (c !== ' ') rawCells.push(buildCell(c, [x, y]))
      })
    }
  })

  return {
    cells: rawCells.map(adjustByOffset(offset)),
    walls: rawWalls.map(adjustByOffset(offset)),
  }
}

const buildCell = (content, position) => ({ content, position })
const buildWall = (type, position) => ({ type, position })

const adjustByOffset = (offset) => ({ position, ...rest }) => ({
  position: minus(position, offset),
  ...rest,
})
const minus = ([aX, aY], [bX, bY]) => [aX - bX, aY - bY]

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
