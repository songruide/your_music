import express from 'express'
import healthRoutes from './routes/health.js'
import homeRoutes from './routes/home.js'
import mvsRoutes from './routes/mvs.js'
import playerRoutes from './routes/player.js'
import playlistsRoutes from './routes/playlists.js'
import searchRoutes from './routes/search.js'

const app = express()

app.use(express.json())
app.use(healthRoutes)
app.use(homeRoutes)
app.use(playlistsRoutes)
app.use(searchRoutes)
app.use(mvsRoutes)
app.use(playerRoutes)

export default app
