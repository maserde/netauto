import { parentPort, workerData } from 'worker_threads';
import { Auth } from '@/modules/auth';
import { Compute } from '@/modules/compute';
import { ServerState } from '@/modules/compute';
import logger from '@/utils/logger';
import { updateTaskStatus, TaskStatus } from '@/utils/redis';
import { SlackWebhook } from '@/utils/slack';

interface WorkerData {
  taskId: string;
  taskKey?: string;  // Redis key for tracking this task
  serverName: string;
  targetState: ServerState;
  maxRetries?: number;
  pollInterval?: number; // milliseconds
}

interface WorkerResult {
  success: boolean;
  taskId: string;
  serverName: string;
  targetState: ServerState;
  finalStatus?: string;
  serverId?: string;
  attempts?: number;
  error?: string;
  timestamp: string;
}


function getExpectedStatus(state: ServerState): string[] {
  if (state === 'UP') {
    return ['ACTIVE'];
  } else if (state === 'DOWN') {
    return ['SHUTOFF'];
  }
  return [];
}


function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateServerState(): Promise<void> {
  const {
    taskId,
    taskKey,
    serverName,
    targetState,
    maxRetries = 30, // Default: check for 5 minutes (30 * 10 seconds)
    pollInterval = 10000 // Default: check every 10 seconds
  } = workerData as WorkerData;

  const slackWebhook = new SlackWebhook()

  try {
    logger.info(`[Worker ${taskId}] Starting server state update task`, {
      serverName,
      targetState,
      maxRetries,
      pollInterval
    });

    const auth = new Auth();
    await auth.login();

    if (!auth.token) {
      throw new Error('Failed to obtain authentication token');
    }

    logger.info(`[Worker ${taskId}] Authentication successful`);

    const compute = new Compute(auth.token);

    logger.info(`[Worker ${taskId}] Searching for server by name: ${serverName}`);
    const servers = await compute.getServers();
    let server = servers.find(s => s.name === serverName);

    if (!server) {
      throw new Error(`Server not found: ${serverName}. Please verify the server name is correct and exists in OpenStack.`);
    }

    const serverId = server.id;
    logger.info(`[Worker ${taskId}] Found server`, {
      serverName,
      serverId,
      currentStatus: server.status
    });

    const initialStatus = server.status;

    logger.info(`[Worker ${taskId}] Initial server status`, {
      serverName,
      serverId,
      status: initialStatus
    });

    const expectedStatuses = getExpectedStatus(targetState);
    if (expectedStatuses.includes(server.status)) {
      logger.info(`[Worker ${taskId}] Server already in desired state`, {
        serverName,
        status: server.status,
        targetState
      });

      // Update Redis task status to completed since server is already in desired state
      if (taskKey) {
        try {
          await updateTaskStatus(taskKey, TaskStatus.COMPLETED);
        } catch (redisError: any) {
          logger.error(`[Worker ${taskId}] Failed to update Redis task status`, {
            taskKey,
            error: redisError.message,
          });
        }
      }

      const result: WorkerResult = {
        success: true,
        taskId,
        serverName,
        targetState,
        finalStatus: server.status,
        serverId,
        attempts: 0,
        timestamp: new Date().toISOString(),
      };

      parentPort?.postMessage(result);
      return;
    }

    slackWebhook.sendWebhook(`Hey guys! I want to inform you that the "${serverName}" network bonding gateway status will be changed from ${server.status} to ${targetState}`)

    logger.info(`[Worker ${taskId}] Initiating state change`, {
      serverName,
      serverId,
      from: initialStatus,
      to: targetState
    });

    try {
      await compute.changeServerState(serverId, targetState);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Server not found during state change: ${serverName}. The server may have been deleted.`);
      }
      if (error.response?.status === 409) {
        throw new Error(`Cannot change server state: Server ${serverName} is in a conflicting state or operation is not allowed.`);
      }
      throw error;
    }

    let attempts = 0;
    let stateChanged = false;

    while (attempts < maxRetries && !stateChanged) {
      attempts++;

      await delay(pollInterval);

      logger.info(`[Worker ${taskId}] Checking server status (attempt ${attempts}/${maxRetries})`);

      try {
        const currentServer = await compute.getServer(serverId);

        logger.debug(`[Worker ${taskId}] Current server status`, {
          serverName,
          serverId,
          status: currentServer.status,
          attempt: attempts
        });

        server = currentServer;

        if (expectedStatuses.includes(server.status)) {
          stateChanged = true;
          logger.info(`[Worker ${taskId}] Server state change confirmed`, {
            serverName,
            serverId,
            finalStatus: server.status,
            attempts,
            timeElapsed: `${attempts * pollInterval / 1000} seconds`
          });
        } else if (server.status === 'ERROR') {
          throw new Error(`Server ${serverName} entered ERROR state during transition`);
        }

      } catch (pollError: any) {
        logger.warn(`[Worker ${taskId}] Error checking server status`, {
          attempt: attempts,
          error: pollError.message
        });
      }
    }

    if (!stateChanged) {
      throw new Error(`Server state change not confirmed after ${maxRetries} attempts (${maxRetries * pollInterval / 1000} seconds)`);
    }

    // Update Redis task status to completed if taskKey is provided
    if (taskKey) {
      try {
        await updateTaskStatus(taskKey, TaskStatus.COMPLETED);
      } catch (redisError: any) {
        logger.error(`[Worker ${taskId}] Failed to update Redis task status`, {
          taskKey,
          error: redisError.message,
        });
      }
    }

    slackWebhook.sendWebhook(`"${serverName}" network bonding gateway status has been changed to "${targetState}"`)

    // Send success result
    const result: WorkerResult = {
      success: true,
      taskId,
      serverName,
      targetState,
      finalStatus: server.status,
      serverId,
      attempts,
      timestamp: new Date().toISOString(),
    };

    parentPort?.postMessage(result);

  } catch (error: any) {
    logger.error(`[Worker ${taskId}] Failed to update server state`, {
      serverName,
      targetState,
      error: error.message,
      stack: error.stack,
    });

    slackWebhook.sendWebhook(`Hey guys! I've noticed that our automation has failed to update the "${serverName}" network bonding gateway to ${targetState}. Please check it immediately.`)

    // Update Redis task status to failed if taskKey is provided
    if (taskKey) {
      try {
        await updateTaskStatus(taskKey, TaskStatus.FAILED, error.message);
      } catch (redisError: any) {
        logger.error(`[Worker ${taskId}] Failed to update Redis task status`, {
          taskKey,
          error: redisError.message,
        });
      }
    }

    // Send error result
    const result: WorkerResult = {
      success: false,
      taskId,
      serverName,
      targetState,
      error: error.message,
      timestamp: new Date().toISOString(),
    };

    parentPort?.postMessage(result);
  }
}

// Execute the worker task
updateServerState().catch((error) => {
  logger.error('Worker crashed', { error });
  process.exit(1);
});