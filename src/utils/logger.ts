import winston from 'winston';

const { combine, timestamp, printf, colorize, align, json, errors } = winston.format;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Determine log level based on environment
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'warn');
};

// Define colors for each level
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'white',
  silly: 'gray',
});

// Format for development environment
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  align(),
  errors({ stack: true }),
  printf((info) => {
    const { timestamp, level, message, ...args } = info;
    const ts = typeof timestamp === 'string' ? timestamp.slice(11, 23) : timestamp;
    return `${ts} [${level}]: ${message} ${
      Object.keys(args).length ? JSON.stringify(args, null, 2) : ''
    }`;
  }),
);

// Format for production environment
const prodFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json(),
);

// Determine which format to use
const getLogFormat = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? prodFormat : devFormat;
};

// Create transports based on environment
const getTransports = (): winston.transport[] => {
  const env = process.env.NODE_ENV || 'development';
  const transports: winston.transport[] = [];

  // Always add console transport
  transports.push(
    new winston.transports.Console({
      handleExceptions: true,
    }),
  );

  // Add file transports for both development and production
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      handleExceptions: true,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        errors({ stack: true }),
        json()
      ),
    }),
  );

  // Warning log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/warning.log',
      level: 'warn',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        json()
      ),
    }),
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      handleExceptions: true,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        errors({ stack: true }),
        json()
      ),
    }),
  );

  // Debug log file (only in development)
  if (env === 'development') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/debug.log',
        level: 'debug',
        maxsize: 10485760, // 10MB
        maxFiles: 3,
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          json()
        ),
      }),
    );
  }

  return transports;
};

// Create the logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  format: getLogFormat(),
  transports: getTransports(),
  exitOnError: false, // Do not exit on handled exceptions
});

// Create a stream object with a 'write' function for Morgan integration
export const stream = {
  write: (message: string) => {
    // Remove line breaks and write as info level
    logger.info(message.trim());
  },
};

// Export logger methods with proper typing
export default {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  http: (message: string, meta?: any) => logger.http(message, meta),
  verbose: (message: string, meta?: any) => logger.verbose(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  silly: (message: string, meta?: any) => logger.silly(message, meta),
  log: (level: string, message: string, meta?: any) => logger.log(level, message, meta),

  // Add child logger functionality for request tracking
  child: (meta: any) => logger.child(meta),

  // Add profile functionality
  profile: (id: string) => logger.profile(id),
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any) => {
  logger.error('Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});