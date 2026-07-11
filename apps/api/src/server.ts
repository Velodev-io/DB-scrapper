import Fastify from 'fastify'

const PORT = Number(process.env.PORT ?? 4001)

async function main() {
  const app = Fastify({ logger: true })

  app.get('/health', async () => ({ ok: true, service: 'carry-api', port: PORT }))

  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`API running at http://localhost:${PORT}`)
  app.log.info(`Swagger UI at http://localhost:${PORT}/api/docs`)
}

main().catch(err => { console.error(err); process.exit(1) })
