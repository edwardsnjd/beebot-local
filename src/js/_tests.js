// TEST HARNESS

/** Throw if the given value is not truthy. */
export const assert = (val, msg) => {
  if (!val) throw new Error(msg || `${val} is not truthy`)
}

/** Throw if the given value is not truthy. */
export const assertEqual = (val, expected, msg) => {
  if (val !== expected) throw new Error(msg || `${val} did not equal expected value ${expected}`)
}

/** Throw unless the given function throws. */
export const assertThrows = (fn, msg) => {
  let threw = false
  try {
    fn()
  } catch {
    threw = true
  }
  if (!threw) throw Error(msg || `${fn} did not throw`)
}

/** Throw unless the given async function throws. */
export const assertThrowsAsync = async (fn, msg) => {
  let threw = false
  try {
    await fn()
  } catch {
    threw = true
  }
  if (!threw) throw Error(msg || `${fn} did not throw`)
}

let tests = []

let labels = []
export const describe = (label, fn) => {
  labels.push(label)
  fn()
  labels.pop()
}

export const it = (label, fn) =>
  describe(label, () => {
    // Capture test in current context
    const nestedLabel = labels.join(' › ')
    const test = async () => {
      try {
        await fn()
        console.log('[test]', nestedLabel, '✅')
        return true
      } catch (e) {
        console.log('[test]', nestedLabel, "❌")
        console.log(e)
        return false
      }
    }
    // Add to list of tests to run later
    tests.push(test)
    // Automatically schedule run of all tests
    scheduleSuite()
  })

let schedule = null
const scheduleSuite = () => {
  if (schedule) return
  schedule = setTimeout(runSuite, 1)
}

export const runSuite = async () => {
  const promiseResults = tests.map(t => t())
  const results = await Promise.all(promiseResults)
  const allPassed = results.every(r => r)
  process.exit(allPassed ? 0 : 1)
}
