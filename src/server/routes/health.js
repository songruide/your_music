import express from 'express'
import { sendOk } from '../utils/http.js'

const router = express.Router()

router.get('/api/health', (req, res) => {
  sendOk(res, { status: 'running' })
})

export default router
