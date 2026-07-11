# Learnings: Clerk Auto-Verification and Invitation Linking

We investigated native and backend-assisted methods to automate role assignment for users who register directly (bypassing the tokenized magic-link email invitation).

## Analysis of Solutions

| Solution | Implementation | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **1. Webhook Bridge (`user.created`)** | Listen for Clerk's `user.created` event via SVIX on backend. Match the signup email to pending invitations, update user `publicMetadata.role`, and revoke invitation. | Fully server-to-server; works for all registrations (Social SSO, direct email); completely transparent to frontend. | Requires configuring webhook endpoints in Clerk Dashboard, SVIX signatures, and public URL tunneling for dev. |
| **2. API Lazy Sync on JWT parsing** | Check user metadata on any API request. If no role is present, perform backend-side check against invitations, set user metadata, and grant access. | Zero Dashboard config; works natively on API routes; simple maintenance. | The user must perform an API request first, or the frontend must call a specific check endpoint. |
| **3. Clerk Organizations (Native)** | Use Clerk's native Organizations feature. Invitations are associated with an organization membership role. | Clerk native propagation; no custom backend logic needed for role linkage on signup. | Requires architectural migration to Clerk Orgs; increases token sizes and changes auth structures. |
| **4. Frontend-Assisted Sync (Active Fix)** | Frontend polls / checks for access. If none, it calls `POST /agents/sync-role`. The backend verifies the session, propagates invitation metadata, and returns status. | Safe, easy to implement, works with existing single-user DB models. | Minor delay (1-2s) for user session to reload client-side. |

## Webhook Bridge Setup (Recommended Production Pattern)

To implement the Webhook Bridge, you would configure a webhook in the Clerk Dashboard pointing to:
`https://api.carry.dev/api/v1/webhooks/clerk`

### Backend Webhook Handler Structure:
```typescript
import { Webhook } from 'svix'

app.post('/webhooks/clerk', async (request, reply) => {
  const payload = request.body
  const headers = request.headers
  
  // Verify webhook signature using SVIX
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  let evt: any
  try {
    evt = wh.verify(JSON.stringify(payload), headers as any)
  } catch (err) {
    return reply.code(400).send({ error: 'Invalid signature' })
  }

  // Handle user creation
  if (evt.type === 'user.created') {
    const { id: clerkUserId, email_addresses } = evt.data
    const emails = email_addresses.map((e: any) => e.email_address)

    const { data: invitations } = await clerk.invitations.getInvitationList({ status: 'pending' })
    const matchingInvite = invitations.find(
      (inv: any) => emails.includes(inv.emailAddress) && inv.publicMetadata?.role === 'agent'
    )

    if (matchingInvite) {
      // 1. Grant agent role
      await clerk.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { role: 'agent' }
      })
      // 2. Revoke invitation
      await clerk.invitations.revokeInvitation(matchingInvite.id)
    }
  }
  return { received: true }
})
```
