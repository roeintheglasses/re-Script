#!/bin/bash

# Docker build script for re-Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BUILD_ENV="production"
PUSH_IMAGES="false"
REGISTRY=""
TAG="latest"

# Print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV          Build environment (development|production) [default: production]"
    echo "  -t, --tag TAG          Docker image tag [default: latest]"
    echo "  -r, --registry REGISTRY Docker registry to push to"
    echo "  -p, --push             Push images to registry after building"
    echo "  -h, --help             Display this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Build production images with 'latest' tag"
    echo "  $0 --env development                  # Build development images"
    echo "  $0 --tag v2.1.0 --registry my-registry.com --push"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            BUILD_ENV="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -p|--push)
            PUSH_IMAGES="true"
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option $1"
            usage
            ;;
    esac
done

# Validate environment
if [[ "$BUILD_ENV" != "development" && "$BUILD_ENV" != "production" ]]; then
    echo -e "${RED}Error: Environment must be 'development' or 'production'${NC}"
    exit 1
fi

# Set image names
if [[ -n "$REGISTRY" ]]; then
    WEB_UI_IMAGE="$REGISTRY/re-script-web-ui:$TAG"
    WEB_API_IMAGE="$REGISTRY/re-script-web-api:$TAG"
    CLI_IMAGE="$REGISTRY/re-script-cli:$TAG"
else
    WEB_UI_IMAGE="re-script-web-ui:$TAG"
    WEB_API_IMAGE="re-script-web-api:$TAG"
    CLI_IMAGE="re-script-cli:$TAG"
fi

echo -e "${YELLOW}Building re-Script Docker images...${NC}"
echo "Environment: $BUILD_ENV"
echo "Tag: $TAG"
echo "Registry: ${REGISTRY:-<none>}"
echo "Push: $PUSH_IMAGES"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Build function
build_image() {
    local name=$1
    local dockerfile=$2
    local image_name=$3
    
    echo -e "${YELLOW}Building $name...${NC}"
    
    if docker build -f "$dockerfile" -t "$image_name" .; then
        echo -e "${GREEN}✓ Successfully built $name${NC}"
    else
        echo -e "${RED}✗ Failed to build $name${NC}"
        exit 1
    fi
    
    # Show image size
    local size=$(docker images "$image_name" --format "table {{.Size}}" | tail -n1)
    echo -e "${GREEN}  Image size: $size${NC}"
    echo ""
}

# Push function
push_image() {
    local image_name=$1
    local name=$2
    
    echo -e "${YELLOW}Pushing $name...${NC}"
    
    if docker push "$image_name"; then
        echo -e "${GREEN}✓ Successfully pushed $name${NC}"
    else
        echo -e "${RED}✗ Failed to push $name${NC}"
        exit 1
    fi
    echo ""
}

# Build all images
echo -e "${YELLOW}Starting build process...${NC}"
echo ""

build_image "Web UI" "apps/web-ui/Dockerfile" "$WEB_UI_IMAGE"
build_image "Web API" "apps/web-api/Dockerfile" "$WEB_API_IMAGE"
build_image "CLI" "apps/cli/Dockerfile" "$CLI_IMAGE"

echo -e "${GREEN}✓ All images built successfully!${NC}"
echo ""

# List built images
echo "Built images:"
docker images --filter "reference=re-script-*:$TAG" --filter "reference=$REGISTRY/re-script-*:$TAG" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

# Push images if requested
if [[ "$PUSH_IMAGES" == "true" ]]; then
    if [[ -z "$REGISTRY" ]]; then
        echo -e "${RED}Error: Registry must be specified when pushing images${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Pushing images to registry...${NC}"
    echo ""
    
    push_image "$WEB_UI_IMAGE" "Web UI"
    push_image "$WEB_API_IMAGE" "Web API"
    push_image "$CLI_IMAGE" "CLI"
    
    echo -e "${GREEN}✓ All images pushed successfully!${NC}"
fi

echo -e "${GREEN}Build process completed!${NC}"

# Show next steps
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Start the services: docker-compose up -d"
echo "2. View logs: docker-compose logs -f"
echo "3. Access the web UI: http://localhost:3000"
echo "4. Access the API: http://localhost:3001"

if [[ "$PUSH_IMAGES" == "true" ]]; then
    echo ""
    echo -e "${YELLOW}Pushed images:${NC}"
    echo "- $WEB_UI_IMAGE"
    echo "- $WEB_API_IMAGE"
    echo "- $CLI_IMAGE"
fi