/** The interface used by the automatic dependency tracking. */
const Interface = {
  /** The property implemented on watchers that should be notified. */
  MARK_DIRTY: Symbol('MarkDirty'),
  shouldDirty: (o) => Interface.MARK_DIRTY in o,
  dirty: (o) => o[Interface.MARK_DIRTY](),

  /** The property implemented on watchers that should be run. */
  RUN_EFFECT: Symbol('RunEffect'),
  shouldRun: (o) => Interface.RUN_EFFECT in o,
  run: (o) => o[Interface.RUN_EFFECT](),
}

/** Automatic signal dependency tracking. */
class Dependencies {
  /** A map from watcher to what it's watching. */
  #watching = new Map()
  /** A map from signal to what's watching it. */
  #watchedBy = new Map()
  /** The stack of currently active watchers. */
  #activeWatchers = []

  /** Record any dependencies for the watcher. */
  runWithTracking(watcher, fn) {
    // Reset this watcher's dependencies
    this.#watching.set(watcher, new Set())

    // Run the function remembering this watcher as the current watcher
    this.#activeWatchers.push(watcher)
    const result = fn()
    this.#activeWatchers.pop()
    return result
  }

  #currentWatcher() {
    return this.#activeWatchers[this.#activeWatchers.length - 1]
  }

  /** Register the given signal for the currently active watcher. */
  add(signal) {
    const activeWatcher = this.#currentWatcher()
    if (!activeWatcher) return

    // Ensure signal cache is initialised
    if (!this.#watchedBy.has(signal)) {
      this.#watchedBy.set(signal, new Set())
    }

    // Add dependency to both lookups
    this.#watchedBy.get(signal).add(activeWatcher)
    this.#watching.get(activeWatcher).add(signal)
  }

  /** Notify the given signal's dependents it is dirty. */
  dirty(signal) {
    const toRun = this.#dirtyAndGather(signal)

    // Graph might have reached a given effect via multiple paths
    // so there could be duplicates
    new Set(toRun).forEach(Interface.run)
  }

  /** Dirty the given signal and gather effects to run. */
  #dirtyAndGather(signal) {
    // Capture any current watchers
    const watchers = Array.from(this.#watchedBy.get(signal) ?? new Set())
    const toDirty = watchers.filter(Interface.shouldDirty)
    const toRun = watchers.filter(Interface.shouldRun)

    // Unwire current watchers (will need to be updated)
    this.#watchedBy.delete(signal)
    watchers.forEach(watcher => this.#watching.delete(watcher))

    // Dirty each watcher
    toDirty.forEach(Interface.dirty)

    // Collect any effects to run
    return [ ...toRun, ...toDirty.flatMap(s => this.#dirtyAndGather(s)) ]
  }
}

// Global singleton watcher state
const dependencies = new Dependencies()

/**
 * An atom of state that automatically tracks its dependencies
 * and its dependants.
 */
class Signal {
  #state

  constructor(init) {
    this.#state = init
  }

  getValue() {
    dependencies.add(this)
    return this.#state
  }

  setValue(newState) {
    this.#state = newState
    dependencies.dirty(this)
  }
}

/**
 * A derived piece of state that automatically tracks its
 * dependencies and its dependants.
 */
class Computed {
  #fn
  #state
  #stale = true

  constructor(fn) {
    this.#fn = fn
  }

  getValue() {
    if (this.#stale) {
      this.#state = dependencies.runWithTracking(this, this.#fn)
      this.#stale = false
    }

    dependencies.add(this)
    return this.#state
  }

  [Interface.MARK_DIRTY]() {
    this.#stale = true
  }
}

/** A side effect that automatically tracks its dependencies. */
class Effect {
  #fn

  constructor(fn) {
    this.#fn = fn
    this[Interface.RUN_EFFECT]()
  }

  [Interface.RUN_EFFECT]() {
    dependencies.runWithTracking(this, this.#fn)
  }
}

export const signal = (...args) => new Signal(...args)

export const computed = (...args) => new Computed(...args)

export const effect = (...args) => new Effect(...args)
