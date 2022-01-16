  <div id="app">
    <h2 ccc="sdsdds">{{person.name}}-----{{msg}}</h2>
    <h3>{{person.fav}}</h3>
    <ul>
      <li>1</li>
      <li>2</li>
      <li>3</li>
    </ul>
    <h3>{{person.name}}</h3>
    <div v-text="htmlStr"></div>
    <div v-html="htmlStr"></div>
    <input type="text" v-model="msg" />
    <button @click="click">button</button>
  </div>
  <script src="./my_vue.js"></script>
  <script>
    let vm = new Vue({
      el: '#app',
      data: {
        person: {
          age: 18,
          name: 'caiwu',
          fav: '游戏',
        },
        caiwu: 'ssss',
        htmlStr: '<h1>html</h1>',
        msg: '实现一个vue MVVM 框架',
      },
      methods: {
        click() {
          this.$data.msg = 'hhhh'
          this.person.name = 'zhangsan'
        },
      },
    })
  </script>