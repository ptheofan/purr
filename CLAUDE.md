# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run backend` - Start NestJS backend in development mode (port 3000)
- `npm run backend:debug` - Start backend in debug mode
- `npm run client` - Start React frontend with Vite (port 4000, proxies to backend)

### Build & Quality
- `npm run build` - Build both client and backend
- `npm run lint` - Run ESLint for both client and backend
- `npm run codegen` - Generate GraphQL types
- `npm run codegen:watch` - Watch mode for GraphQL type generation

### Testing (Backend)
- `npm run test` - Run all unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm test -- path/to/file.spec.ts` - Test single file
- `npm run test:cov` - Generate coverage report
- `npm run test:e2e` - Run E2E tests

### Testing (Client)
- `npm run test` - Run client tests
- `npm run test:unit` - Run unit tests only

## Architecture Overview

### Technology Stack
- **Backend**: NestJS with GraphQL/Apollo Server, Node.js 20.x
- **Frontend**: React 18 with Vite, Apollo Client, Material-UI
- **Testing**: Jest with separate unit and E2E test suites
- **External Integration**: Put.io API for file management

### Key Modules
- **downloader**: Multi-threaded download system with range support
  - `DownloadCoordinator`: Orchestrates downloads
  - `NetworkManager`: HTTP operations with range requests
  - `FileManager`: File system operations
  - `WorkerManager`: Multi-threaded download workers
  - `ProgressTracker`: Real-time progress reporting
- **download-manager**: Download queue and lifecycle management
- **putio**: Put.io API integration (transfers, files, events)
- **uploader**: File upload to Put.io
- **configuration**: Environment and settings management

### Design Patterns
- **Dependency Injection**: NestJS modules with service providers
- **Factory Pattern**: Component creation (e.g., DownloaderFactory)
- **Repository Pattern**: Data access abstraction
- **Mapper Pattern**: DTO transformations (ItemMapper, GroupMapper)
- **Event-Driven**: Progress updates and state changes via EventEmitter

## Code Style Guidelines

### TypeScript Standards
- Avoid `any` types - use proper typing or `unknown` with type guards
- Client: Strict TypeScript enabled
- Backend: Working towards strict mode (currently has loose settings)
- Use interfaces for all component props and service contracts

### NestJS Patterns
- Use decorators for dependency injection
- Implement proper DTOs with validation (Zod)
- Separate business logic into services
- Use modules for feature organization

### Testing Requirements
- Maintain 80%+ test coverage
- Unit tests: Mock external dependencies, test in isolation
- Integration tests: Test component interactions
- Use NestJS Testing module for dependency injection
- Mock filesystem with memfs, HTTP with axios-mock-adapter

### Import Organization
1. External modules (npm packages)
2. Internal modules (@app/...)
3. Relative imports (./)
- Alphabetical sorting within each group

### Naming Conventions
- PascalCase: Classes, interfaces, types, React components
- camelCase: Functions, variables, methods
- kebab-case: File names
- UPPER_SNAKE_CASE: Environment variables

## Project Structure
```
purr/
├── backend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── modules/      # Feature modules
│   │   │   └── app.module.ts # Root module
│   │   └── main.ts           # Entry point
│   └── test/                 # E2E tests
├── client/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── graphql/          # GraphQL queries/mutations
│   │   └── App.tsx           # Root component
│   └── vite.config.ts        # Vite configuration
└── package.json              # Monorepo root (npm workspaces)
```

## Important Notes
- No external database required - uses in-memory storage
- Environment configuration via `.env` file (see `.env.example`)
- GraphQL schema auto-generated from NestJS decorators
- Frontend proxies to backend via Vite during development