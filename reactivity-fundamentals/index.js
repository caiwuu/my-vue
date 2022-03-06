let activeEffct = null
const effctStack = []
const bucket = new WeakMap()

function effect (fn) {
  const effectFn = () => {
    celanup(effectFn)
    activeEffct = effectFn
    effctStack.push(effectFn)
    fn()
    effctStack.pop()
    activeEffct = effctStack[effctStack.length - 1]
  }
  effectFn.deps = []
  effectFn()

}

function celanup (effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}

function trigger (target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  const depsToRun = new Set()
  deps.forEach(effectFn => {
    if (activeEffct !== effectFn) {
      depsToRun.add(effectFn)
    }
  })
  console.log(depsToRun);
  depsToRun && depsToRun.forEach((effectFn) => effectFn())
}

function track (target, key) {
  if (!activeEffct) return
  let depsMap = bucket.get(target)
  console.log(depsMap);
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  console.log(deps);
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffct)
  activeEffct.deps.push(deps)
}

function defineReactive (data) {
  return new Proxy(data, {
    get (target, key) {
      track(target, key)
      return Reflect.get(target, key)
    },
    set (target, key, value) {
      Reflect.set(target, key, value)
      trigger(target, key)
    },
  })
}

const data = defineReactive({
  value1: 'value1',
  value2: 'value2'
})
effect(function fn1 () {
  console.log('执行了fn1:');
  effect(function fn2 () {
    console.log('执行了fn2:');
    const a = data.value2
  })
  const a = data.value1
})