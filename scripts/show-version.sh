#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Not in a git repository${NC}" >&2
    exit 1
fi

# Get the latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
LATEST_VERSION="${LATEST_TAG#v}"

# Get package.json versions
ROOT_VERSION=$(node -p "require('./package.json').version")
BACKEND_VERSION=$(node -p "require('./backend/package.json').version")
CLIENT_VERSION=$(node -p "require('./client/package.json').version")

# Get all tags sorted by version
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Current Release Information${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "Latest Git Tag:      ${YELLOW}${LATEST_TAG}${NC}"
echo -e "Root package.json:   ${YELLOW}${ROOT_VERSION}${NC}"
echo -e "Backend:             ${YELLOW}${BACKEND_VERSION}${NC}"
echo -e "Client:              ${YELLOW}${CLIENT_VERSION}${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Recent Releases:${NC}"
git tag --sort=-version:refname | head -5 | while read -r tag; do
    commit_date=$(git log -1 --format=%ai "$tag" 2>/dev/null | cut -d' ' -f1)
    echo -e "  ${YELLOW}${tag}${NC} - ${commit_date}"
done
echo -e "${CYAN}═══════════════════════════════════════${NC}"