// Safety guard for scripts that write, seed, or delete data in bulk.
// Call assertNotProduction() at the top of any such script.
//
// Background: on 13 July 2026 real field data was lost because destructive
// scripts ran against the production database. Local tooling must only ever
// touch the Neon "dev" branch; the production URL lives in Vercel env vars.

const PROD_ENDPOINT = 'ep-proud-fire-atselmc3'

// Shared check so every place that needs to know "is this the prod DB" reads
// the same constant — a second hardcoded copy is exactly how this kind of
// guard silently stops working after the endpoint is rotated.
export function isProductionDatabase(url = process.env.DATABASE_URL ?? ''): boolean {
  return url.includes(PROD_ENDPOINT)
}

export function assertNotProduction(): void {
  if (!isProductionDatabase()) return
  if (process.env.ALLOW_DESTRUCTIVE === 'yes') {
    console.warn('⚠️  ALLOW_DESTRUCTIVE=yes — running against PRODUCTION. You have 5 seconds to Ctrl+C...')
    const until = Date.now() + 5000
    while (Date.now() < until) { /* deliberate blocking pause */ }
    return
  }
  console.error(
    `✋ Refusing to run: DATABASE_URL points at the PRODUCTION endpoint (${PROD_ENDPOINT}).\n` +
    'Point DATABASE_URL at the dev branch, or set ALLOW_DESTRUCTIVE=yes if you truly mean production.'
  )
  process.exit(1)
}
