import dotenv from 'dotenv';
dotenv.config();

import { startServer } from '@/server';
import logger from '@/utils/logger';
import { ENV } from './configs/environments';

const main = async () => {
	try {
		logger.info('Starting application...');

		const port = parseInt(ENV.port || '3000', 10);

		await startServer(port);
	} catch (error) {
		logger.error('Failed to start application', { error });
		process.exit(1);
	}
};

process.on('SIGTERM', () => {
	logger.info('SIGTERM signal received: closing HTTP server');
	process.exit(0);
});

process.on('SIGINT', () => {
	logger.info('SIGINT signal received: closing HTTP server');
	process.exit(0);
});

main();