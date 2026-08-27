import { BasePage } from './base-page.js'
class App extends $falcon.App {
  constructor() {
    super()
  }
  onLaunch(options) {
    super.onLaunch(options)
    this.setViewPort(172)
    $falcon.useDefaultBasePageClass(BasePage)
  }
}
try {
  globalThis['window'] = { requestAnimationFrame, cancelAnimationFrame }
} catch (err) {}
try {
  globalThis['process'] = { env: { NODE_ENV: 'production' } }
} catch (err) {}
export default App
