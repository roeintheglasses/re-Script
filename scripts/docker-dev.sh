#!/bin/bash

# Docker development script for re-Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
COMMAND=""
SERVICES=""
WITH_GUI="false"
WITH_DB="false"
WITH_LOCAL_LLM="false"

# Print usage
usage() {
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  up            Start development services"
    echo "  down          Stop and remove development services"
    echo "  restart       Restart development services"
    echo "  logs          Show service logs"
    echo "  ps            Show running services"
    echo "  clean         Clean up development environment"
    echo "  setup         Initial setup for development"
    echo ""
    echo "Options:"
    echo "  --with-gui           Include Redis Commander and pgAdmin"
    echo "  --with-db            Include PostgreSQL database"
    echo "  --with-local-llm     Include Ollama for local LLM processing"
    echo "  --services SERVICES  Specify specific services to target"
    echo "  -h, --help           Display this help message"
    echo ""
    echo "Examples:"
    echo "  $0 up                           # Start basic development services"
    echo "  $0 up --with-gui --with-db      # Start with GUI tools and database"
    echo "  $0 logs --services web-api      # Show logs for web-api service"
    echo "  $0 setup                        # Initial development setup"
    exit 1
}

# Parse command line arguments
if [[ $# -eq 0 ]]; then
    usage
fi

COMMAND=$1
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        --with-gui)
            WITH_GUI="true"
            shift
            ;;
        --with-db)
            WITH_DB="true"
            shift
            ;;
        --with-local-llm)
            WITH_LOCAL_LLM="true"
            shift
            ;;
        --services)
            SERVICES="$2"
            shift 2
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

# Build Docker Compose command
COMPOSE_CMD="docker-compose -f docker-compose.dev.yml"

# Add profiles based on options
PROFILES=()
if [[ "$WITH_GUI" == "true" ]]; then
    PROFILES+=("with-gui")
fi
if [[ "$WITH_DB" == "true" ]]; then
    PROFILES+=("with-db")
fi

# Build profiles argument
PROFILES_ARG=""
for profile in "${PROFILES[@]}"; do
    PROFILES_ARG="$PROFILES_ARG --profile $profile"
done

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running${NC}"
        exit 1
    fi
}

# Setup development environment
setup_dev() {
    echo -e "${YELLOW}Setting up development environment...${NC}"
    
    # Create necessary directories
    mkdir -p logs uploads workspace
    
    # Create .env.local if it doesn't exist
    if [[ ! -f .env.local ]]; then
        echo -e "${YELLOW}Creating .env.local file...${NC}"
        cat > .env.local << 'EOF'
# Development environment variables
NODE_ENV=development

# API Configuration
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000

# LLM Provider API Keys (add your keys here)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://rescript:rescript_dev_password@localhost:5432/rescript_dev

# Development settings
LOG_LEVEL=debug
ENABLE_SWAGGER=true
EOF
        echo -e "${GREEN}✓ Created .env.local${NC}"
        echo -e "${YELLOW}Please edit .env.local and add your API keys${NC}"
    fi
    
    echo -e "${GREEN}✓ Development setup complete${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Edit .env.local and add your LLM provider API keys"
    echo "2. Run: $0 up --with-gui --with-db"
    echo "3. Access services:"
    echo "   - Redis Commander: http://localhost:8081"
    echo "   - pgAdmin: http://localhost:8080"
    echo "   - Ollama: http://localhost:11434"
}

# Start services
start_services() {
    echo -e "${YELLOW}Starting development services...${NC}"
    
    if [[ "$WITH_LOCAL_LLM" == "true" ]]; then
        PROFILES_ARG="$PROFILES_ARG --profile local-llm"
    fi
    
    eval "$COMPOSE_CMD $PROFILES_ARG up -d $SERVICES"
    
    echo -e "${GREEN}✓ Services started${NC}"
    
    # Show running services
    echo -e "${BLUE}Running services:${NC}"
    eval "$COMPOSE_CMD ps"
    
    # Show access information
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo "- Redis: localhost:6379"
    if [[ "$WITH_GUI" == "true" ]]; then
        echo "- Redis Commander: http://localhost:8081"
    fi
    if [[ "$WITH_DB" == "true" ]]; then
        echo "- PostgreSQL: localhost:5432"
        if [[ "$WITH_GUI" == "true" ]]; then
            echo "- pgAdmin: http://localhost:8080 (admin@rescript.dev / admin)"
        fi
    fi
    if [[ "$WITH_LOCAL_LLM" == "true" ]]; then
        echo "- Ollama: http://localhost:11434"
    fi
}

# Stop services
stop_services() {
    echo -e "${YELLOW}Stopping development services...${NC}"
    eval "$COMPOSE_CMD $PROFILES_ARG down $SERVICES"
    echo -e "${GREEN}✓ Services stopped${NC}"
}

# Restart services
restart_services() {
    echo -e "${YELLOW}Restarting development services...${NC}"
    eval "$COMPOSE_CMD $PROFILES_ARG restart $SERVICES"
    echo -e "${GREEN}✓ Services restarted${NC}"
}

# Show logs
show_logs() {
    if [[ -n "$SERVICES" ]]; then
        eval "$COMPOSE_CMD logs -f $SERVICES"
    else
        eval "$COMPOSE_CMD logs -f"
    fi
}

# Show running services
show_status() {
    echo -e "${BLUE}Development services status:${NC}"
    eval "$COMPOSE_CMD ps"
    
    echo ""
    echo -e "${BLUE}Docker containers:${NC}"
    docker ps --filter "name=re-script-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Clean up development environment
clean_dev() {
    echo -e "${YELLOW}Cleaning up development environment...${NC}"
    
    # Stop and remove containers
    eval "$COMPOSE_CMD --profile with-gui --profile with-db --profile local-llm down -v --remove-orphans"
    
    # Remove development images
    echo -e "${YELLOW}Removing development images...${NC}"
    docker images --filter "reference=re-script-*" -q | xargs -r docker rmi
    
    # Clean up volumes (optional)
    read -p "Remove development data volumes? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
        echo -e "${GREEN}✓ Volumes cleaned${NC}"
    fi
    
    echo -e "${GREEN}✓ Development environment cleaned${NC}"
}

# Main execution
check_docker

case $COMMAND in
    up)
        start_services
        ;;
    down)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    ps|status)
        show_status
        ;;
    clean)
        clean_dev
        ;;
    setup)
        setup_dev
        ;;
    *)
        echo "Unknown command: $COMMAND"
        usage
        ;;
esac