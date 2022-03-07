// 原始数据和proxy数据的映射
const proxyMap = new WeakMap()
// 依赖统一管理 { target => key => dep }
const targetMap = new WeakMap()
// effect执行栈
const effectStack = []
// 栈顶
let activeEffect = null
// effect层级
let effectTrackDepth = 0
// 位标记
let trackOpBit = 1

function reactive (target) {
  // 如果已经reactive过，直接拿缓存
  if (proxyMap.has(target)) return proxyMap.get(target)
  // 简单类型无法proxy，直接返回值即可
  if (typeof target !== 'object') return target

  const proxy = new Proxy(target, {
    get,
    set,
  })
  return proxy
}

function get (target, key, reciver) {
  const res = Reflect.get(target, key, reciver)
  // 收集
  track(target, key)
  if (typeof res === 'object') {
    // 递归proxy
    res = reactive(res)
  }
  return res
}

function set (target, key, value, reciver) {
  const oldValue = target[key]
  const res = Reflect.set(target, key, value, reciver)
  // 触发
  trigger(target, key, value, oldValue)
  return res
}

// 收集
function track (target, key) {
  // deps的统一管理
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }
  // 收集依赖
  let shouldTrack = false
  if (!newTrack(dep)) {
    // 打上新标记
    dep.n |= trackOpBit
    shouldTrack = !wasTrack(dep) // 原本没有
  }
  if (shouldTrack) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

// 触发
function trigger (target, key, value, oldValue) {
  if (value === oldValue) return
  let depsMap = targetMap.get(target)
  if (!depsMap) return
  let deps = depsMap.get(key)
  if (!deps) return
  deps.forEach((effect) => effect())
}

// 创建Dep
function createDep () {
  const dep = new Set()
  dep.w = 0 // 旧标记
  dep.n = 0 // 新标记
  return dep
}
// 判断原来是否标记过
function wasTrack (dep) {
  return (dep.w & trackOpBit) > 0
}
// 判断本次是否标记过
function newTrack (dep) {
  return (dep.n & trackOpBit) > 0
}
function initDepMarkers ({ deps }) {
  deps.forEach((dep) => (dep.w |= trackOpBit))
}
function finalizeDepMarkers (effect) {
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

function effect (fn) {
  const effect = function () {
    try {
      // 标记effect层级
      trackOpBit = 1 << ++effectTrackDepth
      // 给之前收集到的依赖打上旧标记
      initDepMarkers(effect)
      effectStack.push((activeEffect = effect))
      return fn()
    } finally {
      // 执行完effect，看一下需要删除那些依赖添加哪些依赖
      finalizeDepMarkers(effect)
      trackOpBit = 1 << --effectTrackDepth
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1] || null
    }
  }
  effect.raw = fn
  effect.deps = []
  effect()
  return effect
}
const data = reactive({
  value1: 'value1',
  value2: 'value2',
})
effect(function fn1 () {
  console.log('执行了fn1:')
  effect(function fn2 () {
    console.log('执行了fn2:')
    const a = data.value2
  })
  const a = data.value1
})
