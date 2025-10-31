/** Global signal state */
class Dependencies {
  /** A map from watcher to what it's watching. */
  #watching = new Map()
  /** A map from signal to what's watching it. */
  #watchedBy = new Map()
  /** The stack of currently active watchers. */
  #activeWatchers = []

  /** Record any dependencies for the watcher. */
  trace(watcher, fn) {
    // Reset this watcher's dependencies
    this.#watching.set(watcher, new Set())

    // Run the function remembering this watcher for `watch`
    this.#activeWatchers.push(watcher)
    const result = fn()
    this.#activeWatchers.pop()
    return result
  }

  /** Register the given signal for the currently active watcher. */
  watch(signal) {
    if (this.#activeWatchers.length === 0) return

    const activeWatcher = this.#activeWatchers[this.#activeWatchers.length - 1]

    // Ensure signal cache is initialised
    if (!this.#watchedBy.has(signal)) {
      this.#watchedBy.set(signal, new Set())
    }

    // Add dependency to both caches
    this.#watchedBy.get(signal).add(activeWatcher)
    this.#watching.get(activeWatcher).add(signal)
  }

  /** Notify the given signal's dependents it is dirty. */
  dirty(signal) {
    // Capture current watchers
    const watchers = this.#watchedBy.get(signal) ?? new Set()

    // Unwire all related watchers
    this.#watchedBy.delete(signal)
    watchers.forEach(watcher => this.#watching.delete(watcher))

    // Dirty each watcher
    watchers.forEach(watcher => watcher.dirty())
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
    dependencies.watch(this)
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
      this.#state = dependencies.trace(this, this.#fn)
      this.#stale = false
    }

    dependencies.watch(this)
    return this.#state
  }

  dirty() {
    this.#stale = true
    dependencies.dirty(this)
  }
}

/** A side effect that automatically tracks its dependencies. */
class Effect {
  #fn

  constructor(fn) {
    this.#fn = fn
    this.#run()
  }

  dirty() {
    this.#run()
  }

  #run() {
    dependencies.trace(this, this.#fn)
  }
}

export const signal = (...args) => new Signal(...args)

export const computed = (...args) => new Computed(...args)

export const effect = (...args) => new Effect(...args)
