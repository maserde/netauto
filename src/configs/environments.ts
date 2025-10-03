export const ENV = {
	port: process.env.PORT,
	REDIS: {
		HOST: process.env.REDIS_HOST || '127.0.0.1',
		PORT: process.env.REDIS_PORT || '6379',
		PASSWORD: process.env.REDIS_PASSWORD || ''
	}
}