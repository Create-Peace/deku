import { join } from 'https://deno.land/std@v0.42.0/path/mod.ts'
import { serve, Server } from 'https://deno.land/std@v0.42.0/http/server.ts'
import { acceptWebSocket, WebSocket } from 'https://deno.land/std@v0.42.0/ws/mod.ts'
const { readFile, transpileOnly, watchFs, cwd } = Deno

/* common server */
;(async function () {
  const c = serve({ port: 3000 })
  console.log('server on 3000')
  for await (const req of c) {
    const { url } = req
    if (url === '/') {
      const data = await readFile('./index.html')
      const client = await readFile(join('.', 'src/client.js'))
      const html = decoder(data) + '<script type="module">' + decoder(client) + '</script>'
      req.respond({ body: html })
    } else if (/\.[j|t]sx?$/.test(url)) {
      const filepath = cwd() + url
      const data = await readFile(filepath)
      const source = decoder(data)
      const code = await transform(url, source)
      const headers = new Headers()
      headers.set('content-type', 'application/javascript')
      req.respond({ body: code, headers })
    } else {
      req.respond({ body: '404' })
    }
  }
})()
/* HMR server */
;(async function () {
  const w = serve({ port: 4000 })
  console.log('hmr on 4000')
  for await (const req of w) {
    const { headers, conn, r, w } = req
    acceptWebSocket({
      conn,
      headers,
      bufReader: r,
      bufWriter: w,
    })
      .then((sock: WebSocket) => reload(sock))
      .catch((e) => console.error(e))
  }
})()

async function transform(rootName: string, source: string) {
  const result = await transpileOnly({ [rootName]: source }, { strict: false, jsx: 'react', jsxFactory: 'h' })
  return result[rootName].source
}

function decoder(b: Uint8Array) {
  return new TextDecoder().decode(b)
}

async function reload(sock: WebSocket) {
  const iter = watchFs(cwd())
  const timeMap = new Map()
  for await (const event of iter) {
    const path = await event.paths[0]
    const timestamp = new Date().getTime()
    const oldTime = timeMap.get(path)
    const name = path.replace(/\\\\/g, '\\').replace(cwd(), '')
    console.log(name)
    if (oldTime + 250 < timestamp || !oldTime) {
      sock.send(
        JSON.stringify({
          timestamp,
          path: name,
        })
      )
    }
    timeMap.set(path, timestamp)
  }
}
