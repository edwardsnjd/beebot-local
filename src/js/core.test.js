#! /usr/bin/env node

import { describe, it, assert, assertThrows, assertThrowsAsync, assertEqual } from './_tests.js'
import { canMove, createBot, createProgram, createMachine, createInterpreter, Commands } from './core.js'
import { parse } from './map.js'

describe('Machine', () => {
  describe('creation', () => {
    it('raises without initial state', () => {
      assertThrows(() => createMachine({}))
    })

    it('accepts valid config', () => {
      const m = createMachine({ initial: 'foo' })
      assert(m)
    })

    it('has null state before started', () => {
      const m = createMachine({ initial: 'foo' })
      assert(!m.current())
    })
  })

  describe('accepting events', () => {
    it('explodes if sent nothing', async () => {
      const m = createMachine({ initial: 'foo' })
      await m.start()
      assertThrowsAsync(async () => await m.send())
    })

    it('explodes if sent null', async () => {
      const m = createMachine({ initial: 'foo' })
      await m.start()
      assertThrowsAsync(async () => m.send(null))
    })

    it('explodes if sent {}', async () => {
      const m = createMachine({ initial: 'foo' })
      await m.start()
      assertThrowsAsync(async () => await m.send({ }))
    })

    it('accepts valid event', async () => {
      const m = createMachine({ initial: 'foo' })
      await m.start()
      await m.send({ type: 'bar' })
    })
  })

  describe('state changes', () => {
    it('has initial state once started', async () => {
      const m = createMachine({ initial: 'foo' })
      await m.start()
      assert(m.current() === 'foo')
    })

    it('does not change state with unexpected event', async () => {
      const m = createMachine({ initial: 'foo' })
      await m.start()
      await m.send({ type: 'bar' })
      assert(m.current() === 'foo')
    })

    it('changes state on valid event', async () => {
      const m = createMachine({
        initial: 'foo',
        foo: {
          on: { bar: { target: 'baz' } }
        }
      })
      await m.start()
      await m.send({ type: 'bar' })
      assert(m.current() === 'baz')
    })
  })

  describe('state entry actions', () => {
    it('runs enter for initial state', async () => {
      let ran = false
      const m = createMachine({
        initial: 'foo',
        foo: {
          enter: () => ran = true
        }
      })
      await m.start()
      assert(ran)
    })

    it('runs enter for new state', async () => {
      let ran = false
      const m = createMachine({
        initial: 'foo',
        foo: {
          on: { bar: { target: 'baz' } }
        },
        baz: {
          enter: () => ran = true
        }
      })
      await m.start()
      await m.send({ type: 'bar' })
      assert(ran)
    })

    it('passes machine to enter function', async () => {
      let passed = false
      const m = createMachine({
        initial: 'foo',
        foo: {
          on: { bar: { target: 'baz' } }
        },
        baz: {
          enter: (value) => passed = (value === m)
        }
      })
      await m.start()
      await m.send({ type: 'bar' })
      assert(passed)
    })
  })

  describe('state change actions', () => {
    it('runs action for target event', async () => {
      let ran = false
      const m = createMachine({
        initial: 'foo',
        foo: {
          on: { bar: { action: () => ran = true } }
        }
      })
      await m.start()
      m.send({ type: 'bar' })
      assert(ran)
    })

    it('passes event as argument to action', async () => {
      let passed = false
      const event = { type: 'bar' }
      const m = createMachine({
        initial: 'foo',
        foo: {
          on: { bar: { action: (e) => passed = (e === event) } }
        }
      })
      await m.start()
      await m.send(event)
      assert(passed)
    })
  })
})

describe('Interpreter', () => {
  describe('creation', () => {
    it('raises without bot', () => {
      assertThrows(() => createInterpreter())
    })

    it('raises without map', () => {
      assertThrows(() => createInterpreter({}))
    })

    it('accepts valid config', () => {
      const m = createInterpreter({}, () => true)
      assert(m)
    })

    it('has null state before started', () => {
      const m = createInterpreter({}, () => true)
      const { command, index } = m.current()
      assertEqual(command, null)
      assertEqual(index, null)
    })
  })

  describe('running a program', () => {
    it('raises without program', () => {
      const b = createBot()
      const canMove = () => true
      const m = createInterpreter(b, canMove)

      assertThrows(() => m.run())
    })

    it('accepts empty program', () => {
      const b = createBot()
      const canMove = () => true
      const m = createInterpreter(b, canMove)

      const p = createProgram()
      m.run(p)
    })

    it('executes program on bot', async () => {
      const b = createBot()
      const canMove = () => true
      const m = createInterpreter(b, canMove)

      const p = createProgram()
      p.add(Commands.Forwards)
      p.add(Commands.Forwards)
      await m.run(p)

      const { position } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, -2)
    })

    it('will not move bot through a wall', async () => {
      const b = createBot()
      const map = parse([
        '+-+',
        '   ',
        '0 +',
        '   ',
        '+ +',
      ])
      const isValid = canMove(() => map.walls)
      const m = createInterpreter(b, isValid)

      const p = createProgram()
      p.add(Commands.Forwards)
      p.add(Commands.Forwards)
      await m.run(p)

      const { position } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, -1)
    })

    it('will allow bot to go past a wall', async () => {
      const b = createBot()
      const map = parse([
        '+ 0-+',
        '     ',
        '+ + +',
      ])
      const isValid = canMove(() => map.walls)
      const m = createInterpreter(b, isValid)

      const p = createProgram()
      p.add(Commands.Left)
      p.add(Commands.Forwards)
      await m.run(p)

      const { position } = b.current()
      assertEqual(position.x, -1)
      assertEqual(position.y, 0)
    })

    it('will allow bot to go around a wall', async () => {
      const b = createBot()
      const map = parse([
        '+ + + +',
        '       ',
        '+ 0-+ +',
        '       ',
        '+ + + +',
      ])
      const isValid = canMove(() => map.walls)
      const m = createInterpreter(b, isValid)

      const p = createProgram()
      p.add(Commands.Left)
      p.add(Commands.Forwards)
      p.add(Commands.Right)
      p.add(Commands.Forwards)
      p.add(Commands.Right)
      p.add(Commands.Forwards)
      p.add(Commands.Forwards)
      p.add(Commands.Right)
      p.add(Commands.Forwards)
      p.add(Commands.Right)
      p.add(Commands.Forwards)
      p.add(Commands.Right)
      await m.run(p)

      const { position } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, 0)
    })
  })
})
