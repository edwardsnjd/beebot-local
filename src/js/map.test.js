#! /usr/bin/env node

import { assert, assertEqual, describe, it } from './_tests.js'
import { parse, Wall } from './map.js'

// MACHINE TESTS

describe('Map', () => {

  describe('parsing', () => {
    it('accepts empty', () => {
      assert(parse([]))
    })

    it('accepts blank', () => {
      assert(parse(['']))
    })

    it('accepts partial row', () => {
      assert(parse([
        '+ +',
      ]))
    })

    it('accepts partial cell', () => {
      assert(parse([
        '+ +',
        '   ',
        '+ ',
      ]))
    })

    it('accepts whole cell', () => {
      assert(parse([
        '+ +',
        '   ',
        '+ +',
      ]))
    })

    it('accepts 2x1', () => {
      assert(parse([
        '+ + +',
        '     ',
        '+ + +',
      ]))
    })

    it('accepts 1x2', () => {
      assert(parse([
        '+ +',
        '   ',
        '+ +',
        '   ',
        '+ +',
      ]))
    })

    it('accepts 3x2', () => {
      assert(parse([
        '+ + + +',
        '       ',
        '+ + + +',
        '       ',
        '+ + + +',
      ]))
    })

    it('accepts cell contents', () => {
      assert(parse([
        '+ + + +',
        ' U   e ',
        '+ + + +',
      ]))
    })

    it('accepts walls', () => {
      assert(parse([
        '+-+ + +',
        '  |   |',
        '+ +-+ +',
      ]))
    })

    it('accepts origin', () => {
      assert(parse([
        '+ + + +',
        '       ',
        '+ + o +',
      ]))
    })
  })

  describe('cells', () => {
    it('returns empty list for blank map', () => {
      const cells = parse([]).cells
      assertEqual(cells.length, 0)
    })

    it('accepts cell contents', () => {
      const cells = parse([
        '+ + + +',
        ' U   e ',
        '+ + + +',
        '     a ',
        '+ + + +',
      ]).cells

      assertEqual(cells.length, 3)
      const uCell = cells.find(cell => cell.content === 'U')
      assert(uCell.position, [0,0])
      const eCell = cells.find(cell => cell.content === 'e')
      assert(eCell.position, [2,0])
      const aCell = cells.find(cell => cell.content === 'a')
      assert(aCell.position, [3,1])
    })

    it('accepts horiz walls', () => {
      const walls = parse([
        '+ +-+ +',
        '       ',
        '+-+ +-+',
      ]).walls

      assertEqual(walls.length, 3)
      assert(walls.every(({ type }) => type === Wall.HORIZ))
      assert(walls.find(({ position: { x,y } }) => x === 1 && y === 0))
      assert(walls.find(({ position: { x,y } }) => x === 0 && y === 1))
      assert(walls.find(({ position: { x,y } }) => x === 2 && y === 1))
    })

    it('accepts vert walls', () => {
      const walls = parse([
        '+ + + +',
        '|   | |',
        '+ + + +',
      ]).walls

      assertEqual(walls.length, 3)
      assert(walls.every(({ type }) => type === Wall.VERT))
      assert(walls.find(({ position: { x,y } }) => x === 0 && y === 0))
      assert(walls.find(({ position: { x,y } }) => x === 2 && y === 0))
      assert(walls.find(({ position: { x,y } }) => x === 3 && y === 0))
    })

    it('respects origin marker', () => {
      const walls = parse([
        '+ +-+ +',
        '       ',
        '+-+ 0-+',
      ]).walls

      assertEqual(walls.length, 3)
      assert(walls.find(({ position: { x,y } }) => x === -1 && y === -1))
      assert(walls.find(({ position: { x,y } }) => x === -2 && y === 0))
      assert(walls.find(({ position: { x,y } }) => x === 0 && y === 0))
    })
  })
})
