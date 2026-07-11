// Vercel serverless entry point
// This wraps the Fastify app for Vercel's serverless function runtime.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildApp } from './server.js'

// Cache the app instance across warm invocations (reduces cold start on subsequent calls)
let appPromise: ReturnType<typeof buildApp> | null = null

function getApp() {
  if (!appPromise) appPromise = buildApp()
  return appPromise
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp()

  // Convert Vercel req/res to a format Fastify can handle
  await app.ready()
  app.server.emit('request', req, res)
}
