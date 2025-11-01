#! /usr/bin/env node

import { describe, it, assertEqual } from './_tests.js'
import { signal, effect, computed } from './signals.js'

describe('Signal', () => {
  it('returns initial value', () => {
    const s = signal(42)
    assertEqual(s.getValue(), 42)
  })

  it('accepts new value', () => {
    const s = signal(42)
    s.setValue(10)
    assertEqual(s.getValue(), 10)
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

  it('can be chained', () => {
    const s = signal(6)
    const c1 = computed(() => Math.pow(s.getValue(), 2))
    const c2 = computed(() => c1.getValue() + 6)

    assertEqual(c2.getValue(), 42)
  })

  it('entire chain responds to underlying change', () => {
    const s = signal(0)
    const c1 = computed(() => Math.pow(s.getValue(), 2))
    const c2 = computed(() => c1.getValue() + 6)

    s.setValue(6)

    assertEqual(c2.getValue(), 42)
  })
})

describe('Effect', () => {
  it('executes immediately', () => {
    let called = false

    effect(() => called = true)

    assertEqual(called, true)
  })

  describe('with state signals', () => {
    it('can read a signal', () => {
      const s1 = signal(42)

      let val = null
      effect(() => val = s1.getValue())

      assertEqual(val, 42)
    })

    it('multiple effects can all read a signal', () => {
      const s = signal(42)

      let val1 = null
      let val2 = null
      effect(() => val1 = s.getValue())
      effect(() => val2 = s.getValue())

      assertEqual(val1, 42)
      assertEqual(val2, 42)
    })

    it('executes again when underlying signal updates', () => {
      const s = signal(0)

      let val = null
      effect(() => val = s.getValue())

      s.setValue(42)

      assertEqual(val, 42)
    })

    it('executes multiple effects when underlying signal updates', () => {
      const s = signal(0)

      let val1 = null
      let val2 = null
      effect(() => val1 = s.getValue())
      effect(() => val2 = s.getValue())

      s.setValue(42)

      assertEqual(val1, 42)
      assertEqual(val2, 42)
    })

    it('executes each each change to a signal', () => {
      const s = signal(0)

      const vals = []
      effect(() => vals.push(s.getValue()))

      s.setValue(42)
      s.setValue(100)

      assertEqual(vals.length, 3)
      assertEqual(vals[0], 0)
      assertEqual(vals[1], 42)
      assertEqual(vals[2], 100)
    })

    it('runs effects in order added', () => {
      const s = signal(0)

      const calls = []
      effect(() => { s.getValue(); calls.push('first') })
      effect(() => { s.getValue(); calls.push('second') })

      s.setValue(42)

      assertEqual(calls.length, 4)
      assertEqual(calls[0], 'first')
      assertEqual(calls[1], 'second')
      assertEqual(calls[2], 'first')
      assertEqual(calls[3], 'second')
    })
  })

  describe('with computed signals', () => {
    it('can read a computed signal', () => {
      const s = signal(41)
      const c = computed(() => s.getValue() + 1)

      let val = null
      effect(() => val = c.getValue())

      assertEqual(val, 42)
    })

    it('multiple effects can all read a computed signal', () => {
      const s = signal(42)

      let val1 = null
      let val2 = null
      effect(() => val1 = s.getValue())
      effect(() => val2 = s.getValue())

      assertEqual(val1, 42)
      assertEqual(val2, 42)
    })

    it('executes again when underlying signal updates', () => {
      const s = signal(0)
      const c = computed(() => s.getValue() + 1)

      let val = null
      effect(() => val = c.getValue())

      s.setValue(41)

      assertEqual(val, 42)
    })

    it('can read a chained computed signal', () => {
      const s = signal(6)
      const c1 = computed(() => Math.pow(s.getValue(), 2))
      const c2 = computed(() => c1.getValue() + 6)

      let val = null
      effect(() => val = c2.getValue())

      assertEqual(val, 42)
    })

    it('executes again when underlying chained signal updates', () => {
      const s = signal(0)
      const c1 = computed(() => Math.pow(s.getValue(), 2))
      const c2 = computed(() => c1.getValue() + 6)

      let val = null
      effect(() => val = c2.getValue())

      s.setValue(6)

      assertEqual(val, 42)
    })

    it('runs after any tracked signal changes', () => {
      const s1 = signal(0)
      const s2 = signal(0)

      let val = null
      effect(() => val = s1.getValue() + s2.getValue())

      assertEqual(val, 0)

      s1.setValue(21)
      assertEqual(val, 21)

      s2.setValue(21)
      assertEqual(val, 42)
    })

    it('executes once after all computed dependencies have been marked as dirty', () => {
      const s = signal(0)
      const c1 = computed(() => s.getValue() === 0 ? 'zero' : 'non-zero')

      const values = []
      effect(() => values.push({ s: s.getValue(), c1: c1.getValue() }))

      assertEqual(values.length, 1)

      s.setValue(42)

      assertEqual(values.length, 2)
    })
  })
})
