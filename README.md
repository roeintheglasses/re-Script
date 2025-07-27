# re-Script v2

> Advanced JavaScript unminifier and deobfuscator powered by AI

re-Script v2 is a complete rewrite of the original re-Script tool, featuring modern architecture, robust error handling, and support for multiple AI providers.

## ✨ Features

- 🤖 **Multi-LLM Support**: OpenAI, Anthropic, Ollama, Azure, Bedrock
- 🔄 **Resumable Processing**: Save progress and resume large jobs
- 📦 **Batch Processing**: Process multiple files/directories
- 🎯 **Smart Chunking**: AST-aware code splitting for optimal results
- 💾 **Intelligent Caching**: Reduce costs with smart response caching
- 🛡️ **Error Recovery**: Graceful degradation when steps fail
- ⚙️ **Flexible Configuration**: File-based config with CLI overrides
- 📊 **Progress Tracking**: Real-time progress with ETA
- 🧪 **Dry Run Mode**: Preview changes before applying
- 👀 **Watch Mode**: Real-time processing during development

## 🚀 Quick Start

### Installation

```bash
npm install -g re-script@2.0.0-alpha.1
```

### Basic Usage

```bash
# Process a single file
re-script app.min.js

# Process directory recursively
re-script src/ --recursive --output dist/

# Use specific provider and model
re-script app.min.js --provider anthropic --model claude-3-5-sonnet-20241022
```

### Configuration

Create a configuration file:

```bash
re-script config init
```

Edit `.rescriptrc.json`:

```json
{
  "provider": {
    "name": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "your-api-key-here",
    "temperature": 0.3,
    "maxTokens": 8192
  },
  "processing": {
    "concurrency": 5,
    "chunking": {
      "strategy": "ast-aware",
      "maxChunkSize": 4000
    },
    "caching": {
      "enabled": true,
      "ttl": 86400
    }
  }
}
```

## 📖 Usage Examples

### Basic Processing

```bash
# Single file
re-script bundle.min.js

# Multiple files
re-script file1.min.js file2.min.js

# Directory with pattern
re-script src/ --pattern "*.min.js" --recursive
```

### Advanced Options

```bash
# Dry run to preview changes
re-script app.min.js --dry-run

# Custom output location
re-script app.min.js --output app.readable.js

# Exclude patterns
re-script src/ --recursive --exclude "node_modules/**" "*.test.js"

# Watch mode for development
re-script src/ --watch --recursive

# High concurrency for large projects
re-script src/ --recursive --concurrency 10
```

### Provider-Specific Usage

```bash
# OpenAI
re-script app.min.js --provider openai --model gpt-4 --api-key sk-...

# Anthropic
re-script app.min.js --provider anthropic --model claude-3-5-sonnet-20241022

# Local Ollama
re-script app.min.js --provider ollama --model llama3:8b
OLLAMA_BASE_URL=http://localhost:11434 re-script app.min.js
```

## 🔧 Configuration

### Configuration File

re-Script looks for configuration in:
- `.rescriptrc.json`
- `.rescriptrc.yaml`
- `rescript.config.js`
- `package.json` (in `rescript` field)

### Environment Variables

```bash
export RESCRIPT_PROVIDER=anthropic
export ANTHROPIC_API_KEY=your-key-here
export RESCRIPT_MODEL=claude-3-5-sonnet-20241022
export RESCRIPT_TEMPERATURE=0.3
export RESCRIPT_CONCURRENCY=5
export RESCRIPT_DEBUG=true
```

### CLI Configuration Management

```bash
# Show current config
re-script config show

# Set values
re-script config set provider.name openai
re-script config set provider.model gpt-4

# Get values
re-script config get provider.name

# Validate config
re-script config validate

# List all available keys
re-script config list
```

## 🧪 Validation Tools

### Validate JavaScript Files

```bash
# Check syntax
re-script validate js app.min.js src/**/*.js

# Check if files are minified
re-script validate minified app.js app.min.js

# Check for obfuscation
re-script validate obfuscated suspicious.js

# Analyze complexity and estimate processing time/cost
re-script validate complexity large-file.js
```

## 🏗️ Architecture

re-Script v2 follows a modular pipeline architecture:

1. **Input Validation** - File discovery and syntax validation
2. **Webcrack Processing** - Reverse bundling and deobfuscation  
3. **Babel Transformations** - AST-based code improvements
4. **LLM Processing** - AI-powered variable/function renaming
5. **Code Formatting** - Final prettification and output

### Error Handling

- **Graceful Degradation**: Steps can fail without breaking the pipeline
- **Recovery Strategies**: Automatic fallbacks for common failures
- **Detailed Reporting**: Clear error messages with actionable suggestions
- **Resumable Jobs**: Save progress and continue from checkpoints

### Caching

- **Content-based Keys**: Cache responses based on code content
- **Multiple Backends**: Memory, file system, or Redis
- **TTL Management**: Configurable expiration times
- **Cost Optimization**: Reduce API calls and processing time

## 🔌 Providers

### OpenAI

```json
{
  "provider": {
    "name": "openai",
    "model": "gpt-4",
    "apiKey": "sk-...",
    "temperature": 0.3,
    "maxTokens": 8192
  }
}
```

Supported models: `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`

### Anthropic

```json
{
  "provider": {
    "name": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "sk-ant-...",
    "temperature": 0.3,
    "maxTokens": 8192
  }
}
```

Supported models: `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`

### Ollama (Local)

```json
{
  "provider": {
    "name": "ollama",
    "model": "llama3:8b",
    "baseUrl": "http://localhost:11434",
    "temperature": 0.3,
    "maxTokens": 8192
  }
}
```

Popular models: `llama3:8b`, `codellama:13b`, `mistral:7b`, `deepseek-coder:6.7b`

## 🧪 Development

### Building from Source

```bash
git clone https://github.com/roeintheglasses/re-Script.git
cd re-Script
npm install
npm run build
npm link
```

### Running Tests

```bash
npm test
npm run test:coverage
```

### Development Mode

```bash
npm run dev  # TypeScript watch mode
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
export RESCRIPT_LOG_LEVEL=debug
```

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/roeintheglasses/re-Script/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/roeintheglasses/re-Script/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/roeintheglasses/re-Script/wiki)

---

**Made with ❤️ by the re-Script team**