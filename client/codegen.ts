import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:3000/graphql',
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    './src/__generated__/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
        fragmentMasking: { unmaskFunctionName: 'getFragmentData' },
        dedupeFragments: true,
        strictScalars: true,
        scalars: {
          BigInt: 'string',
          DateTime: 'string'
        }
      },
      config: {
        useTypeImports: true,
        skipTypename: false,
        enumsAsTypes: true,
        maybeValue: 'T | null | undefined',
        inputMaybeValue: 'T | null | undefined',
        avoidOptionals: false,
        nonOptionalTypename: false
      }
    }
  },
  ignoreNoDocuments: true,
  hooks: {
    afterOneFileWrite: ['prettier --write']
  }
};

export default config;
