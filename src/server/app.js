import express from 'express'
import albumsRoutes from './routes/albums.js'
import artistsRoutes from './routes/artists.js'
import commentsRoutes from './routes/comments.js'
import healthRoutes from './routes/health.js'
import homeRoutes from './routes/home.js'
import mvsRoutes from './routes/mvs.js'
import playerRoutes from './routes/player.js'
import playlistsRoutes from './routes/playlists.js'
import rankingsRoutes from './routes/rankings.js'
import searchRoutes from './routes/search.js'
import authRoutes from './routes/auth.js'
const app = express()

app.use(express.json())
app.use(albumsRoutes)
app.use(artistsRoutes)
app.use(commentsRoutes)
app.use(healthRoutes)
app.use(homeRoutes)
app.use(playlistsRoutes)
app.use(searchRoutes)
app.use(mvsRoutes)
app.use(playerRoutes)
app.use(authRoutes)
app.use(rankingsRoutes)

export default app
