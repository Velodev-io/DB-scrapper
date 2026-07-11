# Variable Tree: @carry/api requireAdmin successfully verifies Clerk JWT when publicMetadata.role is "admin"

- [x] [Composite] Variable A: JWT signature verification succeeds in @carry/api
  - [x] [Leaf] Variable A.1: CLERK_SECRET_KEY is loaded correctly from environment
  - [x] [Leaf] Variable A.2: Clerk JWT signature verifies locally against CLERK_SECRET_KEY
- [x] [Composite] Variable B: JWT payload contains expected claims
  - [x] [Leaf] Variable B.1: JWT contains "role" claim
  - [x] [Leaf] Variable B.2: value of "role" claim is exactly "admin"
