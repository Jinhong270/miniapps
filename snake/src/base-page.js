const DEBUG = false
function _collectFalconEventIds(name, callback)
{
  const evtList = $falcon.eventMap[name]
  if (evtList) {
    if (callback) {
      const index = evtList.findIndex(item => item.callback === callback || item.id === callback);
      if (index !== -1) {
        return [evtList[index].id]
      }
    } else {
      return evtList.map((item) => item.id)
    }
  }
  return []
}

class PageRes extends $falcon.Page {
  constructor() {
    super()
    this.falconOnTokens = []
    this.timeoutTokens = new Set()
    this.intervalTokens = new Set()
  }

  on(name, callback) {
    const token = $falcon.on(name, callback)
    this.falconOnTokens.push([token, name])
    return token
  }

  off(name, callback) {
    const falconOnTokens2 = []
    let idsWillRemoved = _collectFalconEventIds(name, callback)
    idsWillRemoved = new Set(idsWillRemoved)
    for (let [token, name] of this.falconOnTokens) {
      if (idsWillRemoved.has(token)) {
        continue
      }
      falconOnTokens2.push([token, name])
    }
    this.falconOnTokens = falconOnTokens2
    $falcon.off(name, callback)
  }
  trigger(name, options) {
    $falcon.trigger(name, options)
  }
  setTimeout(func, ms) {
    const token = setTimeout(() => {
      this.timeoutTokens.delete(token)
      func()
    }, ms)
    this.timeoutTokens.add(token)
    return token
  }
  setInterval(func, ms) {
    const token = setInterval(func, ms)
    this.intervalTokens.add(token)
    return token
  }
  clearTimeout(token) {
    this.timeoutTokens.delete(token)
    clearTimeout(token)
  }
  clearInterval(token) {
    this.intervalTokens.delete(token)
    clearInterval(token)
  }
  release() {
    for (let [token, name] of this.falconOnTokens) {
      $falcon.off(name, token)
    }
    this.falconOnTokens.length = 0
    for (let token of this.timeoutTokens) {
      clearTimeout(token)
    }
    this.timeoutTokens.clear()
    for (let token of this.intervalTokens) {
      clearInterval(token)
    }
    this.intervalTokens.clear()
  }
}

export class BasePage extends PageRes {
  constructor() {
    super()
  }

  async sleep(ms) {
    return new Promise((resolve) => {
      this.setTimeout(() => {
        resolve()
      }, ms)
    })
  }

  onLoad(options) {
    super.onLoad(options)
    this.options = options
  }

  onNewOptions(options) {
    super.onNewOptions(options)
    this.options = options
  }

  onShow() {
    super.onShow()
    if (this.$root.onShow) {
      this.$root.onShow()
    }
  }

  onHide() {
    super.onHide()
    if (this.$root.onHide) {
      this.$root.onHide()
    }
  }

  onUnload() {
    try {
      super.onUnload()
      if (this.$root.onUnload) {
        this.$root.onUnload()
      }
    } finally {
      if (this.release) {
        this.release()
      }
    }
  }

  beforeVueInstantiate(Vue) {
    try {
      Vue.prototype.$workspace = globalThis.$workspace
      Vue.prototype.$appid = globalThis.$appid
    } catch (err) {
      console.log(err)
    }
  }
}
