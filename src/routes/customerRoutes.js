import express from 'express'
import { customerController } from '~/controllers/customerController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const router = express.Router()

// router.get('/get-info', authMiddleware.authenToken, authMiddleware.isCustomer, customerController.getInfo)

export default router
