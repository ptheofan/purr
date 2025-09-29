# GraphQL Development Strategy

This project uses **hand-written GraphQL types** with **co-located GraphQL operations** for optimal maintainability, Apollo cache efficiency, and simpler CI/CD.

## Why This Approach?

- ✅ **No Build Dependencies**: Client builds independently without backend server
- ✅ **Simpler CI/CD**: No complex codegen steps in build pipelines
- ✅ **No Merge Conflicts**: No generated files to cause conflicts between developers
- ✅ **Better Type Safety**: Clean, explicit types instead of generated `any` types
- ✅ **Co-location**: GraphQL operations live next to the components that use them
- ✅ **Optimized Queries**: Each component requests exactly the fields it needs
- ✅ **Better Apollo Cache**: Granular field selection improves cache efficiency
- ✅ **Tree Shaking**: Unused operations won't be bundled

## File Structure

```
client/src/types/graphql.ts                    # Hand-written TypeScript types (source of truth)
client/src/scenes/downloads/index.tsx          # Downloads component
client/src/scenes/downloads/index.graphql.ts   # GraphQL operations for Downloads
client/src/scenes/config/index.tsx             # Config component
client/src/scenes/config/index.graphql.ts      # GraphQL operations for Config
client/src/components/MyComponent.tsx          # Any component
client/src/components/MyComponent.graphql.ts   # GraphQL operations for MyComponent
backend/src/schema.gql                         # Generated schema (optional, for reference only)
```

## Development Workflow

### For Frontend Developers

1. **Create co-located GraphQL operations** next to your component:

```typescript
// components/MyComponent/MyComponent.graphql.ts
import { gql } from '@apollo/client';
import type { MyQueryResult } from '../../types/graphql';

export const GET_MY_DATA = gql`
  query GetMyData($id: String!) {
    myData(id: $id) {
      id
      name
      # Only request fields this component actually needs
      status
    }
  }
`;

export type MyComponentQueryResult = MyQueryResult;
```

2. **Use the operations in your component**:

```typescript
// components/MyComponent/MyComponent.tsx
import { useQuery } from '@apollo/client';
import { GET_MY_DATA, type MyComponentQueryResult } from './MyComponent.graphql';

const MyComponent = ({ id }: { id: string }) => {
  const { data, loading } = useQuery<MyComponentQueryResult>(GET_MY_DATA, {
    variables: { id }
  });

  // Component logic here
};
```

3. **Benefits of this pattern**:
   - **Optimal Apollo Cache**: Each component requests exactly what it needs
   - **Easy Maintenance**: GraphQL operations are co-located with components
   - **Better Performance**: Smaller queries = faster network requests
   - **Type Safety**: Full TypeScript support with hand-written types

### For Backend Developers

1. **Modify GraphQL schema** by updating NestJS resolvers and DTOs
2. **Update hand-written types** in `client/src/types/graphql.ts` to match
3. **Generate schema for reference** (optional): `npm -w backend run generate-schema`

### Schema Generation (Optional)

To generate a `schema.gql` file for reference/validation:

```bash
# Generate schema file for development reference
npm -w backend run generate-schema
```

**Note**: The generated `schema.gql` file is:
- ✅ For **development reference only**
- ✅ **Not used in builds**
- ✅ **Git-ignored** to prevent merge conflicts
- ✅ **Optional** - you don't need it to develop

## Type Safety

All GraphQL operations are fully typed:

```typescript
// Queries
const { data } = useQuery<GetDownloadGroupsQuery>(GET_DOWNLOAD_GROUPS);

// Mutations with variables
const [createGroup] = useMutation<
  CreateDownloadGroupMutation,
  CreateDownloadGroupMutationVariables
>(CREATE_DOWNLOAD_GROUP);

// Subscriptions
useSubscription<GroupProgressSubscription, GroupProgressSubscriptionVariables>(
  GROUP_PROGRESS
);
```

## Updating Types

When the backend GraphQL schema changes:

1. **Update the hand-written types** in `client/src/types/graphql.ts`
2. **Verify with schema generation** (optional): `npm -w backend run generate-schema`
3. **Update any affected GraphQL operations** in `client/src/graphql/`

## Co-Located GraphQL Examples

### Real Examples from the Project

**Downloads Scene** (`scenes/downloads/index.graphql.ts`):
```typescript
export const GET_DOWNLOAD_GROUPS = gql`
  query GetDownloadGroups {
    downloadGroups {
      id
      name
      status
      # ... only fields needed by Downloads component
    }
  }
`;
```

**Config Scene** (`scenes/config/index.graphql.ts`):
```typescript
export const GET_APP_CONFIG = gql`
  query GetAppConfig {
    appConfig {
      downloadPath
      maxConcurrentDownloads
      # ... only fields needed by Config component
    }
  }
`;
```

## Benefits Summary

| Aspect | Co-Located Hand-Written | Centralized Generated |
|--------|-------------------------|----------------------|
| Build Speed | ⚡ Fast | 🐌 Slow |
| CI/CD Complexity | ✅ Simple | 🔴 Complex |
| Merge Conflicts | ✅ None | 🔴 Frequent |
| Type Quality | ✅ Clean | ⚠️ Generated |
| Maintainability | ✅ High (co-located) | ⚠️ Medium |
| Apollo Cache Efficiency | ✅ Optimal | ⚠️ Over-fetching |
| Bundle Size | ✅ Tree-shakeable | ⚠️ All imported |
| Developer Experience | ✅ Excellent | ⚠️ Complex |

## Migration Strategy

When moving from centralized to co-located GraphQL:

1. **Identify component GraphQL needs**: What queries/mutations does each component actually use?
2. **Create `.graphql.ts` files**: Co-locate operations next to components
3. **Optimize field selection**: Only request fields the component needs
4. **Update imports**: Import from co-located files instead of centralized ones
5. **Remove unused operations**: Delete centralized files once migration is complete

This approach provides the **best developer experience** while maintaining full type safety, eliminating build complexity, and optimizing Apollo cache performance! 🚀