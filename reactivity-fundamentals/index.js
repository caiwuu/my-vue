/**
 * targetMap--keyMap---Set(effect)
 * effect.deps([Set()])
 */

const effctStack = []
const bucket = new WeakMap()
let effectTrackDepth = 0
let activeEffect = null
let trackOpBit = 1
function initDepMarkers({ deps }) {
  deps.forEach((dep) => (dep.w |= trackOpBit))
}
function finalizeDepMarkers(effect) {
  const { deps } = effect
  if (deps.length) {
    let ptr = 0
    for (let dep of deps) {
      if (wasTrack(dep) && !newTrack(dep)) {
        // 之前收集到了这次没有
        dep.delete(effect)
      } else {
        deps[ptr++] = dep
      }
      // 重置，为了下一次执行做准备
      deps.w &= ~trackOpBit
      deps.n &= ~trackOpBit
    }
    deps.length = ptr
  }
}
function effect(fn) {
  const effectFn = () => {
    trackOpBit = 1 << ++effectTrackDepth
    // celanup(effectFn)
    initDepMarkers(effectFn)
    activeEffect = effectFn
    effctStack.push(effectFn)
    fn()
    effctStack.pop()
    trackOpBit = 1 << --effectTrackDepth
    activeEffect = effctStack[effctStack.length - 1]
    finalizeDepMarkers(effctStack)
  }
  effectFn.deps = []
  effectFn()
}

function celanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  const depsToRun = new Set()
  deps.forEach((effectFn) => {
    if (activeEffect !== effectFn) {
      depsToRun.add(effectFn)
    }
  })
  console.log(depsToRun)
  depsToRun && depsToRun.forEach((effectFn) => effectFn())
}

function track(target, key) {
  if (!activeEffect) return
  let depsMap = bucket.get(target)
  console.log(depsMap)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  console.log(deps)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  activeEffect.deps.push(deps)
}

function defineReactive(data) {
  return new Proxy(data, {
    get(target, key) {
      console.log(effectTrackDepth)
      track(target, key)
      return Reflect.get(target, key)
    },
    set(target, key, value) {
      Reflect.set(target, key, value)
      trigger(target, key)
    },
  })
}

const data = defineReactive({
  value1: 'value1',
  value2: 'value2',
})
effect(function fn1() {
  console.log('执行了fn1:')
  effect(function fn2() {
    console.log('执行了fn2:')
    const a = data.value2
  })
  const a = data.value1
})
