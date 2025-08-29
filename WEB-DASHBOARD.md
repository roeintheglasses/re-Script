# re-Script Web Dashboard Guide

The re-Script Web Dashboard provides a modern, intuitive interface for managing JavaScript deobfuscation jobs with real-time monitoring and comprehensive job management capabilities.

## 🌟 Features Overview

### 📁 File Management
- **Drag & Drop Upload**: Simply drag JavaScript files into the upload area
- **Multi-file Support**: Process multiple files in a single job  
- **File Validation**: Automatic validation for file types (.js, .mjs, .cjs) and size limits
- **File Preview**: See file details before processing

### ⚙️ AI Configuration
- **Multiple Providers**: Choose from Anthropic Claude, OpenAI GPT, or local Ollama models
- **Model Selection**: Pick the best model for your use case
- **Processing Options**: Configure deobfuscation pipeline steps
- **Custom Settings**: Adjust temperature, token limits, and other parameters

### 📊 Real-time Monitoring  
- **Live Updates**: Watch job progress in real-time with Server-Sent Events
- **Status Indicators**: Clear visual feedback on job status (queued, running, completed, failed)
- **Progress Tracking**: Detailed progress bars showing current processing step
- **Connection Status**: Monitor real-time connection health

### 🔍 Code Analysis
- **Monaco Editor**: Professional code editor with syntax highlighting
- **Side-by-side Comparison**: Compare original and deobfuscated code
- **Multiple View Modes**: Switch between split view, original only, or processed only
- **Code Statistics**: File size comparison and compression ratios

### 📋 Job Management
- **Job History**: Complete history of all processing jobs with search and filtering
- **Job Controls**: Cancel running jobs, retry failed ones, or delete completed jobs
- **Advanced Filtering**: Filter by status, date range, file names, or provider
- **Export Functionality**: Export job results in various formats

### 📱 Responsive Design
- **Mobile Optimized**: Works seamlessly on phones, tablets, and desktops
- **Touch-friendly**: Optimized for touch interactions on mobile devices
- **Adaptive Layout**: Interface adapts to screen size and orientation

## 🚀 Getting Started

### Prerequisites

1. **Node.js 18+** installed
2. **Redis** for job queue (or Docker)
3. **API Keys** for at least one AI provider

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/roeintheglasses/re-Script.git
cd re-Script

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration (add your API keys)
nano .env

# Start development services
npm run dev
```

The web dashboard will be available at `http://localhost:3000`

### Docker Setup

```bash
# Start all services with Docker Compose
docker-compose up -d

# Check service status
docker-compose ps
```

## 🖥️ Dashboard Interface

### Main Dashboard
- **Upload Area**: Central file upload with drag-and-drop support
- **Job Queue**: Live view of active and queued jobs
- **Quick Stats**: Overview of processing statistics
- **Recent Jobs**: Quick access to recent processing results

### Job Upload Flow

1. **Select Files**: Drag and drop or click to select JavaScript files
2. **Configure Processing**: 
   - Choose AI provider (Anthropic, OpenAI, or Ollama)
   - Select model (e.g., Claude 3.5 Sonnet, GPT-4)
   - Configure processing steps
3. **Submit Job**: Click "Start Processing" to begin deobfuscation
4. **Monitor Progress**: Watch real-time updates on job status and progress
5. **View Results**: Compare original and processed code side-by-side

### Job Details Page

- **File Overview**: List of files in the job with processing status
- **Configuration**: View the processing configuration used
- **Progress Timeline**: Detailed progress through each processing step
- **Code Comparison**: Side-by-side view of original vs deobfuscated code
- **Logs**: Processing logs and any error messages
- **Actions**: Retry, cancel, or delete job

### Job History

- **Searchable List**: Find jobs by name, ID, or status
- **Advanced Filters**: Filter by date range, provider, status, or file type
- **Bulk Actions**: Select multiple jobs for batch operations
- **Export Options**: Download results or export job metadata
- **Pagination**: Navigate through large job histories

## ⚙️ Configuration

### Environment Variables

The web dashboard uses the following key environment variables:

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_MAX_FILES_PER_JOB=10

