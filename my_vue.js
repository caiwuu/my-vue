/*
 * @Author: caiwu
 * @Date: 2020-04-26 10:28:46
 * @LastEditors: caiwu
 * @LastEditTime: 2020-04-29 17:48:30
 * @Description:
 * @Email: 2252711582@qq.com
 * @Company: your company
 * @youWant: add you want
 */
const compileUtil = {
  // expr:a.aa.aaa
  getVal(expr, vm) {
    return expr.split('.').reduce((data, item) => {
      return data[item]
    }, vm.$data)
  },
  // a.aa.aaa=xxx
  setVal(expr, vm, inputVal) {
    return expr.split('.').reduce((data, item) => {
      data[item] = inputVal
    }, vm.$data)
  },
  getContentVal(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1], vm)
    })
  },
  text(node, expr, vm) {
    let value
    if (expr.indexOf('{{') !== -1) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        new Watcher(vm, args[1], () => {
          this.updater.textUpdater(node, this.getContentVal(expr, vm))
        })
        return this.getVal(args[1], vm)
      })
    } else {
      new Watcher(vm, expr, (newVal) => {
        this.updater.htmlUpdater(node, newVal)
      })
      value = this.getVal(expr, vm)
    }

    this.updater.textUpdater(node, value)
  },
  html(node, expr, vm) {
    const value = this.getVal(expr, vm)
    new Watcher(vm, expr, (newVal) => {
      this.updater.htmlUpdater(node, newVal)
    })
    this.updater.htmlUpdater(node, value)
  },
  model(node, expr, vm) {
    const value = this.getVal(expr, vm)
    new Watcher(vm, expr, (newVal) => {
      this.updater.modelUpdater(node, newVal)
    })
    node.addEventListener('input', (e) => {
      this.setVal(expr, vm, e.target.value)
    })
    this.updater.modelUpdater(node, value)
  },
  on(node, expr, vm, eventName) {
    let fn = vm.$options.methods && vm.$options.methods[expr]
    node.addEventListener(eventName, fn.bind(vm), false)
  },

  updater: {
    textUpdater(node, value) {
      node.textContent = value
    },
    htmlUpdater(node, value) {
      node.innerHTML = value
    },
    modelUpdater(node, value) {
      node.value = value
    },
  },
}
//编译器
class Compile {
  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    this.vm = vm
    const fragment = this.nodeFragment(this.el)
    this.compile(fragment)
    this.el.appendChild(fragment)
  }
  //判断是否为node节点
  isElementNode(el) {
    return el.nodeType === 1
  }
  //生成dom片段
  nodeFragment(el) {
    console.log(el.firstChild)
    const f = document.createDocumentFragment()
    let firstChild
    while ((firstChild = el.firstChild)) {
      f.appendChild(firstChild)
    }
    console.log(f)

    return f
  }
  compile(fragment) {
    const childeNodes = fragment.childNodes
    ;[...childeNodes].forEach((child) => {
      if (this.isElementNode(child)) {
        this.compileElement(child)
      } else {
        this.compileText(child)
      }
      if (child.childNodes && child.childNodes.length) {
        this.compile(child)
      }
    })
  }
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }
  isEventName(attrName) {
    return attrName.startsWith('@')
  }

  compileElement(node) {
    const attributes = node.attributes
    ;[...attributes].forEach((attr) => {
      const { name, value } = attr
      if (this.isDirective(name)) {
        const [, directive] = name.split('-')
        const [dirName, eventName] = directive.split(':')
        compileUtil[dirName](node, value, this.vm, eventName)
        node.removeAttribute('v-' + directive)
      } else if (this.isEventName(name)) {
        let [, eventName] = name.split('@')
        compileUtil['on'](node, value, this.vm, eventName)
      }
    })
  }
  compileText(node) {
    const content = node.textContent
    if (/\{\{.+?\}\}/.test(content)) {
      compileUtil['text'](node, content, this.vm)
    }
  }
}
//Observe
class Observer {
  constructor(data) {
    this.observe(data)
  }
  observe(data) {
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        this.defineReactive(data, key, data[key])
      })
    }
  }
  defineReactive(obj, key, value) {
    this.observe(value)
    const dep = new Dep()
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: false,
      get: () => {
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set: (newVal) => {
        this.observe(newVal)
        if (newVal !== value) {
          value = newVal
        }
        dep.notify()
      },
    })
  }
}
//Watcher
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm
    this.expr = expr
    this.cb = cb
    this.oldVal = this.getOldVal()
  }
  update() {
    const newVal = compileUtil.getVal(this.expr, this.vm)
    if (this.oldVal !== newVal) {
      this.cb(newVal)
    }
  }
  getOldVal() {
    Dep.target = this
    const oldVal = compileUtil.getVal(this.expr, this.vm)
    Dep.target = null
    return oldVal
  }
}

//Dep
class Dep {
  constructor() {
    this.subs = []
  }
  addSub(watcher) {
    this.subs.push(watcher)
  }
  notify() {
    this.subs.forEach((w) => w.update())
  }
}

class Vue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    this.$options = options
    new Observer(this.$data)
    if (options.el) {
      new Compile(this.$el, this)
      this.proxyData(this.$data)
    } else {
      throw new Error('未绑定根元素')
    }
  }
  proxyData(data) {
    for (const key in data) {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: false,
        get: () => {
          console.log('外层')
          return data[key]
        },
        set: (newdata) => {
          console.log(key)
          data[key] = newdata
        },
      })
    }
  }
}
