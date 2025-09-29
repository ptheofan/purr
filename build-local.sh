#!/bin/bash

# Build and run the container locally for testing
# This mimics what happens in GitHub Actions

set -e

echo "🔨 Building Docker image locally..."
docker build -t purr-local:dev .

echo ""
echo "✅ Build complete!"
echo ""
echo "To run the container with your .env file:"
echo "  docker-compose up"
echo ""
echo "Or to run with specific environment variables:"
echo "  docker run --env-file .env -p 3000:3000 purr-local:dev"
echo ""
echo "To run in detached mode:"
echo "  docker-compose up -d"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"