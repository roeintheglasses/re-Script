# re-Script

Advanced JavaScript unminifier and deobfuscator powered by AI.

re-Script transforms minified and obfuscated JavaScript into readable code using AI models like Claude, GPT-4, or local LLMs. It combines traditional tools like webcrack and Babel with intelligent variable renaming for optimal results.

## Features

- **Multi-LLM Support** - OpenAI, Anthropic, Ollama, Azure, Bedrock
- **Batch Processing** - Process multiple files or entire directories
- **Smart Chunking** - AST-aware code splitting for better results
- **Intelligent Caching** - Reduce costs with response caching
- **Error Recovery** - Graceful handling when steps fail
- **Flexible Config** - File-based configuration with CLI overrides
- **Progress Tracking** - Real-time progress with time estimates
- **Dry Run Mode** - Preview changes before applying
- **Watch Mode** - Process files as they change

```bash
npm install -g @roeintheglasses/re-script
```

## Usage

### Quick Start

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
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions welcome! Open an issue or submit a PR.

## Support

- **Issues**: [GitHub Issues](https://github.com/roeintheglasses/re-Script/issues)
- **Discussions**: [GitHub Discussions](https://github.com/roeintheglasses/re-Script/discussions)