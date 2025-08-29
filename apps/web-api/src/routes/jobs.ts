/**
 * Job management API routes
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { jobQueueService } from '../services/queue.js';
import { validateString, validateArray } from '@re-script/shared-utils';

// Request schemas
const createJobSchema = z.object({
  files: z.array(z.string()).min(1, 'At least one file is required'),
  config: z.object({
    provider: z.object({
      name: z.enum(['openai', 'anthropic', 'ollama']),
      model: z.string(),
      temperature: z.number().min(0).max(2).default(0.7),
    }),
    processing: z.object({
      preserveComments: z.boolean().default(false),
      preserveSourceMaps: z.boolean().default(false),
    }).optional(),
  }),
  options: z.object({
    outputDir: z.string().optional(),
    recursive: z.boolean().default(false),
    pattern: z.string().optional(),
  }).optional(),
});

const jobQuerySchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const jobRoutes: FastifyPluginAsync = async (server) => {
  
  // Create a new job
  server.post('/', {
    schema: {
      body: createJobSchema,
    },
  }, async (request, reply) => {
    try {
      const { files, config, options = {} } = request.body as z.infer<typeof createJobSchema>;
      
      // Validate files
      const validatedFiles = validateArray(files, 'files', {
        minLength: 1,
        maxLength: 50,
        validator: (file, index) => validateString(file, `files[${index}]`),
      });

      // Generate job ID
      const jobId = uuidv4();
      
      // Create job data
      const jobData = {
        jobId,
        files: validatedFiles,
        config,
        metadata: {
          createdAt: new Date().toISOString(),
        },
      };

      // Add to queue
      const bullJob = await jobQueueService.addJob(jobData);
      
      // Get the created processing job
      const processingJob = await jobQueueService.getJob(jobId);
      
      if (!processingJob) {
        return reply.status(500).send({
          error: 'Failed to create job',
          message: 'Job was not properly initialized',
        });
      }

      return reply.status(201).send({
        job: processingJob,
        queueId: bullJob.id,
      });
      
    } catch (error) {
      server.log.error(`Failed to create job: ${error}`);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid job data',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create job',
      });
    }
  });

  // Get all jobs with filtering
  server.get('/', {
    schema: {
      querystring: jobQuerySchema,
    },
  }, async (request, reply) => {
    try {
      const { status, limit, offset } = request.query as z.infer<typeof jobQuerySchema>;
      
      let jobs = await jobQueueService.getAllJobs();
      
      // Filter by status if specified
      if (status) {
        jobs = jobs.filter(job => job.status === status);
      }
      
      // Sort by creation date (newest first)
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Apply pagination
      const paginatedJobs = jobs.slice(offset, offset + limit);
      
      return {
        jobs: paginatedJobs,
        pagination: {
          total: jobs.length,
          limit,
          offset,
          hasNext: offset + limit < jobs.length,
          hasPrev: offset > 0,
        },
      };
      
    } catch (error) {
      server.log.error(`Failed to get jobs: ${error}`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve jobs',
      });
    }
  });

  // Get a specific job by ID
  server.get('/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      
      const job = await jobQueueService.getJob(jobId);
      
      if (!job) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Job ${jobId} not found`,
        });
      }
      
      return { job };
      
    } catch (error) {
      server.log.error(`Failed to get job: ${error}`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve job',
      });
    }
  });

  // Cancel a job
  server.delete('/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      
      const success = await jobQueueService.cancelJob(jobId);
      
      if (!success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Job ${jobId} not found or cannot be cancelled`,
        });
      }
      
      return {
        message: `Job ${jobId} cancelled successfully`,
        cancelled: true,
      };
      
    } catch (error) {
      server.log.error(`Failed to cancel job: ${error}`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cancel job',
      });
    }
  });

  // Get queue statistics
  server.get('/stats/queue', async (request, reply) => {
    try {
      const stats = await jobQueueService.getQueueStats();
      
      return {
        queue: stats,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      server.log.error(`Failed to get queue stats: ${error}`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve queue statistics',
      });
    }
  });

  // Retry a failed job
  server.post('/:jobId/retry', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      
      const job = await jobQueueService.getJob(jobId);
      
      if (!job) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Job ${jobId} not found`,
        });
      }
      
      if (job.status !== 'failed') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Job ${jobId} cannot be retried (status: ${job.status})`,
        });
      }
      
      // Create new job with same data
      const newJobId = uuidv4();
      const jobData = {
        jobId: newJobId,
        files: job.input.files,
        config: job.config,
        metadata: {
          createdAt: new Date().toISOString(),
          retryOf: jobId,
        },
      };
      
      const bullJob = await jobQueueService.addJob(jobData);
      const newJob = await jobQueueService.getJob(newJobId);
      
      return {
        message: `Job ${jobId} retried as ${newJobId}`,
        originalJob: jobId,
        newJob: newJob,
        queueId: bullJob.id,
      };
      
    } catch (error) {
      server.log.error(`Failed to retry job: ${error}`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retry job',
      });
    }
  });
};