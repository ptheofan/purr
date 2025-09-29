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

## Troubleshooting & Known Issues

### Download System Reliability (Fixed as of 2025-09-29)

**Issue**: Downloads could stop mid-process or never start due to deadlock conditions.

**Critical Fixes Implemented**:

1. **Recursive Mutex Deadlock** (download-manager.service.ts:466, 473, 479)
   - **Problem**: `start()` method calling itself recursively while holding `startMutex`
   - **Solution**: Use `setImmediate(() => this.start())` to schedule execution outside mutex scope
   - **Impact**: Prevents download queue from freezing when downloads complete/fail

2. **Missing Promise Error Handling** (download-manager.service.ts:206-227)
   - **Problem**: `analysisCompletedPromise` could hang indefinitely if disk analysis failed
   - **Solution**: Added comprehensive error handling with graceful fallback
   - **Impact**: Downloads continue even if file integrity checks fail

3. **activePromises Race Condition** (download-coordinator.ts:95-96)
   - **Problem**: Race between checking `activePromises.size` and `Promise.race()` call
   - **Solution**: Thread-safe snapshot mechanism via `waitForWorkerEvents()`
   - **Impact**: Eliminates worker coordination race conditions

4. **Repository Mutex Deadlock** (repository.ts:35-50)
   - **Problem**: Custom promise-chaining mutex caused deadlocks in nested operations
   - **Solution**: Replaced with proper `async-mutex` library using `Mutex.runExclusive()`
   - **Impact**: Eliminates deadlocks in all repository operations

**Symptoms of Original Issues**:
- Downloads stopping mid-process without error messages
- Download queue not processing new items
- Workers appearing stuck in "downloading" state
- System requiring restart to resume downloads

**Verification**: All fixes verified with comprehensive test suite (290+ tests passing).

### Development Guidelines

**Testing**:
- Maintain 80%+ coverage for all new code
- Separate unit and integration test suites
- Use `npm test` to run full backend test suite

**Error Handling**:
- Never leave promises without `.catch()` handlers
- Use proper mutex patterns (`async-mutex` library)
- Avoid recursive method calls within mutex scope

**Debugging Downloads**:
- Check logs for mutex-related errors: `startMutex`, `withLock`
- Monitor worker states: stuck in "downloading" status indicates issues
- Use `DEBUG=*` environment variable for verbose logging