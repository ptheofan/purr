FROM node:24.6.0-alpine AS builder

# Stage 1: Fetch the dependencies
WORKDIR /src

# Copy only package-lock.json to leverage caching
COPY ./package-lock.json ./package.json ./
COPY ./backend/package.json ./backend/package.json
COPY ./client/package.json ./client/package.json

# Install dependencies
RUN npm ci

# Copy the rest of the monorepo
COPY ./ .

# First build the backend
RUN npm -w backend run build

# Install curl for health checks
RUN apk add --no-cache curl

# Start backend, generate GraphQL types, then stop
RUN NODE_ENV=production \
    PUTIO_CLIENT_ID=1234 \
    PUTIO_CLIENT_SECRET=dummy_secret \
    PUTIO_AUTH=dummy_auth \
    WATCHER_ENABLED=false \
    DOWNLOADER_ENABLED=false \
    PUTIO_ENABLE_SOCKET=false \
    PUTIO_CHECK_AT_STARTUP=false \
    npm run backend & \
    BACKEND_PID=$! && \
    echo "Waiting for backend server to start..." && \
    for i in $(seq 1 60); do \
        if curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"query":"query { appConfig { version } }"}' \
            http://localhost:3000/graphql | grep -q "version"; then \
            echo "GraphQL endpoint is ready and responding"; \
            break; \
        fi; \
        echo "Waiting for GraphQL endpoint... ($i/60)"; \
        sleep 2; \
    done && \
    npm run codegen && \
    kill $BACKEND_PID || true && \
    sleep 2

# Build the client (Vite)
RUN npm -w client run build


# Stage 2: Create final image
FROM node:24.6.0-alpine

# Keep the same structure as dev
WORKDIR /src

# Copy built backend maintaining structure
COPY --from=builder /src/backend/dist ./backend/dist
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/backend/node_modules ./backend/node_modules

# Copy Vite built client files to where NestJS expects them
COPY --from=builder /src/client/dist ./backend/dist/app/client

# Copy and prepare the entrypoint
COPY ./entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expose the port the app runs on
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

# Use entrypoint with correct path
CMD ["./entrypoint.sh", "node", "backend/dist/main"]
