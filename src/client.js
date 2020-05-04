import { scheduleWork, h } from './web_modules/fre.js'
const wsp = location.protocol === 'https:' ? 'wss' : 'ws'
const ws = new WebSocket(`${wsp}://localhost:4000`)
ws.onopen = () => console.log('opened.')
ws.onmessage = (e) => {
  const { type, path, timestamp } = JSON.parse(e.data)
  if (type === 'reload') {
    import(path).then((mod) => {
      const fiber = mod.default.WIP
      if (fiber) {
        // this is a Compoent
        import(`${path}?t=${timestamp}`).then((mod) => {
          const vdom = h(mod.default, fiber.props)
          let c = { ...fiber, ...vdom }
          scheduleWork(c)
        })
      }
    })
  }
}

ws.onerror = (e) => console.error(e)
ws.onclose = (e) => console.log('closed.')
