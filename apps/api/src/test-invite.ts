import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
const INVITATION_ID = 'inv_3GMik0qaVEBgXFaAwsicxJWORBn'

async function main() {
  console.log(`Attempting to revoke accepted invitation ${INVITATION_ID}...`)
  try {
    const res = await clerk.invitations.revokeInvitation(INVITATION_ID)
    console.log('Revoke success! Response:', res)
  } catch (err: any) {
    console.error('Revoke failed!')
    console.error('Message:', err.message)
    console.error('Errors array:', JSON.stringify(err.errors, null, 2))
  }
}

main().catch(console.error)
