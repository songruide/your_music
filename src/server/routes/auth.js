import express from 'express'
import {
  checkLoginQrStatus,
  createLoginQrCode,
  createLoginQrKey,
  getLoginSession,
  loginWithCellphone,
  logoutSession,
} from '../services/auth.js'
import { clearAuthCookie, readAuthCookie, writeAuthCookie } from '../utils/auth-cookie.js'
import { createRouteHandler, getRequiredQueryString, HttpError, sendOk } from '../utils/http.js'

const router = express.Router()

router.get(
  '/api/auth/qr-key',
  createRouteHandler(async (req, res) => {
    const data = await createLoginQrKey({
      timestamp: req.query.timestamp,
      ua: 'pc',
    })

    sendOk(res, data)
  }),
)

router.get(
  '/api/auth/qr-create',
  createRouteHandler(async (req, res) => {
    const key = getRequiredQueryString(req, 'key')
    const data = await createLoginQrCode({
      key,
      qrimg: req.query.qrimg !== 'false',
      platform: req.query.platform,
      cookie: readAuthCookie(req),
      ua: 'pc',
    })

    sendOk(res, data)
  }),
)

router.get(
  '/api/auth/qr-check',
  createRouteHandler(async (req, res) => {
    const key = getRequiredQueryString(req, 'key')
    const result = await checkLoginQrStatus({
      key,
      timestamp: req.query.timestamp,
      cookie: readAuthCookie(req),
      ua: 'pc',
    })

    if (result.authorized && result.cookie) {
      writeAuthCookie(res, result.cookie)
    }

    sendOk(res, {
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
      authorized: result.authorized,
      expired: result.expired,
    })
  }),
)

router.get(
  '/api/auth/status',
  createRouteHandler(async (req, res) => {
    const cookie = readAuthCookie(req)

    if (!cookie) {
      sendOk(res, {
        loggedIn: false,
        profile: null,
      })
      return
    }

    const session = await getLoginSession({
      cookie,
      timestamp: req.query.timestamp,
      ua: 'pc',
    })

    if (!session.loggedIn) {
      clearAuthCookie(res)
    }

    sendOk(res, session)
  }),
)

router.post(
  '/api/auth/cellphone-login',
  createRouteHandler(async (req, res) => {
    const phone = String(req.body?.phone ?? '').trim()
    const password = String(req.body?.password ?? '')

    if (!phone) {
      throw new HttpError(400, '手机号不能为空')
    }

    if (!password) {
      throw new HttpError(400, '密码不能为空')
    }

    const result = await loginWithCellphone({
      phone,
      password,
      ua: 'pc',
    })

    writeAuthCookie(res, result.cookie)
    sendOk(res, result.session)
  }),
)

router.post(
  '/api/auth/logout',
  createRouteHandler(async (req, res) => {
    const cookie = readAuthCookie(req)

    if (cookie) {
      await logoutSession({
        cookie,
        ua: 'pc',
      })
    }

    clearAuthCookie(res)
    sendOk(res, {
      loggedIn: false,
      profile: null,
    })
  }),
)

export default router
