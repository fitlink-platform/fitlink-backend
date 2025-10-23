import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// ✅ Lấy danh sách thông báo của user hiện tại
router.get("/", authMiddleware.authenTokenCookie, getMyNotifications);

// ✅ Đánh dấu 1 thông báo là đã đọc
router.patch("/:id/read", authMiddleware.authenTokenCookie, markAsRead);

// ✅ Đánh dấu tất cả thông báo là đã đọc
router.patch("/mark-all", authMiddleware.authenTokenCookie, markAllAsRead);

export default router;