# Providers
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
OLLAMA_BASE_URL=http://localhost:11434
```

### Provider Configuration

#### Anthropic Claude
- **Best for**: High-quality deobfuscation with excellent variable naming
- **Models**: Claude 3.5 Sonnet (recommended), Claude 3 Haiku (faster)
- **Setup**: Requires `ANTHROPIC_API_KEY` environment variable

#### OpenAI GPT
- **Best for**: Fast processing with good results
- **Models**: GPT-4 (best quality), GPT-3.5-turbo (faster)
- **Setup**: Requires `OPENAI_API_KEY` environment variable

#### Ollama (Local)
- **Best for**: Privacy-focused processing without API costs
- **Models**: CodeLlama, Llama 3, Mistral
- **Setup**: Requires local Ollama installation

### Processing Pipeline

The dashboard allows configuration of the processing pipeline:

1. **Webcrack**: Reverse bundling and initial deobfuscation
2. **Babel**: AST-based code transformations
3. **LLM**: AI-powered variable and function renaming
4. **Prettier**: Final code formatting

Each step can be enabled/disabled based on your needs.

## 🔧 Advanced Features

### Real-time Updates

The dashboard uses Server-Sent Events for real-time updates:
- **Job Status**: Live status changes (queued → running → completed)
- **Progress**: Real-time progress bars and step indicators
- **Results**: Immediate notification when processing completes
- **Errors**: Instant error reporting and retry suggestions

### Mobile Experience

- **Responsive Layout**: Automatically adapts to screen size
- **Touch Gestures**: Swipe navigation and touch-friendly controls
- **Mobile Sidebar**: Collapsible navigation optimized for mobile
- **File Upload**: Works with mobile camera and file system

### Accessibility

- **Keyboard Navigation**: Full keyboard support for all features
- **Screen Reader**: ARIA labels and semantic HTML
- **High Contrast**: Supports system dark/light mode preferences
- **Focus Management**: Proper focus handling for modal dialogs

## 📊 Monitoring & Analytics

### Job Statistics
- **Processing Time**: Average and median processing times
- **Success Rate**: Percentage of jobs completed successfully
- **File Sizes**: Input vs output size comparisons
- **Provider Usage**: Usage statistics per AI provider

### Performance Metrics
- **Queue Depth**: Number of jobs waiting to be processed
- **Active Jobs**: Currently processing jobs
- **Throughput**: Jobs processed per hour/day
- **Error Rates**: Failed job percentages and common errors

### System Health
- **Connection Status**: Real-time connection to backend API
- **Service Status**: Health of Redis, API server, and job processors
- **Resource Usage**: Memory and CPU utilization (if enabled)

## 🛠️ Troubleshooting

### Common Issues

**Upload Fails**
- Check file size limits (default 10MB)
- Verify file types (.js, .mjs, .cjs only)
- Ensure stable internet connection

**Processing Stuck**
- Check AI provider API key validity
- Verify provider service status
- Check job timeout settings

**Real-time Updates Not Working**
- Verify Server-Sent Events support in browser
- Check network firewalls/proxies
- Refresh browser connection

**Mobile Issues**
- Clear browser cache
- Check mobile data/wifi connection
- Try desktop browser to isolate issue

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment variables
DEBUG=re-script:*
RESCRIPT_DEBUG=true
LOG_LEVEL=debug
```

### Browser Support

- **Chrome**: 90+ (recommended)
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🎯 Best Practices

### File Organization
- Use descriptive file names
- Keep files under size limits
- Batch related files in single jobs

### Provider Selection
- **Claude**: Best for complex, heavily obfuscated code
- **GPT-4**: Good balance of speed and quality
- **Ollama**: For privacy-sensitive or offline processing

### Job Management
- Regularly clean up old jobs
- Monitor processing costs (for API providers)
- Use appropriate timeouts for large files

### Performance Optimization
- Process files during off-peak hours
- Use smaller concurrency for better quality
- Enable caching for repeated processing

## 🔐 Security Considerations

### Data Privacy
- Files are temporarily stored during processing
- Automatic cleanup after job completion
- No persistent storage of sensitive code

### API Keys
- Store keys in environment variables only
- Never commit keys to version control
- Use provider-specific key restrictions when available

### Access Control
- Consider implementing authentication for production
- Use HTTPS in production environments
- Configure CORS origins appropriately

## 📈 Future Features

### Planned Enhancements
- **Batch Processing**: Upload and process multiple jobs simultaneously
- **API Integration**: Full REST API for programmatic access
- **Custom Models**: Support for fine-tuned models
- **Collaboration**: Team workspaces and shared job history
- **Advanced Analytics**: Detailed processing insights and reporting

### Integration Options
- **CI/CD Pipelines**: Automated processing in build workflows
- **IDE Extensions**: Direct integration with code editors
- **Webhook Support**: Real-time notifications to external systems
- **Export Formats**: Multiple output formats (JSON, ZIP, etc.)

## 🤝 Community & Support

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Community support and questions
- **Documentation**: Comprehensive guides and API references
- **Examples**: Sample configurations and use cases

The re-Script Web Dashboard makes JavaScript deobfuscation accessible and efficient with a modern, user-friendly interface. Whether you're processing a single file or managing hundreds of deobfuscation jobs, the dashboard provides the tools you need for successful code analysis.