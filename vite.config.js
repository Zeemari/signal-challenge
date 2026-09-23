import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

function apiDevPlugin() {
  return {
    name: 'api-dev-plugin',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      Object.assign(process.env, env)

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()

        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
          const pathname = urlObj.pathname
          const query = Object.fromEntries(urlObj.searchParams.entries())

          let body = null
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const buffers = []
            for await (const chunk of req) {
              buffers.push(chunk)
            }
            const rawBody = Buffer.concat(buffers).toString('utf-8')
            if (rawBody) {
              try {
                body = JSON.parse(rawBody)
              } catch {
                body = rawBody
              }
            }
          }

          const fileRelPath = `.${pathname}.js`
          const mod = await server.ssrLoadModule(fileRelPath)
          const handler = mod.default

          req.query = query
          req.body = body

          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
            return res
          }

          await handler(req, res)
        } catch (err) {
          console.error('[API Dev Server Error]:', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message || 'Server error' }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), apiDevPlugin()],
})
