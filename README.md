# NetAuto

A robust OpenStack server management application built with Node.js, TypeScript, and Express. This application provides webhook endpoints to manage OpenStack compute instances with automatic state synchronization, Redis caching, and Slack notifications.

## Features

- 🚀 **OpenStack Integration**: Seamlessly manage compute instances via OpenStack Nova API
- 🔄 **Automated Server State Management**: Start/stop servers via webhook endpoints
- 💾 **Redis Caching**: Efficient task queuing and state management
- 📢 **Slack Notifications**: Real-time alerts for server state changes
- 🐳 **Docker Support**: Production-ready containerization with Docker Compose
- 🔒 **Security First**: Helmet.js, CORS, and secure authentication
- 📊 **Health Monitoring**: Built-in health checks and logging
- ⚡ **Worker Threads**: Non-blocking server operations using Node.js worker threads

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Node.js** 22.x or higher
- **pnpm** 10.17.1 or higher
- **Docker** and **Docker Compose** (for containerized deployment)
- **Redis** (if running locally without Docker)
- **OpenStack** environment with Nova API access

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fusion-host
```

### 2. Install Dependencies

Using pnpm (recommended):
```bash
pnpm install
```

Or using npm:
```bash
npm install
```

## Configuration

### Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and configure the following variables:

```env
# OpenStack Configuration
OPENSTACK_AUTH_URL=https://keystone.example.com:13000
OPENSTACK_PROJECT_NAME=Your_Project_Name
OPENSTACK_USER_DOMAIN=example.com
OPENSTACK_PROJECT_DOMAIN_ID=your_project_domain_id
OPENSTACK_USERNAME=your_username@example.com
OPENSTACK_PASSWORD=your_password
OPENSTACK_REGION_NAME=region-name
OPENSTACK_INTERFACE=public
OPENSTACK_IDENTITY_API_VERSION=3
OPENSTACK_COMPUTE_BASE_URL=https://nova.example.com:13774/v2.1

# Redis Configuration
REDIS_HOST=127.0.0.1  # Use 'redis' when running with Docker Compose
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# Slack Configuration (Optional)
SLACK_WEBHOOK_BASE_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Application Configuration
PORT=8888
NODE_ENV=production
CORS_ORIGIN=*  # Configure for your specific domain in production
```

### Configuration Details

- **OpenStack**: Requires valid credentials and endpoints for your OpenStack environment
- **Redis**: Used for task queuing and preventing duplicate operations
- **Slack**: Optional - enables notifications for server state changes
- **Port**: Default is 8888, can be changed as needed

## Running the Application

### Development Mode

Run with hot-reload and development features:
```bash
pnpm run dev
```

This will:
- Compile TypeScript with watch mode
- Start the server with nodemon for auto-restart
- Enable detailed logging

### Production Mode

#### Option 1: Direct Node.js

1. Build the application:
```bash
pnpm run build
```

2. Start the server:
```bash
pnpm run start:prod
```

#### Option 2: Docker Compose (Recommended)

1. Start all services:
```bash
docker-compose up -d
```

This will start:
- The Node.js application (port 8888)
- Redis server (port 6379)
- Both with automatic restart policies

2. Check service status:
```bash
docker-compose ps
```

3. View logs:
```bash
docker-compose logs -f app
```

4. Stop services:
```bash
docker-compose down
```

## API Endpoints

### Health Check
```http
GET /v1/health
```
Returns application health status, uptime, and memory usage.

**Response:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2024-10-04T12:00:00.000Z",
    "uptime": 3600,
    "environment": "production",
    "memory": {
      "used": 45.5,
      "total": 128,
      "unit": "MB"
    }
  }
}
```

### Update Server State
```http
PUT /v1/webhooks/servers/:serverName/states
```

Change the state of an OpenStack server.

**Request Body:**
```json
{
  "state": "UP"  // or "DOWN"
}
```

**Parameters:**
- `serverName`: Name of the server in OpenStack (path parameter)
- `state`: Desired state - "UP" (start) or "DOWN" (stop)

**Response:**
```json
{
  "success": true,
  "message": "Server state update task created",
  "data": {
    "taskId": "task_123456",
    "serverName": "my-server",
    "requestedState": "UP",
    "status": "pending"
  }
}
```

## Development

### Available Scripts

```bash
# Development with hot-reload
pnpm run dev

# Build TypeScript
pnpm run build

# Run linting
pnpm run lint
pnpm run lint:fix

# Format code
pnpm run format
pnpm run format:check

# Type checking
pnpm run typecheck

# Clean build artifacts
pnpm run clean
```

### Project Structure

