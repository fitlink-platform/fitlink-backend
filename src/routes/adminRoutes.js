import express from 'express'
import { userAdminController } from '../controllers/userAdminController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

// USER
// Lấy danh sách user
router.get('/users', authMiddleware.authenTokenCookie, authMiddleware.isAdmin, userAdminController.getAllUsers)
// Block user
router.patch('/users/:id/block', authMiddleware.authenTokenCookie, authMiddleware.isAdmin, userAdminController.blockUser)
// Unlock user
router.patch('/users/:id/unlock', authMiddleware.authenTokenCookie, authMiddleware.isAdmin, userAdminController.unlockUser)
// Đếm số lượng khách hàng (role customer)
router.get('/users/count', authMiddleware.authenTokenCookie, authMiddleware.isAdmin, userAdminController.countCustomers)

export default router
