import { useAuth, useUser } from '@clerk/clerk-expo'

export type AccessGateState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'pending' }
  | { status: 'granted' }

// Mirrors apps/agent/src/App.tsx's AgentGuard: role lives in Clerk's
// publicMetadata and is set automatically by the `user.created` webhook
// (apps/api/src/routes/webhooks.ts) right after sign-up, unless the email
// belongs to a revoked agent.
export function useAccessGate(): AccessGateState {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  if (!isLoaded) return { status: 'loading' }
  if (!isSignedIn) return { status: 'signed-out' }

  const role = user?.publicMetadata?.role as string | undefined
  if (role !== 'agent' && role !== 'admin') return { status: 'pending' }

  return { status: 'granted' }
}
