import { ENV } from "@/configs";
import { AxiosInstance } from "axios";
import request from "./request";
import logger from "./logger";

export class SlackWebhook {
	private $request: AxiosInstance
	constructor() {
		this.$request = request.create({
			baseURL: ENV.SLACK.WEBHOOK_URL
		})
	}

	public async sendWebhook(message: string) {
		try {
			const response = await this.$request({
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				data: {
					message
				}
			})
			logger.info('Successfully sent message to Slack webhook', { status: response.status, message })
		} catch (err) {
			if (err instanceof Error) logger.error(`Failed sending webhook to Slack: ${err.message}`)
			else logger.error('Failed sending webhook with unknown error')
		}
	}
}