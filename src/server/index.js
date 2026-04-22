import { pathToFileURL } from 'node:url'
import app from './app.js'
import { PORT } from './config.js'

const isDirectRun =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`)
  })
}

export default app
