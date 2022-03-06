let activeEffct = null

const bucket = new WeakMap()
function effect(fn) {
  activeEffct = fn
  fn()
}
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  deps && deps.forEach((fn) => fn())
}
function track(target, key) {
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
}
function ref(data) {
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
const data = ref({
  name: 'li ning',
  age: 22,
})
effect(() => {
  console.log(`my name is ${data.name}`)
})
effect(() => {
  console.log(`my age is ${data.age}`)
})

data.name = 'caiwu'
data.age = 11
