import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService.js";
import { StatusCodes } from "http-status-codes";

/**
 * 📋 Lấy danh sách thông báo của user hiện tại
 */
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const notifications = await getUserNotifications(userId, limit);
    res.status(StatusCodes.OK).json(notifications);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Lỗi khi lấy thông báo", error: error.message });
  }
};

/**
 * ✅ Đánh dấu 1 thông báo là đã đọc
 */
export const markAsRead = async (req, res) => {
  try {
    const updated = await markNotificationAsRead(req.params.id);
    if (!updated)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Không tìm thấy thông báo" });
    res
      .status(StatusCodes.OK)
      .json({ message: "Đã đánh dấu đã đọc", notification: updated });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Lỗi khi cập nhật", error: error.message });
  }
};

/**
 * ✅ Đánh dấu tất cả là đã đọc
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await markAllNotificationsAsRead(userId);
    res
      .status(StatusCodes.OK)
      .json({ message: "Đã đánh dấu tất cả là đã đọc" });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Lỗi khi cập nhật", error: error.message });
  }
};
