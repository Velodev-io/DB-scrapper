import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const properties = await prisma.property.findMany({ where: { slug: null } })
  for (const p of properties) {
    const cleanSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const slug = `${cleanSlug}-${p.id.slice(-4)}`
    await prisma.property.update({
      where: { id: p.id },
      data: { slug }
    })
    console.log(`Updated slug for property "${p.title}" -> ${slug}`)
  }

  const projects = await prisma.constructionProject.findMany({ where: { slug: null } })
  for (const p of projects) {
    const cleanSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const slug = `${cleanSlug}-${p.id.slice(-4)}`
    await prisma.constructionProject.update({
      where: { id: p.id },
      data: { slug }
    })
    console.log(`Updated slug for project "${p.title}" -> ${slug}`)
  }

  console.log('\n✅ Backfill completed successfully.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
