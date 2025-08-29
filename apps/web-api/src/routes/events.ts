/**
 * Server-Sent Events routes for real-time job updates
 */

import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { jobQueueService } from '../services/queue.js';

interface SSEConnection {
  reply: FastifyReply;
  jobId?: string;
  lastEventId?: string;
}

export class EventStreamService {
  private connections = new Set<SSEConnection>();
  private eventId = 0;

  addConnection(connection: SSEConnection) {
    this.connections.add(connection);
  }

  removeConnection(connection: SSEConnection) {
    this.connections.delete(connection);
  }

  broadcast(event: string, data: any, jobId?: string) {
    const eventData = {
      id: ++this.eventId,
      event,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    };

    this.connections.forEach(connection => {
      // If jobId is specified, only send to connections listening for that job
      if (jobId && connection.jobId && connection.jobId !== jobId) {
        return;
      }

      try {
        connection.reply.raw.write(`id: ${eventData.id}\n`);
        connection.reply.raw.write(`event: ${event}\n`);
        connection.reply.raw.write(`data: ${eventData.data}\n\n`);
      } catch (error) {
        console.error('Failed to send SSE message:', error);
        this.removeConnection(connection);
      }
    });
  }

  broadcastJobUpdate(jobId: string, status: string, progress?: any) {
    this.broadcast('job-update', {
      jobId,
      status,
      progress,
    }, jobId);
  }

  broadcastJobProgress(jobId: string, progress: any) {
    this.broadcast('job-progress', {
      jobId,
      progress,
    }, jobId);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const eventStreamService = new EventStreamService();

export const eventsRoutes: FastifyPluginAsync = async (server) => {

  // Global events stream
  server.get('/stream', async (request: FastifyRequest, reply: FastifyReply) => {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    };

    reply.raw.writeHead(200, headers);

    // Send initial connection event
    reply.raw.write(`event: connected\n`);
    reply.raw.write(`data: ${JSON.stringify({ message: 'Connected to re-script events' })}\n\n`);

    // Create connection
    const connection: SSEConnection = {
      reply,
      lastEventId: request.headers['last-event-id'] as string,
    };

    eventStreamService.addConnection(connection);

    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`event: heartbeat\n`);
        reply.raw.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
        eventStreamService.removeConnection(connection);
      }
    }, 30000); // 30 seconds

    // Cleanup on connection close
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      eventStreamService.removeConnection(connection);
    });

    request.raw.on('error', () => {
      clearInterval(heartbeat);
      eventStreamService.removeConnection(connection);
    });
  });

  // Job-specific events stream
  server.get('/stream/:jobId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { jobId } = request.params as { jobId: string };

    // Verify job exists
    const job = await jobQueueService.getJob(jobId);
    if (!job) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Job ${jobId} not found`,
      });
    }

    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    };

    reply.raw.writeHead(200, headers);

    // Send initial job status
    reply.raw.write(`event: job-status\n`);
    reply.raw.write(`data: ${JSON.stringify({ job })}\n\n`);

    // Create connection
    const connection: SSEConnection = {
      reply,
      jobId,
      lastEventId: request.headers['last-event-id'] as string,
    };

    eventStreamService.addConnection(connection);

    // Send periodic job updates
    const jobUpdates = setInterval(async () => {
      try {
        const updatedJob = await jobQueueService.getJob(jobId);
        if (updatedJob) {
          reply.raw.write(`event: job-update\n`);
          reply.raw.write(`data: ${JSON.stringify({ job: updatedJob })}\n\n`);

          // Stop updates if job is completed or failed
          if (['completed', 'failed', 'cancelled'].includes(updatedJob.status)) {
            clearInterval(jobUpdates);
          }
        }
      } catch (error) {
        clearInterval(jobUpdates);
        eventStreamService.removeConnection(connection);
      }
    }, 5000); // 5 seconds

    // Cleanup on connection close
    request.raw.on('close', () => {
      clearInterval(jobUpdates);
      eventStreamService.removeConnection(connection);
    });

    request.raw.on('error', () => {
      clearInterval(jobUpdates);
      eventStreamService.removeConnection(connection);
    });
  });

  // Get current connections info
  server.get('/connections', async () => {
    return {
      connections: eventStreamService.getConnectionCount(),
      timestamp: new Date().toISOString(),
    };
  });

  // Test event endpoint (for development)
  server.post('/test/:event', async (request, reply) => {
    const { event } = request.params as { event: string };
    const { data, jobId } = request.body as { data: any; jobId?: string };

    eventStreamService.broadcast(event, data, jobId);

    return {
      message: `Test event '${event}' broadcasted`,
      data,
      jobId,
      connections: eventStreamService.getConnectionCount(),
    };
  });
};