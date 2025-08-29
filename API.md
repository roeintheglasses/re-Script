# re-Script API Documentation

The re-Script Web API provides RESTful endpoints and real-time features for JavaScript deobfuscation jobs.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: Configure with your domain

## Authentication

Currently, the API operates without authentication for simplicity. In production, consider implementing:
- API key authentication
- JWT tokens
- Rate limiting per IP

## API Endpoints

### Health & System

#### `GET /health`
Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

#### `GET /api/system/info`
Get system information and service status.

**Response:**
```json
{
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "redis": "connected",
    "queue": "active"
  },
  "stats": {
    "totalJobs": 150,
    "activeJobs": 5,
    "completedJobs": 120,
    "failedJobs": 25
  }
}
```

#### `GET /api/system/queue-status`
Get job queue status and metrics.

**Response:**
```json
{
  "queue": {
    "name": "javascript-processing",
    "active": 2,
    "waiting": 8,
    "completed": 156,
    "failed": 12,
    "delayed": 0,
    "paused": false
  },
  "workers": 4,
  "processingRate": {
    "perMinute": 12.5,
    "perHour": 750
  }
}
```

### Job Management

#### `POST /api/jobs/upload`
Create a new processing job with file upload.

**Content-Type**: `multipart/form-data`

**Form Fields:**
- `files[]`: JavaScript files to process (required)
- `config`: JSON configuration object (required)

**Config Object:**
```json
{
  "provider": {
    "name": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "optional-override"
  },
  "processing": {
    "steps": ["webcrack", "babel", "llm", "prettier"],
    "concurrency": 1,
    "timeout": 300000
  },
  "options": {
    "preserveComments": true,
    "formatOutput": true
  }
}
```

**Response:**
```json
{
  "job": {
    "id": "job_abc123def456",
    "status": "queued",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "files": [
      {
        "id": "file_123",
        "originalName": "app.min.js",
        "size": 15420,
        "type": "application/javascript"
      }
    ],
    "config": { ... },
    "estimatedDuration": 45000
  }
}
```

#### `GET /api/jobs`
List all jobs with optional filtering.

**Query Parameters:**
- `status`: Filter by job status (`queued`, `running`, `completed`, `failed`)
- `limit`: Number of jobs to return (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)
- `search`: Search in job IDs or file names
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)

