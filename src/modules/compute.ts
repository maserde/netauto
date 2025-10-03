import request from '@/utils/request'
import { CREDENTIALS } from '@/configs'
import logger from '@/utils/logger'
import type { AxiosInstance } from 'axios'
import type { ServerMetadata, ServersDetailResponse } from '@/types'


export const SERVER_STATES = ['UP', 'DOWN'] as const;

export type ServerState = typeof SERVER_STATES[number];

export class Compute {
	private $request: AxiosInstance
	constructor(_token: string) {
		this.$request = request.create({
			baseURL: CREDENTIALS.OPENSTACK.COMPUTE_BASE_URL,
			withCredentials: true,
			headers: {
				'X-Auth-Token': _token
			}
		})
	}

	public async getServers(): Promise<ServerMetadata[]> {
		try {
			const response = await this.$request.get<ServersDetailResponse>('/servers/detail');
			logger.info(`Retrieved ${response.data.servers.length} servers`, {
				serverCount: response.data.servers.length,
				servers: response.data.servers.map(s => ({
					id: s.id,
					name: s.name,
					status: s.status,
					addresses: s.addresses
				}))
			});
			return response.data.servers;
		} catch (error: any) {
			logger.error('Failed to retrieve servers', {
				error: error.message,
				status: error.response?.status,
				statusText: error.response?.statusText
			});
			throw error;
		}
	}

	/**
	 * Change server state (start/stop)
	 * @param serverId - The ID of the server
	 * @param state - The desired state ('UP' to start, 'DOWN' to stop)
	 * @returns Promise<void>
	 */
	public async changeServerState(serverId: string, state: ServerState): Promise<void> {
		try {
			logger.info(`Changing server ${serverId} state to ${state}`);

			let action: { [key: string]: null };

			if (state === 'UP') {
				action = { 'os-start': null };
			} else if (state === 'DOWN') {
				action = { 'os-stop': null };
			} else {
				throw new Error(`Invalid server state: ${state}. Must be 'UP' or 'DOWN'`);
			}

			// POST to /servers/{serverId}/action
			const response = await this.$request.post(
				`/servers/${serverId}/action`,
				action
			);

			logger.info(`Successfully sent ${state} action for server ${serverId}`, {
				serverId,
				action: state === 'UP' ? 'os-start' : 'os-stop',
				status: response.status,
			});

		} catch (error: any) {
			logger.error(`Failed to change server ${serverId} state to ${state}`, {
				serverId,
				state,
				error: error.message,
				status: error.response?.status,
				statusText: error.response?.statusText,
				data: error.response?.data,
			});
			throw error;
		}
	}

	/**
	 * Start a server (convenience method)
	 * @param serverId - The ID of the server to start
	 */
	public async startServer(serverId: string): Promise<void> {
		return this.changeServerState(serverId, 'UP');
	}

	/**
	 * Stop a server (convenience method)
	 * @param serverId - The ID of the server to stop
	 */
	public async stopServer(serverId: string): Promise<void> {
		return this.changeServerState(serverId, 'DOWN');
	}

	/**
	 * Get server details by ID
	 * @param serverId - The ID of the server
	 * @returns Promise<ServerMetadata>
	 */
	public async getServer(serverId: string): Promise<ServerMetadata> {
		try {
			const response = await this.$request.get<{ server: ServerMetadata }>(
				`/servers/${serverId}`
			);

			logger.info(`Retrieved server details for ${serverId}`, {
				id: response.data.server.id,
				name: response.data.server.name,
				status: response.data.server.status,
			});

			return response.data.server;
		} catch (error: any) {
			logger.error(`Failed to retrieve server ${serverId}`, {
				serverId,
				error: error.message,
				status: error.response?.status,
			});
			throw error;
		}
	}
}

export default Compute