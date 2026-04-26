import assert from 'node:assert/strict'
import { test } from 'node:test'

import app from '../src/server/app.js'
import { readAuthCookie, writeAuthCookie } from '../src/server/utils/auth-cookie.js'
import { getLimit, getOffset } from '../src/server/utils/params.js'

function listen() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1')

    server.once('listening', () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Expected an ephemeral TCP port'))
        return
      }

      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        server,
      })
    })

    server.once('error', reject)
  })
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

test('server health endpoint returns the unified success envelope', async (t) => {
  const { baseUrl, server } = await listen()
  t.after(() => closeServer(server))

  const response = await fetch(`${baseUrl}/api/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body, {
    code: 200,
    data: {
      status: 'running',
    },
    message: 'ok',
  })
})

test('server route errors keep the unified error envelope', async (t) => {
  const { baseUrl, server } = await listen()
  t.after(() => closeServer(server))

  const response = await fetch(`${baseUrl}/api/search/songs`)
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.code, 400)
  assert.equal(body.data, null)
  assert.equal(body.message, 'keywords is required')
})

test('pagination query helpers normalize invalid input safely', () => {
  assert.equal(getLimit(undefined, 40), 40)
  assert.equal(getLimit('0', 40), 40)
  assert.equal(getLimit('12.5', 40), 12.5)
  assert.equal(getOffset(undefined), 0)
  assert.equal(getOffset('-1'), 0)
  assert.equal(getOffset('12.9'), 12)
})

test('auth cookie helpers preserve long upstream session cookies in chunks', () => {
  const cookieJar = new Map()
  const response = {
    clearCookie(name) {
      cookieJar.delete(name)
    },
    cookie(name, value) {
      cookieJar.set(name, String(value))
    },
  }
  const upstreamCookie = `MUSIC_U=${'x'.repeat(9000)}; __csrf=csrf-token`

  writeAuthCookie(response, upstreamCookie)

  const request = {
    headers: {
      cookie: Array.from(cookieJar.entries()).map(([name, value]) => `${name}=${value}`).join('; '),
    },
  }

  assert.equal(readAuthCookie(request), upstreamCookie)
})