**Response:**
```json
{
  "jobs": [
    {
      "id": "job_abc123def456",
      "status": "completed",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "completedAt": "2024-01-01T12:01:30.000Z",
      "files": [...],
      "progress": {
        "percentage": 100,
        "currentStep": "completed",
        "completedSteps": 4,
        "totalSteps": 4
      },
      "results": {
        "outputFiles": ["app.deobfuscated.js"],
        "stats": {
          "processingTime": 90000,
          "inputSize": 15420,
          "outputSize": 42150
        }
      }
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### `GET /api/jobs/{jobId}`
Get details for a specific job.

**Path Parameters:**
- `jobId`: Unique job identifier

**Response:**
```json
{
  "job": {
    "id": "job_abc123def456",
    "status": "completed",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "completedAt": "2024-01-01T12:01:30.000Z",
    "files": [
      {
        "id": "file_123",
        "originalName": "app.min.js",
        "size": 15420,
        "type": "application/javascript",
        "processed": true,
        "outputPath": "/tmp/processed/app.deobfuscated.js"
      }
    ],
    "config": { ... },
    "progress": {
      "percentage": 100,
      "currentStep": "completed",
      "completedSteps": 4,
      "totalSteps": 4
    },
    "results": {
      "outputFiles": ["app.deobfuscated.js"],
      "errors": [],
      "stats": {
        "processingTime": 90000,
        "inputSize": 15420,
        "outputSize": 42150
      }
    },
    "logs": [
      {
        "timestamp": "2024-01-01T12:00:15.000Z",
        "level": "info",
        "step": "webcrack",
        "message": "Starting deobfuscation..."
      }
    ]
  }
}
```

#### `POST /api/jobs/{jobId}/cancel`
Cancel a running or queued job.

**Response:**
```json
{
  "job": {
    "id": "job_abc123def456",
    "status": "cancelled",
    "cancelledAt": "2024-01-01T12:00:30.000Z"
  }
}
```

#### `POST /api/jobs/{jobId}/retry`
Retry a failed job.

**Response:**
```json
{
  "job": {
    "id": "job_abc123def456",
    "status": "queued",
    "retriedAt": "2024-01-01T12:00:30.000Z",
    "retryCount": 1
  }
}
```

#### `DELETE /api/jobs/{jobId}`
Delete a job and its associated files.

**Response:**
```json
{
  "message": "Job deleted successfully"
}
```

### File Operations

#### `GET /api/files/{fileId}/original`
Download original uploaded file.

**Response:** File content with appropriate `Content-Type` header

#### `GET /api/files/{fileId}/processed`
Download processed/deobfuscated file.

**Response:** File content with appropriate `Content-Type` header

## Real-time Updates

### Server-Sent Events

#### `GET /api/jobs/events`
Subscribe to real-time job updates via Server-Sent Events.

**Headers:**
- `Accept: text/event-stream`
- `Cache-Control: no-cache`

**Event Types:**

1. **Job Status Update**
```
event: job-status
data: {
  "jobId": "job_abc123def456",
  "type": "status",
  "status": "running",
  "timestamp": "2024-01-01T12:00:15.000Z"
}
```

2. **Progress Update**
```
event: job-progress  
data: {
  "jobId": "job_abc123def456",
  "type": "progress",
  "progress": {
    "percentage": 45,
    "currentStep": "LLM Processing",
    "completedSteps": 2,
    "totalSteps": 4
  },
  "timestamp": "2024-01-01T12:00:30.000Z"
}
```

3. **Job Result**
```
event: job-result
data: {
  "jobId": "job_abc123def456", 
  "type": "result",
  "result": {
    "outputFiles": ["app.deobfuscated.js"],
    "errors": [],
    "stats": {
      "processingTime": 90000,
      "inputSize": 15420,
      "outputSize": 42150
    }
  },
  "timestamp": "2024-01-01T12:01:30.000Z"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "File type not supported",
    "details": {
      "field": "files",
      "acceptedTypes": [".js", ".mjs", ".cjs"]
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "req_abc123def456"
}
```

### Common Error Codes

- `INVALID_REQUEST` (400): Malformed request or invalid parameters
- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable

### File Upload Errors

- `FILE_TOO_LARGE`: File exceeds maximum size limit
- `INVALID_FILE_TYPE`: File type not supported
- `TOO_MANY_FILES`: Exceeded maximum files per job
- `UPLOAD_FAILED`: File upload processing failed

### Job Processing Errors

- `PROCESSING_FAILED`: Job processing encountered an error
- `TIMEOUT_EXCEEDED`: Job exceeded maximum processing time
- `PROVIDER_ERROR`: AI provider API error
- `QUOTA_EXCEEDED`: API usage quota exceeded

## Rate Limits

Default rate limits (configurable):
- **General API**: 100 requests per minute per IP
- **File Upload**: 10 uploads per minute per IP
- **SSE Connections**: 5 concurrent connections per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704110460
```

## SDKs and Client Libraries

### JavaScript/TypeScript

```typescript
import { ReScriptClient } from '@re-script/client';

const client = new ReScriptClient({
  baseUrl: 'http://localhost:3001',
  apiKey: 'optional-api-key'
});

// Upload files
const job = await client.uploadFiles(files, config);

// Monitor progress
client.onJobUpdate(job.id, (update) => {
  console.log('Job progress:', update);
});

// Get results
const result = await client.getJobResult(job.id);
```

### cURL Examples

```bash
# Create job
curl -X POST http://localhost:3001/api/jobs/upload \
  -F "files[]=@app.min.js" \
  -F 'config={"provider":{"name":"anthropic","model":"claude-3-5-sonnet-20241022"}}'

# Get job status  
curl http://localhost:3001/api/jobs/job_abc123def456

# Cancel job
curl -X POST http://localhost:3001/api/jobs/job_abc123def456/cancel

# Subscribe to events
curl -H "Accept: text/event-stream" \
     http://localhost:3001/api/jobs/events
```

## Webhooks (Coming Soon)

Future support for webhook notifications:

```json
{
  "url": "https://your-app.com/webhooks/re-script",
  "events": ["job.completed", "job.failed"],
  "secret": "your-webhook-secret"
}
```

## Performance & Scaling

### Response Times
- **Job Creation**: < 100ms
- **Job Status**: < 50ms  
- **File Upload**: Depends on file size
- **SSE Connection**: < 10ms setup

### Throughput
- **Concurrent Jobs**: Limited by Redis and worker processes
- **File Processing**: Depends on file size and AI provider latency
- **Typical Processing**: 30-120 seconds per file

### Monitoring
Monitor these metrics for production deployments:
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Queue depth and processing rate
- Redis connection pool usage
- Memory and CPU utilization