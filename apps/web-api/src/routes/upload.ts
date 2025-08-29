/**
 * File upload routes for processing JavaScript files
 */

import { FastifyPluginAsync } from 'fastify';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { config } from '../config/env.js';
import { validateFileExtension, validateFileSize, ApiError } from '@re-script/shared-utils';
import { jobQueueService } from '../services/queue.js';
import { jobProcessorService } from '../services/processor.js';
import { getLoggerService } from '../services/logger.js';

const ALLOWED_EXTENSIONS = ['.js', '.mjs', '.cjs'];
const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Schema for the process endpoint config
const processConfigSchema = z.object({
  provider: z.object({
    name: z.enum(['openai', 'anthropic', 'ollama']),
    model: z.string(),
    temperature: z.number().min(0).max(2).default(0.7),
  }),
  processing: z.object({
    preserveComments: z.boolean().default(false),
    preserveSourceMaps: z.boolean().default(false),
  }).optional(),
});

export const uploadRoutes: FastifyPluginAsync = async (server) => {

  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Single file upload
  server.post('/file', async (request, reply) => {
    const logger = getLoggerService();
    const requestId = (request as any).requestId;
    
    try {
      logger.startPerformanceTimer(`upload_${requestId}`, { requestId });
      
      const data = await request.file();
      
      if (!data) {
        throw new ApiError(400, 'A file must be included in the request', 'NO_FILE_PROVIDED');
      }

      const { filename, mimetype } = data;

      // Validate file extension
      const validation = validateFileExtension(filename, ALLOWED_EXTENSIONS);
      if (!validation.valid) {
        logger.logFileUploadError(filename, new Error(validation.errors[0]), { requestId });
        throw new ApiError(400, validation.errors[0], 'INVALID_FILE_TYPE');
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Validate file size
      const sizeValidation = validateFileSize(buffer.length, config.MAX_FILE_SIZE);
      if (!sizeValidation.valid) {
        logger.logFileUploadError(filename, new Error(sizeValidation.errors[0]), { requestId });
        throw new ApiError(413, sizeValidation.errors[0], 'FILE_TOO_LARGE');
      }

      // Generate unique filename
      const fileId = uuidv4();
      const extension = extname(filename);
      const savedFilename = `${fileId}${extension}`;
      const filePath = join(UPLOAD_DIR, savedFilename);

      // Save file
      await writeFile(filePath, buffer);

      // Log successful upload
      logger.logFileUpload(filename, buffer.length, {
        requestId,
        fileId,
        savedFilename,
        mimetype,
      });

      const metrics = logger.endPerformanceTimer(`upload_${requestId}`, { requestId });

      return {
        success: true,
        file: {
          id: fileId,
          originalName: filename,
          savedName: savedFilename,
          path: filePath,
          size: buffer.length,
          mimetype,
          uploadedAt: new Date().toISOString(),
        },
        processingTime: metrics?.duration,
      };

    } catch (error) {
      logger.endPerformanceTimer(`upload_${requestId}`, { requestId });
      
      if (error instanceof ApiError) {
        throw error; // Let the error handler deal with it
      }
      
      logger.logError(error as Error, { requestId, operation: 'file_upload' });
      throw new ApiError(500, 'Failed to process file upload', 'UPLOAD_ERROR');
    }
  });

  // Multiple file upload
  server.post('/files', async (request, reply) => {
    try {
      const parts = request.files();
      const uploadedFiles = [];
      let totalSize = 0;

      for await (const part of parts) {
        const { filename, mimetype, file } = part;

        // Validate file extension
        const validation = validateFileExtension(filename, ALLOWED_EXTENSIONS);
        if (!validation.valid) {
          return reply.status(400).send({
            error: 'Invalid file type',
            message: `File ${filename}: ${validation.errors[0]}`,
          });
        }

        // Read file buffer
        const buffer = await part.toBuffer();
        totalSize += buffer.length;

        // Check total size doesn't exceed limit
        if (totalSize > config.MAX_FILE_SIZE * 5) { // Allow 5x limit for multiple files
          return reply.status(413).send({
            error: 'Total files too large',
            message: 'Combined file size exceeds the maximum limit',
          });
        }

        // Generate unique filename
        const fileId = uuidv4();
        const extension = extname(filename);
        const savedFilename = `${fileId}${extension}`;
        const filePath = join(UPLOAD_DIR, savedFilename);

        // Save file
        await writeFile(filePath, buffer);

        uploadedFiles.push({
          id: fileId,
          originalName: filename,
          savedName: savedFilename,
          path: filePath,
          size: buffer.length,
          mimetype,
          uploadedAt: new Date().toISOString(),
        });

        server.log.info(`File uploaded: ${filename} -> ${savedFilename} (${buffer.length} bytes)`);
      }

      if (uploadedFiles.length === 0) {
        return reply.status(400).send({
          error: 'No files provided',
          message: 'At least one file must be included in the request',
        });
      }

      return {
        success: true,
        files: uploadedFiles,
        totalSize,
        count: uploadedFiles.length,
      };

    } catch (error) {
      server.log.error(`Multiple file upload failed: ${error}`);
      return reply.status(500).send({
        error: 'Upload failed',
        message: 'Failed to process file uploads',
      });
    }
  });

  // Upload and process (create job directly)
  server.post('/process', async (request, reply) => {
    try {
      const parts = request.files();
      let configData: any = {};
      const uploadedFiles = [];

      // Extract both files and config from multipart form data
      for await (const part of parts) {
        if (part.type === 'file') {
          const { filename } = part;

          // Validate file extension
          const validation = validateFileExtension(filename, ALLOWED_EXTENSIONS);
          if (!validation.valid) {
            return reply.status(400).send({
              error: 'Invalid file type',
              message: `File ${filename}: ${validation.errors[0]}`,
            });
          }

          // Read file buffer
          const buffer = await part.toBuffer();

          // Validate file size
          const sizeValidation = validateFileSize(buffer.length, config.MAX_FILE_SIZE);
          if (!sizeValidation.valid) {
            return reply.status(413).send({
              error: 'File too large',
              message: `File ${filename}: ${sizeValidation.errors[0]}`,
            });
          }

          // Generate unique filename and save
          const fileId = uuidv4();
          const extension = extname(filename);
          const savedFilename = `${fileId}${extension}`;
          const filePath = join(UPLOAD_DIR, savedFilename);

          await writeFile(filePath, buffer);

          uploadedFiles.push({
            id: fileId,
            originalName: filename,
            savedName: savedFilename,
            path: filePath,
          });

        } else if (part.fieldname) {
          // Handle form fields (config data)
          const fieldValue = await part.toBuffer();
          if (part.fieldname === 'config') {
            try {
              configData = JSON.parse(fieldValue.toString());
            } catch (parseError) {
              return reply.status(400).send({
                error: 'Invalid config',
                message: 'Config must be valid JSON',
              });
            }
          }
        }
      }

      if (uploadedFiles.length === 0) {
        return reply.status(400).send({
          error: 'No files provided',
          message: 'At least one file must be included in the request',
        });
      }

      // Validate config data
      let validatedConfig;
      try {
        validatedConfig = processConfigSchema.parse(configData);
      } catch (validationError) {
        return reply.status(400).send({
          error: 'Invalid configuration',
          message: 'Processing configuration is invalid',
          details: validationError instanceof z.ZodError ? validationError.errors : undefined,
        });
      }

      // Create job
      const jobId = uuidv4();
      const jobData = {
        jobId,
        files: uploadedFiles.map(f => f.path),
        config: validatedConfig,
        metadata: {
          createdAt: new Date().toISOString(),
        },
      };

      // Add job to queue
      const bullJob = await jobQueueService.addJob(jobData);
      const processingJob = await jobQueueService.getJob(jobId);

      if (!processingJob) {
        return reply.status(500).send({
          error: 'Failed to create job',
          message: 'Job was not properly initialized',
        });
      }

      server.log.info(`Created processing job ${jobId} with ${uploadedFiles.length} files`);

      return reply.status(201).send({
        success: true,
        message: 'Files uploaded and job created successfully',
        job: processingJob,
        queueId: bullJob.id,
        files: uploadedFiles.map(f => ({
          id: f.id,
          originalName: f.originalName,
          savedName: f.savedName,
        })),
        eventStream: `/api/events/stream/${jobId}`,
      });

    } catch (error) {
      server.log.error(`Upload and process failed: ${error}`);
      return reply.status(500).send({
        error: 'Process failed',
        message: 'Failed to upload and process files',
      });
    }
  });

  // Get job outputs
  server.get('/outputs/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      
      const outputs = await jobProcessorService.getJobOutputs(jobId);
      
      return {
        jobId,
        outputs: outputs.map(path => ({
          filename: path.split('/').pop(),
          path,
        })),
      };
      
    } catch (error) {
      server.log.error(`Failed to get job outputs: ${error}`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve job outputs',
      });
    }
  });

  // Get specific job output file
  server.get('/outputs/:jobId/:filename', async (request, reply) => {
    try {
      const { jobId, filename } = request.params as { jobId: string; filename: string };
      
      const content = await jobProcessorService.getJobOutput(jobId, filename);
      
      reply.type('application/javascript');
      return content;
      
    } catch (error) {
      server.log.error(`Failed to get job output file: ${error}`);
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Output file not found',
      });
    }
  });

  // Get upload statistics
  server.get('/stats', async () => {
    // TODO: Implement upload statistics
    return {
      message: 'Upload statistics endpoint - to be implemented',
      stats: {
        totalUploads: 0,
        totalSize: 0,
        averageFileSize: 0,
      },
    };
  });
};