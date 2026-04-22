import express from 'express';
import { createLoginQrKey } from '../services/auth.js'
import { createRouteHandler, sendOk } from '../utils/http.js'

const router=express.Router()

router.get('/api/auth/qr-key', createRouteHandler(async (req, res) => {
  const data = await createLoginQrKey({
    // timestamp 不是必须，但前端通常会带上，避免缓存干扰。
    timestamp: req.query.timestamp,
  })

  sendOk(res, data)
}))

export default router