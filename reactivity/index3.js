const effectStack = []
const bucket = new WeakMap()

function run(effect, fn, args) {
  if (!effect.active) {
    return fn(...args)
  }
  if (!effectStack.includes(effect)) {
    cleanup(effect)
    try {
      effectStack.push(effect)
      return fn(...args)
    } finally {
      effectStack.pop()
    }
  }
}

function createReactiveEffect(fn) {
  const effect = function reactiveEffect(...args) {
    return run(effect, fn, args)
  }
  // 初始化时，初始化effect的各项属性
  effect._isEffect = true
  effect.active = true
  effect.raw = fn
  effect.deps = []
  return effect
}
function effect(fn) {
  if (isEffect(fn)) {
    fn = fn.raw
  }
  const effect = createReactiveEffect(fn)
  effect()
  return effect
}
function isEffect(fn) {
  return fn != null && fn._isEffect === true
}
function cleanup(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

function trigger(target, key) {
  const activeEffct = effectStack[effectStack.length - 1]
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  const depsToRun = new Set()
  deps.forEach((effectFn) => {
    if (activeEffct !== effectFn) {
      depsToRun.add(effectFn)
    }
  })
  console.log(depsToRun.size)
  depsToRun && depsToRun.forEach((effectFn) => effectFn())
}

function track(target, key) {
  const activeEffct = effectStack[effectStack.length - 1]
  if (!activeEffct) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffct)
  activeEffct.deps.push(deps)
}

function defineReactive(data) {
  return new Proxy(data, {
    get(target, key) {
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

// effect(function fn1() {
//   const msg = data.value1 === 'value1' ? data.value2 : 'jjjj'
//   console.log(msg)
// })
// effect(function fn1() {
//   const msg = data.value2
//   console.log(msg, '====')
// })
