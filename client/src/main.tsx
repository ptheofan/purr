import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { RetryLink } from '@apollo/client/link/retry';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { MockProvider } from './providers/MockProvider';
import { isMockEnabled } from './config/mock';
import './utils/mock-utils'; // Initialize mock utilities

const envHttpUri = import.meta.env.VITE_HTTP_URI;
const wsHttpUri = import.meta.env.VITE_WS_URI;

const httpUri = envHttpUri === '' || !envHttpUri ? `${window.location.href}graphql` : envHttpUri;
const wsUri = wsHttpUri === '' || !wsHttpUri ? `${window.location.href.replace(/^http/, "ws")}graphql` : wsHttpUri;

const httpLink = new HttpLink({
  uri: httpUri,
});
const wsLink = new GraphQLWsLink(createClient({
  url: wsUri,
}));

const splitLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true
  },
  attempts: {
    max: 5,
    retryIf: (error) => !!error
  }
}).split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

// Create Apollo Client only if mock is not enabled
const client = !isMockEnabled() ? new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
}) : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MockProvider>
        {!isMockEnabled() && client ? (
          <ApolloProvider client={client}>
            <App />
          </ApolloProvider>
        ) : (
          <App />
        )}
      </MockProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
