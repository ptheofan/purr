#!/bin/bash

# Test the container locally with .env file
# This script builds and runs the container with your .env configuration

set -e

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo ""
    echo "Please create a .env file from .env.example:"
    echo "  cp .env.example .env"
    echo ""
    echo "Then edit .env with your Put.io credentials:"
    echo "  - PUTIO_CLIENT_ID"
    echo "  - PUTIO_CLIENT_SECRET"
    echo "  - PUTIO_AUTH"
    exit 1
fi

# Check for required Put.io variables
if ! grep -q "PUTIO_CLIENT_ID=" .env || ! grep -q "PUTIO_CLIENT_SECRET=" .env || ! grep -q "PUTIO_AUTH=" .env; then
    echo "⚠️  Warning: Put.io credentials might not be configured in .env"
    echo "Make sure you have set:"
    echo "  - PUTIO_CLIENT_ID"
    echo "  - PUTIO_CLIENT_SECRET"
    echo "  - PUTIO_AUTH"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🔨 Building Docker image..."
docker build -t purr-local:dev .

echo ""
echo "🚀 Starting container with .env variables..."
echo ""

# Stop any existing container
docker-compose down 2>/dev/null || true

# Start the container with logs
docker-compose up