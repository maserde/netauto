import { Router } from 'express'

import webhookRouter from './webhook'

const router = Router()

router.use('/v1/webhooks', webhookRouter)

export default router