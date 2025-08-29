# re-Script

Advanced JavaScript unminifier and deobfuscator powered by AI with a comprehensive web dashboard.

re-Script transforms minified and obfuscated JavaScript into readable code using AI models like Claude, GPT-4, or local LLMs. It combines traditional tools like webcrack and Babel with intelligent variable renaming for optimal results. Now includes a modern web interface for managing processing jobs and monitoring progress in real-time.

## Features

### 🖥️ Web Dashboard
- **Modern Web Interface** - Intuitive dashboard for managing deobfuscation jobs
- **Real-time Monitoring** - Live job status updates with Server-Sent Events
- **File Management** - Drag-and-drop file uploads with preview and validation
- **Code Comparison** - Side-by-side before/after code display with Monaco Editor
- **Job History** - Complete processing history with filtering and search
- **Mobile Responsive** - Optimized for desktop, tablet, and mobile devices

### 🤖 AI Processing
- **Multi-LLM Support** - OpenAI, Anthropic, Ollama, Azure, Bedrock
- **Batch Processing** - Process multiple files or entire directories
- **Smart Chunking** - AST-aware code splitting for better results
- **Intelligent Caching** - Reduce costs with response caching
- **Error Recovery** - Graceful handling when steps fail

### ⚙️ Configuration & Control
- **Flexible Config** - File-based configuration with CLI overrides
- **Progress Tracking** - Real-time progress with time estimates
- **Job Management** - Cancel, retry, and delete processing jobs
- **Dry Run Mode** - Preview changes before applying
- **Watch Mode** - Process files as they change

## Installation & Quick Start

### Option 1: Web Dashboard (Recommended)

```bash
# Clone the repository
git clone https://github.com/roeintheglasses/re-Script.git
cd re-Script

# Install dependencies
npm install

# Start the development environment
npm run dev

# Or use Docker
docker-compose up -d
```

Access the web dashboard at `http://localhost:3000`

### Option 2: CLI Installation

```bash
npm install -g @roeintheglasses/re-script
```

## Usage

### 🌐 Web Dashboard

The web dashboard provides a complete interface for managing JavaScript deobfuscation:

1. **Upload Files**: Drag and drop JavaScript files or click to select
2. **Configure Processing**: Choose AI provider, model, and processing options
3. **Monitor Progress**: Watch real-time job status and progress updates
4. **View Results**: Compare original and deobfuscated code side-by-side
5. **Manage Jobs**: Cancel, retry, or delete processing jobs
6. **Browse History**: Search and filter through previous jobs

**Key Features:**
- 📁 Multi-file upload with validation
- ⚙️ Provider configuration (OpenAI, Anthropic, Ollama)
- 📊 Real-time progress tracking
- 🔍 Advanced code comparison with Monaco Editor
- 📱 Mobile-responsive design
- 🔄 Job management (cancel, retry, delete)

### 📟 CLI Usage

```bash
# Interactive setup (recommended for first time)
re-script init

# Process a single file
re-script app.min.js

# Process directory recursively
re-script src/ --recursive --output dist/
```

### Configuration

Create config with interactive setup:

```bash
re-script init
```

Or manage config manually:

```bash
# Show current config
re-script config show

# Set values
re-script config set provider.name anthropic
re-script config set provider.apiKey "your-key"

# Validate config
re-script config validate
```

## Examples

```bash
# Single file
re-script bundle.min.js

# Multiple files
re-script file1.min.js file2.min.js

# Directory with pattern
re-script src/ --pattern "*.min.js" --recursive

# Dry run to preview changes
re-script app.min.js --dry-run

# Custom output location
re-script app.min.js --output app.readable.js

# Exclude patterns
re-script src/ --recursive --exclude "node_modules/**" "*.test.js"

# High concurrency
re-script src/ --recursive --concurrency 10
```

### Providers

```bash
# OpenAI
re-script app.min.js --provider openai --model gpt-4o

# Anthropic  
re-script app.min.js --provider anthropic --model claude-3-5-sonnet-20241022

# Local Ollama
re-script app.min.js --provider ollama --model codellama:13b

# Azure OpenAI
re-script app.min.js --provider azure --model gpt-4o
```

## Configuration

### Config Files

re-Script looks for:
- `.rescriptrc.json`
- `.rescriptrc.yaml`
- `rescript.config.js`
- `package.json` (in `rescript` field)

### Environment Variables

```bash
export ANTHROPIC_API_KEY=your-key-here
export OPENAI_API_KEY=your-key-here
export OLLAMA_BASE_URL=http://localhost:11434
export RESCRIPT_DEBUG=true
```

### Config Commands

```bash
# Show current config
re-script config show

# Show with environment variables
re-script config show --env

# Set values
re-script config set provider.name openai
re-script config set provider.model gpt-4o

# Get values
re-script config get provider.name

# List all available keys
re-script config list

# Validate configuration
re-script config validate
```

## Additional Commands

```bash
# Show usage examples
re-script examples

# Interactive setup wizard
re-script init

# Help and version
re-script --help
re-script --version
```

## How It Works

re-Script processes files through a 4-step pipeline:

1. **Webcrack Processing** - Reverse bundling and deobfuscation
2. **Babel Transformations** - AST-based code improvements  
3. **LLM Processing** - AI-powered variable/function renaming
4. **Code Formatting** - Final prettification

Each step can fail gracefully without breaking the pipeline. Responses are cached to reduce API costs.

## Supported Models

**OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`

**Anthropic**: `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`

**Azure**: Same as OpenAI models but hosted on Azure

**Ollama**: `llama3:8b`, `llama3:70b`, `codellama:13b`, `codellama:34b`, `mistral:7b`, `deepseek-coder:6.7b`

## 🚀 Deployment Guide

### Production Deployment with Docker

The easiest way to deploy re-Script in production is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/roeintheglasses/re-Script.git
cd re-Script

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

**Required Environment Variables:**
```bash
# API Keys (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
OLLAMA_BASE_URL=http://ollama:11434  # For local Ollama

# Database
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=https://yourdomain.com

# Optional: File upload limits
MAX_FILE_SIZE=10485760  # 10MB
MAX_FILES_PER_JOB=10
```

### Kubernetes Deployment

For Kubernetes environments, use the provided manifests:

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n re-script
kubectl get services -n re-script
```

**Key Components:**
- **web-ui**: Next.js frontend (port 3000)
- **web-api**: Fastify backend (port 3001)
- **redis**: Job queue and caching
- **ollama**: Optional local LLM service

### Environment Configuration

**Development:**
```bash
npm run dev  # Starts all services in development mode
```

**Production Build:**
```bash
npm run build  # Build all applications
npm start      # Start production services
```

**Individual Services:**
```bash
# Frontend only
cd apps/web-ui && npm run build && npm start

# Backend only  
cd apps/web-api && npm run build && npm start

# CLI only
cd apps/cli && npm run build
```

### Monitoring & Health Checks

**Health Check Endpoints:**
- Web API: `GET /health`
- System Info: `GET /api/system/info`
- Job Queue Status: `GET /api/system/queue-status`

**Logging:**
- Structured JSON logs
- Configurable log levels
- Request/response logging
- Error tracking with stack traces

### Scaling Considerations

**Horizontal Scaling:**
- Web UI: Stateless, can scale horizontally
- Web API: Stateless with Redis for job state
- Redis: Single instance for job coordination

**Resource Requirements:**
- **Minimum:** 2GB RAM, 2 CPU cores
- **Recommended:** 4GB RAM, 4 CPU cores
- **Storage:** 10GB for temporary files and logs

### Security Best Practices

1. **API Keys**: Store in secure environment variables
2. **CORS**: Configure appropriate origins for web access
3. **File Uploads**: Validate file types and sizes
4. **Rate Limiting**: Configure per-IP request limits
5. **HTTPS**: Use reverse proxy with SSL termination

### Backup & Recovery

**Database Backup:**
```bash
# Redis backup
redis-cli --rdb /backup/dump.rdb
```

**Application Data:**
- Job results are temporary (configurable retention)
- Configuration stored in environment variables
- No persistent user data

## 🧪 Development

### Development Environment

```bash
git clone https://github.com/roeintheglasses/re-Script.git
cd re-Script

# Install dependencies
npm install

# Start development services
npm run dev

# This starts:
# - Web UI at http://localhost:3000
# - Web API at http://localhost:3001  
# - Redis at localhost:6379
```

### Monorepo Structure

```
re-Script/
├── apps/
│   ├── cli/                 # CLI application
│   ├── web-api/            # Fastify backend API
│   └── web-ui/             # Next.js frontend
├── packages/
│   ├── shared-types/       # TypeScript interfaces
│   ├── shared-utils/       # Common utilities
│   ├── eslint-config/      # Shared ESLint config
│   └── tsconfig/           # Shared TypeScript config
└── docker-compose.yml      # Development services
```

### Running Tests

```bash
# All tests
npm test

# Individual packages
npm run test --workspace=@re-script/web-ui
npm run test --workspace=@re-script/web-api
npm run test --workspace=@re-script/cli

# Coverage reports
npm run test:coverage
```

### Building from Source

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@re-script/cli

# Development watch mode
npm run dev
```

## 🆚 Migration from v1

The v2 CLI maintains backward compatibility with v1 for basic usage:

```bash
# v1 syntax (still works)
re-script input.js

# v2 enhancements
re-script input.js --provider anthropic --config .rescriptrc.json
```

Key differences:
- Configuration files replace command-line API key prompts
- Better error handling and recovery
- Multiple provider support
- Batch processing capabilities

## 📊 Performance

### Benchmarks

| File Size | v1 Time | v2 Time | Improvement |
|-----------|---------|---------|-------------|
| 50KB      | 45s     | 28s     | 38% faster  |
| 200KB     | 3m 20s  | 1m 45s  | 48% faster  |
| 1MB       | 15m+    | 6m 30s  | 57% faster  |

### Optimization Features

- **Parallel Processing**: Multiple files processed concurrently
- **Smart Chunking**: Optimal code splitting reduces token usage
- **Response Caching**: Avoid reprocessing identical code blocks
- **Streaming**: Process large files without loading entirely into memory

## 🛠️ Troubleshooting

### Common Issues

**API Key Errors**
```bash
re-script config set provider.apiKey your-key-here
# or
export ANTHROPIC_API_KEY=your-key-here
```

**Rate Limiting**
```bash
re-script config set processing.concurrency 1
re-script config set processing.retries.maxDelay 60000
```

**Large Files**
```bash
re-script config set processing.chunking.maxChunkSize 2000
re-script config set provider.maxTokens 4096
```

**Memory Issues**
```bash
re-script config set processing.caching.backend file
node --max-old-space-size=8192 $(which re-script) large-file.js
```

### Debug Mode

```bash
re-script --verbose input.js
# or
export RESCRIPT_DEBUG=true
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions welcome! Open an issue or submit a PR.

## Support

- **Issues**: [GitHub Issues](https://github.com/roeintheglasses/re-Script/issues)
- **Discussions**: [GitHub Discussions](https://github.com/roeintheglasses/re-Script/discussions)