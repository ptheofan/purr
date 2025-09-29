#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}INFO: $1${NC}"
}

# Function to compare semantic versions
# Returns: 0 if $1 > $2, 1 if $1 <= $2
version_greater_than() {
    local new_ver=$1
    local old_ver=$2

    # Split versions into arrays
    IFS='.' read -ra NEW <<< "$new_ver"
    IFS='.' read -ra OLD <<< "$old_ver"

    # Compare major
    if [ "${NEW[0]}" -gt "${OLD[0]}" ]; then return 0; fi
    if [ "${NEW[0]}" -lt "${OLD[0]}" ]; then return 1; fi

    # Compare minor
    if [ "${NEW[1]}" -gt "${OLD[1]}" ]; then return 0; fi
    if [ "${NEW[1]}" -lt "${OLD[1]}" ]; then return 1; fi

    # Compare patch
    if [ "${NEW[2]}" -gt "${OLD[2]}" ]; then return 0; fi

    return 1
}

# Check if version argument is provided
if [ -z "$1" ]; then
    print_error "Version number required"
    echo "Usage: $0 <version>"
    echo "Example: $0 1.0.3"
    exit 1
fi

VERSION=$1

# Validate version format (semantic versioning: X.Y.Z)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_error "Invalid version format: $VERSION"
    echo "Version must follow semantic versioning (e.g., 1.0.3)"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
fi

# Get the latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
LATEST_VERSION="${LATEST_TAG#v}"

print_info "Current version: $LATEST_VERSION"
print_info "New version: $VERSION"

# Check if tag already exists
TAG="v${VERSION}"
if git rev-parse "$TAG" >/dev/null 2>&1; then
    print_error "Tag $TAG already exists"
    exit 1
fi

# Validate that new version is greater than current version
if ! version_greater_than "$VERSION" "$LATEST_VERSION"; then
    print_error "New version $VERSION must be greater than current version $LATEST_VERSION"
    exit 1
fi

print_success "Version validation passed"

# Update package.json versions (root and all workspaces)
print_info "Updating package.json versions to $VERSION..."
npm version "$VERSION" --no-git-tag-version --workspaces
npm version "$VERSION" --no-git-tag-version --workspaces=false

# Commit the version bump
print_info "Committing version bump..."
git add package.json backend/package.json client/package.json
git commit -m "chore: bump version to $VERSION"

# Create and push the tag
print_info "Creating tag $TAG..."
git tag -a "$TAG" -m "Release $VERSION"

print_info "Pushing commit and tag to remote..."
git push origin master
git push origin "$TAG"

print_success "Release $VERSION created and pushed!"
print_info "GitHub Actions will now build and publish Docker images with tags:"
echo "  - purrito:$TAG"
echo "  - purrito:latest"