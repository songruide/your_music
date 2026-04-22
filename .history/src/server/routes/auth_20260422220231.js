import express from 'express';
import { createLoginQrKey } from '../services/auth.js'
import { createRouteHandler, sendOk } from '../utils/http.js'
import { createLoginQrCode, createLoginQrKey } from '../services/auth.js'

const router=express.Router()

router.get('/api/auth/qr-key', createRouteHandler(async (req, res) => {
  const data = await createLoginQrKey({
    // timestamp 不是必须，但前端通常会带上，避免缓存干扰。
    timestamp: req.query.timestamp,
  })

  sendOk(res, data)
}))
router.get('/api/auth/qr-create', createRouteHandler(async (req, res) => {
  const key = String(req.query.key ?? '').trim()

  if (!key) {
    throw new Error('key is required')
  }

  const data = await createLoginQrCode({
    key,
    // 传 true 时会返回 base64 图片，前端最省事。
    qrimg: req.query.qrimg !== 'false',
    // 可先不传，默认走 pc。
    // 如果你后面想试 web 方式，也可以从 query 透传。
    platform: req.query.platform,
  })

  sendOk(res, data)
}))
export default router