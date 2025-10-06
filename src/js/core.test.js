#! /usr/bin/env node

import { describe, it, assert, assertThrows, assertEqual } from './_tests.js'
import { createBot, createProgram, createMachine, createInterpreter, Commands } from './core.js'

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
    it('explodes if sent nothing', () => {
      const m = createMachine({ initial: 'foo' })
      m.start()
      assertThrows(() => m.send())
    })

    it('explodes if sent null', () => {
      const m = createMachine({ initial: 'foo' })
      m.start()
      assertThrows(() => m.send(null))
    })

    it('explodes if sent {}', () => {
      const m = createMachine({ initial: 'foo' })
      m.start()
      assertThrows(() => m.send({ }))
    })

    it('accepts valid event', () => {
      const m = createMachine({ initial: 'foo' })
      m.start()
      m.send({ type: 'bar' })
    })
  })

  describe('state changes', () => {
    it('has initial state once started', () => {
      const m = createMachine({ initial: 'foo' })
      m.start()
      assert(m.current() === 'foo')
    })

    it('does not change state with unexpected event', () => {
      const m = createMachine({ initial: 'foo' })
      m.start()
      m.send({ type: 'bar' })
      assert(m.current() === 'foo')
    })

    it('changes state on valid event', () => {
      const m = createMachine({
        initial: 'foo',
        foo: {
          on: { bar: { target: 'baz' } }
        }
      })
      m.start()
      m.send({ type: 'bar' })
      assert(m.current() === 'baz')
    })
  })

  describe('state entry actions', () => {
    it('runs enter for initial state', () => {
      let ran = false
      const m = createMachine({
        initial: 'foo',
        foo: {
          enter: () => ran = true
        }
      })
      m.start()
      assert(ran)
    })

    it('runs enter for new state', () => {
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
      m.start()
      m.send({ type: 'bar' })
      assert(ran)
    })

    it('passes machine to enter function', () => {
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
      m.start()
      m.send({ type: 'bar' })
      assert(passed)
    })
  })

  describe('state change actions', () => {
    it('runs action for target event', () => {
      let ran = false
      const m = createMachine({
        initial: 'foo',
        foo: {
          on: { bar: { action: () => ran = true } }
        }
      })
      m.start()
      m.send({ type: 'bar' })
      assert(ran)
    })

    it('passes event as argument to action', () => {
      let passed = false
      const event = { type: 'bar' }
      const m = createMachine({
        initial: 'foo',
        foo: {
          on: { bar: { action: (e) => passed = (e === event) } }
        }
      })
      m.start()
      m.send(event)
      assert(passed)
    })
  })
})

describe('Interpreter', () => {
  describe('creation', () => {
    it('raises without bot', () => {
      assertThrows(() => createInterpreter())
    })

    it('accepts valid config', () => {
      const m = createInterpreter({})
      assert(m)
    })

    it('has null state before started', () => {
      const m = createInterpreter({})
      const { command, index } = m.current()
      assertEqual(command, null)
      assertEqual(index, null)
    })
  })

  describe('running a program', () => {
    it('raises without program', () => {
      const b = createBot()
      const m = createInterpreter(b)

      assertThrows(() => m.run())
    })

    it('accepts empty program', () => {
      const p = createProgram()
      const b = createBot()
      const m = createInterpreter(b)

      m.run(p)
    })

    it('executes program on bot', async () => {
      const p = createProgram()
      p.add(Commands.Up)
      p.add(Commands.Up)
      const b = createBot()
      const m = createInterpreter(b)

      await m.run(p)

      const { position } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, -2)
    })
  })
})
