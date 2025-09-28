# GraphQL Code Generation Setup

This document explains the GraphQL code generation setup for the Purr client application.

## Overview

We use GraphQL Code Generator to automatically generate TypeScript types and utilities from our GraphQL schema and operations. This ensures type safety and reduces boilerplate code.

## Configuration

The configuration is in `codegen.ts`:

- **Schema**: Points to `http://localhost:3000/graphql`
- **Documents**: Scans all `.ts` and `.tsx` files for GraphQL operations
- **Output**: Generates files in `src/__generated__/`

## File Structure

```
src/
├── fragments/           # Reusable GraphQL fragments
│   ├── config.fragments.ts
│   ├── group.fragments.ts
│   ├── stats.fragments.ts
│   └── index.ts
├── queries/             # GraphQL operations
│   ├── config.queries.ts
│   ├── downloads.queries.ts
│   └── index.ts
├── mutations/           # GraphQL mutations
│   └── downloads.mutations.ts
├── subscriptions/       # GraphQL subscriptions
│   └── downloads.subscriptions.ts
├── hooks/               # Custom React hooks
│   ├── useDownloads.ts
│   ├── useAppConfig.ts
│   └── index.ts
└── __generated__/       # Auto-generated files
    ├── gql.ts
    ├── graphql.ts
    └── index.ts
```

## Usage

### 1. Fragments

Create reusable fragments to avoid duplicating field selections:

```typescript
// fragments/group.fragments.ts
export const GroupBasicInfoFragment = gql(`
  fragment GroupBasicInfo on Group {
    id
    name
    status
    state
    addedAt
    saveAt
  }
`);
```

### 2. Queries

Define queries using fragments:

```typescript
// queries/downloads.queries.ts
export const GET_GROUPS = gql(`
  query GetGroups {
    getGroups {
      ...GroupWithItems
    }
  }
`);
```

### 3. Custom Hooks

Create custom hooks for better organization:

```typescript
// hooks/useDownloads.ts
export const useDownloadGroups = () => {
  return useQuery(GET_GROUPS);
};
```

### 4. Using in Components

```typescript
import { useDownloadGroups } from '../hooks';

const DownloadsComponent = () => {
  const { loading, error, data } = useDownloadGroups();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data?.getGroups?.map(group => (
        <div key={group.id}>{group.name}</div>
      ))}
    </div>
  );
};
```

## Commands

- `npm run codegen` - Generate types and utilities
- `npm run codegen:watch` - Watch mode for automatic regeneration

## Features

- **Type Safety**: Full TypeScript support for all GraphQL operations
- **Fragment Masking**: Safe fragment composition with `getFragmentData`
- **Custom Scalars**: Proper handling of `BigInt` and `DateTime` types
- **Tree Shaking**: Optimized bundle size with proper imports
- **Auto-formatting**: Prettier integration for generated files

## Best Practices

1. **Use Fragments**: Break down complex queries into reusable fragments
2. **Custom Hooks**: Create hooks for commonly used operations
3. **Type Safety**: Always use generated types instead of `any`
4. **Error Handling**: Handle loading and error states in components
5. **Optimization**: Use `skip` option for conditional queries

## Schema Integration

The setup automatically:
- Fetches schema from the running GraphQL server
- Generates TypeScript types for all schema types
- Creates typed document nodes for all operations
- Provides fragment masking utilities
- Handles custom scalar types properly
