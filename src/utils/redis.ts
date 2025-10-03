import Redis from 'ioredis';
import logger from '@/utils/logger';
import { ENV } from '@/configs';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisHost = ENV.REDIS.HOST;
    const redisPort = parseInt(ENV.REDIS.PORT, 10);
    const redisPassword = ENV.REDIS.PASSWORD;

    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected successfully', {
        host: redisHost,
        port: redisPort,
      });
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error', {
        error: error.message,
        host: redisHost,
        port: redisPort,
      });
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', (delay: number) => {
      logger.info(`Redis reconnecting in ${delay}ms`);
    });
  }

  return redisClient;
}


export enum TaskStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface WorkerTask {
  taskId: string;
  serverName: string;
  targetState?: string;
  status: TaskStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
  workerId?: string;
}


export async function checkExistingTask(taskKey: string): Promise<WorkerTask | null> {
  try {
    const redis = getRedisClient();
    const taskData = await redis.get(taskKey);

    if (taskData) {
      const task = JSON.parse(taskData) as WorkerTask;
      // Only return if task is still processing
      if (task.status === TaskStatus.PROCESSING) {
        return task;
      }
    }

    return null;
  } catch (error: any) {
    logger.error('Failed to check existing task', {
      taskKey,
      error: error.message,
    });
    return null;
  }
}

export async function setWorkerTask(
  taskKey: string,
  task: WorkerTask,
  ttl: number = 600
): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.setex(taskKey, ttl, JSON.stringify(task));

    logger.debug('Worker task set in Redis', {
      taskKey,
      taskId: task.taskId,
      status: task.status,
      ttl,
    });
  } catch (error: any) {
    logger.error('Failed to set worker task', {
      taskKey,
      task,
      error: error.message,
    });
    throw error;
  }
}

export async function updateTaskStatus(
  taskKey: string,
  status: TaskStatus,
  error?: string
): Promise<void> {
  try {
    const redis = getRedisClient();
    const taskData = await redis.get(taskKey);

    if (taskData) {
      const task = JSON.parse(taskData) as WorkerTask;
      task.status = status;
      if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
        task.completedAt = new Date().toISOString();
      }
      if (error) {
        task.error = error;
      }

      // Keep completed/failed tasks for shorter time (5 minutes)
      const ttl = status === TaskStatus.PROCESSING ? 600 : 300;
      await redis.setex(taskKey, ttl, JSON.stringify(task));

      logger.debug('Worker task status updated', {
        taskKey,
        taskId: task.taskId,
        status,
        error,
      });
    }
  } catch (error: any) {
    logger.error('Failed to update task status', {
      taskKey,
      status,
      error: error.message,
    });
  }
}


export async function removeWorkerTask(taskKey: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(taskKey);

    logger.debug('Worker task removed from Redis', { taskKey });
  } catch (error: any) {
    logger.error('Failed to remove worker task', {
      taskKey,
      error: error.message,
    });
  }
}

export function generateServerStateTaskKey(serverName: string): string {
  return `worker:server:${serverName}:state_change`;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

export default {
  getRedisClient,
  checkExistingTask,
  setWorkerTask,
  updateTaskStatus,
  removeWorkerTask,
  generateServerStateTaskKey,
  closeRedisConnection,
  TaskStatus,
};