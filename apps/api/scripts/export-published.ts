import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

async function main() {
  const properties = await prisma.property.findMany({
    where: { reviewStatus: 'reviewed', published: true },
    include: { agent: { select: { id: true, name: true, email: true } } }
  })
  const projects = await prisma.constructionProject.findMany({
    where: { reviewStatus: 'reviewed', published: true },
    include: { agent: { select: { id: true, name: true, email: true } } }
  })
  
  const data = { properties, projects }
  // Save into the Real-Estate root directory
  const destPath = path.join(__dirname, '../../../../Real-Estate/shared-data.json')
  fs.writeFileSync(destPath, JSON.stringify(data, null, 2))
  console.log(`\n✅ Exported ${properties.length} properties and ${projects.length} projects to Real-Estate/shared-data.json`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
