FROM node:20.11-alpine AS builder

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

# Build the client (Vite)
RUN npm -w client run build

# Build the backend
RUN npm -w backend run build


# Stage 2: Create final image
FROM node:20.11-alpine

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
