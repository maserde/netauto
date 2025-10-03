import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import logger from '@/utils/logger';
import { ApiResponse } from '@/utils/response';
import router from '@/routes';

export function createServer(): Express {
  const app: Express = express();

  // Security middleware
  app.use(helmet());

  // Enable CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  // Compression middleware
  app.use(compression());

  // Parse JSON bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http(`${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    });

    next();
  });

  app.use('/', router)

  // Health check endpoint
  app.get('/v1/health', (_req: Request, res: Response) => {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024,
        unit: 'MB',
      },
    };
    return ApiResponse.ok(res, 'Service is healthy', healthData);
  })

  // 404 handler
  app.use((req: Request, res: Response) => {
    logger.warn(`404 - Route not found: ${req.originalUrl}`);
    return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`, 'The requested endpoint does not exist');
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Express error handler caught exception', {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });

    const message = 'An error occurred processing your request';
    const reason = process.env.NODE_ENV === 'production' ? undefined : err.message;
    return ApiResponse.internalError(res, message, reason);
  });

  return app;
}

export async function startServer(port: number = 3000): Promise<void> {
  const app = createServer();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`🚀 Server is running on http://localhost:${port}`);
      logger.info('Press CTRL-C to stop');
      resolve();
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use`);
      } else {
        logger.error('Server error', { error: error.message });
      }
      reject(error);
    });
  });
}