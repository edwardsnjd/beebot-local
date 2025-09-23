#! /usr/bin/env node

import { machine } from './machine.js'

// TEST HARNESS

/** Throw if the given value is not truthy. */
const assert = (val, msg) => {
  if (!val) throw (msg ?? `${val} is not truthy`)
}

/** Throw unless the given function throws. */
const assertThrows = (fn, msg) => {
  try {
    fn()
    throw (msg ?? `${fn} did not throw`)
  } catch {
  }
}

let labels = []
const describe = (label, fn) => {
  labels.push(label)
  fn()
  labels.pop()
}

const it = (label, fn) =>
  describe(label, () => {
    try {
      fn()
      console.log('[test]', labels.join(' › '), '✅')
    } catch (e) {
      console.log('[test]', labels.join(' › '), "❌")
      console.log(' ', e.message)
    }
  })

// MACHINE TESTS

describe('Machine', () => {
  describe('creation', () => {
    it('raises without initial state', () => {
      assertThrows(() => machine({}))
    })

    it('accepts valid config', () => {
      const m = machine({ initial: 'foo' })
      assert(m)
    })

    it('has null state before started', () => {
      const m = machine({ initial: 'foo' })
      assert(!m.current())
    })
  })

  describe('accepting events', () => {
    it('explodes if sent nothing', () => {
      const m = machine({ initial: 'foo' })
      m.start()
      assertThrows(() => m.send())
    })

    it('explodes if sent null', () => {
      const m = machine({ initial: 'foo' })
      m.start()
      assertThrows(() => m.send(null))
    })

    it('explodes if sent {}', () => {
      const m = machine({ initial: 'foo' })
      m.start()
      assertThrows(() => m.send({ }))
    })

    it('accepts valid event', () => {
      const m = machine({ initial: 'foo' })
      m.start()
      m.send({ type: 'bar' })
    })
  })

  describe('state changes', () => {
    it('has initial state once started', () => {
      const m = machine({ initial: 'foo' })
      m.start()
      assert(m.current() === 'foo')
    })

    it('does not change state with unexpected event', () => {
      const m = machine({ initial: 'foo' })
      m.start()
      m.send({ type: 'bar' })
      assert(m.current() === 'foo')
    })

    it('changes state on valid event', () => {
      const m = machine({
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
      const m = machine({
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
      const m = machine({
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
      const m = machine({
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
      const m = machine({
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
      const m = machine({
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
