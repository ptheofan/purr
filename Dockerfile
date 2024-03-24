FROM node:20.11-alpine AS builder

# Stage 1: Fetch the dependencies
WORKDIR /src

# Copy only package-lock.json to leverage caching
COPY ./package-lock.json ./package.json ./
COPY ./backend/package.json ./backend/package.json
COPY ./client/package.json ./client/package.json

# Install dependencies
RUN npm ci

# Copy the rest of the monorepo (excluded patterns are in .dockerignore)
COPY ./ .

# Build the backend
RUN npm -w backend run build


# Stage 2: Create final image
FROM node:20.11-alpine

WORKDIR /app

# Copy built backend from previous stage
COPY --from=builder /src/backend/dist .
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/backend/node_modules ./node_modules

# Prepare the entrypoint
COPY ./entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Expose the port the app runs on
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

# Run via entrypoint
CMD ["/app/entrypoint.sh", "node", "dist/main"]