```
fusion-host/
├── src/
│   ├── configs/         # Configuration files
│   │   ├── credentials.ts
│   │   ├── environments.ts
│   │   └── index.ts
│   ├── modules/         # Business logic modules
│   │   ├── auth.ts      # OpenStack authentication
│   │   ├── compute.ts   # Server management
│   │   └── index.ts
│   ├── routes/          # API routes
│   │   ├── webhook.ts   # Webhook endpoints
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts    # Winston logger
│   │   ├── redis.ts     # Redis client
│   │   ├── request.ts   # Axios instance
│   │   ├── response.ts  # API response helpers
│   │   └── slack.ts     # Slack notifications
│   ├── workers/         # Background workers
│   │   └── updateServerStateWorker.ts
│   ├── types/           # TypeScript types
│   ├── server.ts        # Express server setup
│   └── index.ts         # Application entry point
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Multi-stage Docker build
├── .env.example         # Environment variables template
└── package.json         # Dependencies and scripts
```

## Production Deployment

### Docker Deployment

The application includes a production-ready Docker setup:

1. **Multi-stage Build**: Optimized image size with separate build and runtime stages
2. **Non-root User**: Runs as non-root user for security
3. **Health Checks**: Built-in health monitoring
4. **Auto-restart**: Configured with `restart: always` policy

### Deployment Steps

1. Set up environment variables in `.env`
2. Build and start services:
```bash
docker-compose up -d --build
```

3. Verify health:
```bash
curl http://localhost:8888/v1/health
```

### Security Considerations

- Always use strong passwords for Redis and OpenStack
- Configure CORS for your specific domain
- Use HTTPS in production (configure reverse proxy)
- Regularly update dependencies
- Monitor logs for suspicious activity

## Architecture

### Components

1. **Express Server**: Handles HTTP requests and routing
2. **Worker Threads**: Processes server state changes asynchronously
3. **Redis**: Manages task queues and prevents duplicate operations
4. **OpenStack Client**: Communicates with Nova API for server management
5. **Slack Integration**: Sends notifications for state changes

### Flow

1. Webhook receives server state change request
2. Request is validated and queued in Redis
3. Worker thread processes the task:
   - Authenticates with OpenStack
   - Retrieves server list
   - Updates server state
   - Sends Slack notification
4. Task status is updated in Redis

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :8888

# Change port in .env file
PORT=3000
```

#### Redis Connection Failed
- Ensure Redis is running
- Check Redis password in `.env`
- Verify Redis host (use 'redis' for Docker, '127.0.0.1' for local)

#### OpenStack Authentication Failed
- Verify credentials in `.env`
- Check network connectivity to OpenStack endpoints
- Ensure correct API versions

#### Docker Issues
```bash
# Reset Docker environment
docker-compose down -v
docker-compose up --build

# View detailed logs
docker-compose logs -f --tail=100 app
```

### Logging

Logs are stored in the `logs/` directory:
- `combined.log`: All logs
- `error.log`: Error logs only

View logs in Docker:
```bash
docker-compose logs -f app
```

## Automation Scripts

The project includes automation scripts for managing server states, perfect for scheduled operations via cron.

### Server Management Scripts

Located in the `/scripts` directory:

- **startup-tunnel.sh**: Starts a specified OpenStack/Peplink FusionHub server
- **shutdown-tunnel.sh**: Stops a specified OpenStack/Peplink FusionHub server

#### Script Usage

Basic usage with default configuration:
```bash
./scripts/startup-tunnel.sh   # Starts default server
./scripts/shutdown-tunnel.sh  # Stops default server
```

With environment variables:
```bash
SERVER_NAME="fusionhub_hiu_office" API_HOST="http://localhost:8888" ./scripts/startup-tunnel.sh
SERVER_NAME="fusionhub_hiu_office" API_HOST="http://localhost:8888" ./scripts/shutdown-tunnel.sh
```

### Cron Scheduler Integration

These scripts are designed for automated server management via cron. Perfect for:
- Cost optimization (shut down development servers after hours)
- Scheduled maintenance windows
- Automatic disaster recovery testing

#### Sample Crontab Configuration

```bash
# Edit crontab
crontab -e

# Office Hours Schedule (8 AM - 6 PM, Monday-Friday)
0 8 * * 1-5 SERVER_NAME="fusionhub_office" API_HOST="http://localhost:8888" /path/to/scripts/startup-tunnel.sh >> /var/log/fusionhub.log 2>&1
0 18 * * 1-5 SERVER_NAME="fusionhub_office" API_HOST="http://localhost:8888" /path/to/scripts/shutdown-tunnel.sh >> /var/log/fusionhub.log 2>&1

# Weekend Maintenance (Restart Sunday 3 AM)
0 3 * * 0 SERVER_NAME="fusionhub_prod" /path/to/scripts/shutdown-tunnel.sh && sleep 5 && /path/to/scripts/startup-tunnel.sh
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Specify your license here]

## Support

For issues, questions, or suggestions, please [open an issue](link-to-issues) on GitHub.
