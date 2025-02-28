# Commands
- Build: `npm run build` (client/backend)
- Lint: `npm run lint` (client/backend)
- Test: `npm run test` (backend)
- Test watch: `npm run test:watch` (backend)
- Test single file: `npm test -- path/to/file.spec.ts` (backend)
- Test E2E: `npm run test:e2e` (backend)

# Code Style Guidelines
- TypeScript with strong typing (avoid `any` when possible)
- Client: React components with functional style, TypeScript interfaces
- Backend: NestJS framework, GraphQL
- Import order: external modules first, internal modules second, alphabetical sorting
- Naming: PascalCase for components/classes, camelCase for functions/variables
- Error handling: proper try/catch blocks or error propagation
- Components: small, focused components with explicit props interfaces
- Comments: use JSDoc style for functions and components
- Avoid props drilling; use context when appropriate
- Keep lint warnings to minimum, follow ESLint recommendations

# Project Structure
- client/: React frontend (Vite, Apollo Client)
- backend/: NestJS GraphQL API