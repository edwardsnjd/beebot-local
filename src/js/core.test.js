#! /usr/bin/env node

import { describe, it, assert, assertThrows, assertThrowsAsync, assertEqual } from './_tests.js'
import { canMove, createBot, createProgram, createMachine, createInterpreter, Commands, Directions, eventHub } from './core.js'
import { signal, effect, computed } from './core.js'
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
      assertThrowsAsync(async () => await m.send({}))
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
      assertEqual(ran, true)
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

describe('Bot', () => {
  describe('creation', () => {
    it('does not need config', () => {
      const b = createBot()
      assert(b)
    })

    it('has home at origin before started', () => {
      const b = createBot()
      const { home } = b.current()
      assertEqual(home.x, 0)
      assertEqual(home.y, 0)
    })

    it('has position at origin before started', () => {
      const b = createBot()
      const { position } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, 0)
    })

    it('has 0 orientation before started', () => {
      const b = createBot()
      const { orientation } = b.current()
      assertEqual(orientation.direction, Directions.Up)
      assertEqual(orientation.angle, 0)
    })
  })

  describe('actions', () => {
    it('can move forwards', () => {
      const b = createBot()
      b.forward()
      b.forward()

      const { position } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, -2)
    })

    it('can move backwards', () => {
      const b = createBot()
      b.backward()
      b.backward()

      const { position } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, 2)
    })

    it('can turn right on the spot', () => {
      const b = createBot()
      b.right()

      const { position, orientation } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, 0)
      assertEqual(orientation.direction, Directions.Right)
      assertEqual(orientation.angle, 90)
    })

    it('can turn left on the spot', () => {
      const b = createBot()
      b.left()

      const { position, orientation } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, 0)
      assertEqual(orientation.direction, Directions.Left)
      assertEqual(orientation.angle, -90)
    })

    it('moves left if turned right then backwards', () => {
      const b = createBot()
      b.right()
      b.backward()

      const { position, orientation } = b.current()
      assertEqual(position.x, -1)
      assertEqual(position.y, 0)
      assertEqual(orientation.direction, Directions.Right)
      assertEqual(orientation.angle, 90)
    })

    it('waggles on the spot', () => {
      const b = createBot()
      b.waggle()

      const { position, orientation } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, 0)
      assertEqual(orientation.direction, Directions.Up)
      assertEqual(orientation.angle, 0)
    })
  })

  describe('home actions', () => {
    it('can return home', () => {
      const b = createBot()
      b.forward()
      b.forward()
      b.goHome()

      const { position } = b.current()
      assertEqual(position.x, 0)
      assertEqual(position.y, 0)
    })

    it('can return to a different home', () => {
      const b = createBot()
      b.forward()
      b.setHome({ x: 100, y: 42 })
      b.forward()
      b.goHome()

      const { position } = b.current()
      assertEqual(position.x, 100)
      assertEqual(position.y, 42)
    })
  })
})

describe('Event hub', () => {
  it('accepts subscribers', () => {
    const h = eventHub('foo')

    const cb1 = () => { }
    const cb2 = () => { }

    h.subscribe(cb1)
  })

  it('notifies subscribers async', async () => {
    const h = eventHub('foo')

    let called1 = false
    let called2 = false
    const cb1 = () => called1 = true
    const cb2 = () => called2 = true

    h.subscribe(cb1)
    h.subscribe(cb2)

    await h.notify(42)

    assertEqual(called1, true)
    assertEqual(called2, true)
  })
})

describe('Signal', () => {
  describe('value', () => {
    it('returns initial value', () => {
      const s = signal(42)
      assertEqual(s.getValue(), 42)
    })

    it('accepts new value', () => {
      const s = signal(42)
      s.setValue(10)
      assertEqual(s.getValue(), 10)
    })

    it('accepts update function', () => {
      const s = signal(42)
      s.updateValue((s) => s + 1)
      assertEqual(s.getValue(), 43)
    })
  })

  describe('subscribers', () => {
    it('notifies subscribers on change', () => {
      const s = signal(0)

      let val1 = null
      let val2 = null
      const cb1 = val => val1 = val
      const cb2 = val => val2 = val

      s.subscribe(cb1)
      s.subscribe(cb2)

      s.setValue(42)

      assertEqual(val1, 42)
      assertEqual(val2, 42)
    })

    it('notifies subscriber of each change', () => {
      const s = signal(0)

      const vals = []
      const cb = val => vals.push(val)

      s.subscribe(cb)

      s.setValue(42)
      s.setValue(100)

      assertEqual(vals.length, 2)
      assertEqual(vals[0], 42)
      assertEqual(vals[1], 100)
    })

    it('notifies subscribers in turn', () => {
      const s = signal(0)

      const calls = []
      const cb1 = () => calls.push('cb1')
      const cb2 = () => calls.push('cb2')

      s.subscribe(cb1)
      s.subscribe(cb2)

      s.setValue(42)

      assertEqual(calls.length, 2)
      assertEqual(calls[0], 'cb1')
      assertEqual(calls[1], 'cb2')
    })
  })
})

describe('Effect', () => {
  it('executes immediately', () => {
    const s1 = signal(42)

    let val = null
    effect(() => val = s1.getValue())

    assertEqual(val, 42)
  })

  it('executes again when underlying signal updates', () => {
    const s1 = signal(0)

    let val = null
    effect(() => val = s1.getValue())

    s1.setValue(42)

    assertEqual(val, 42)
  })
})

describe('Computed', () => {
  it('calculates a value based on no signal', () => {
    const c = computed(() => 42)

    assertEqual(c.getValue(), 42)
  })

  it('calculates a value based on another signal', () => {
    const s = signal(41)

    const c = computed(() => s.getValue() + 1)

    assertEqual(c.getValue(), 42)
  })

  it('calculates a value based on the current signal value', () => {
    const s = signal(0)
    const c = computed(() => s.getValue() + 1)

    s.setValue(41)

    assertEqual(c.getValue(), 42)
  })

  it('does not evaluate until asked', () => {
    let called = false

    computed(() => called = true)

    assertEqual(called, false)
  })

  it('caches until signal changed', () => {
    let called = 0

    const c = computed(() => called += 1)

    assertEqual(c.getValue(), 1)
    assertEqual(c.getValue(), 1)
  })
})
