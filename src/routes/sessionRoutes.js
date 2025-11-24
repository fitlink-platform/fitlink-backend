import express from 'express'
import * as sessionController from '../controllers/sessionController.js'
import { protect } from '../middlewares/authMiddleware.js'
import { checkConflict } from "../controllers/sessionController.js";

const router = express.Router()
router.get('/pt', protect, sessionController.getSessionsByPT)
// dùng sessionController.updateSessionStatus để chắc chắn callback tồn tại
router.put('/:id/status', protect, sessionController.updateSessionStatus)
// routes/sessionRoutes.js
router.post("/check-conflict", protect, checkConflict);

export default router
