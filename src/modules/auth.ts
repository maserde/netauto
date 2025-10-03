import { CREDENTIALS } from "@/configs"
import request from '@/utils/request'
import logger from '@/utils/logger'
import { AxiosInstance } from "axios"

export class Auth {
	private _token: string | undefined
	private $request: AxiosInstance
	constructor() {
		this.$request = request.create({
			baseURL: CREDENTIALS.OPENSTACK.AUTH_URL
		})
	}
	public async login() {
		try {
			const response = await this.$request.post('/v3/auth/tokens', {
				auth: {
					identity: {
						methods: [
							"password"
						],
						password: {
							user: {
								domain: {
									"name": CREDENTIALS.OPENSTACK.USER_DOMAIN
								},
								name: CREDENTIALS.OPENSTACK.USERNAME,
								password: CREDENTIALS.OPENSTACK.PASSWORD
							}
						}
					},
					scope: {
						project: {
							domain: {
								name: CREDENTIALS.OPENSTACK.USER_DOMAIN
							},
							name: CREDENTIALS.OPENSTACK.PROJECT_NAME
						}
					}
				}
			},
				{
					params: {
						nocatalog: null
					}
				})
			this._token = response.headers.hasOwnProperty('x-subject-token') ? response.headers['x-subject-token'] : undefined
			logger.debug('Authentication success', {
				token: this._token
			})
		} catch (err: any) {
			logger.error(`Authentication failed`, { err })
		}
	}

	public get token() {
		return this._token
	}
}

export default Auth