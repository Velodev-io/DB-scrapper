import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

async function main() {
  console.log('Listing all current Clerk users:')
  const { data: users } = await clerk.users.getUserList({ limit: 100 })
  console.log(`Found ${users.length} users in Clerk.`)
  for (const user of users) {
    const emails = user.emailAddresses.map(e => e.emailAddress)
    console.log(`- ID: ${user.id}, Email(s): ${emails.join(', ')}, Role: ${user.publicMetadata?.role}`)
  }
}

main().catch(console.error)
