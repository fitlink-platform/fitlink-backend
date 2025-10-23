import Notification from "../models/Notification.js";

/**
 * 📨 Tạo thông báo mới
 * @param {Object} options
 * @param {String} options.user - ID người nhận
 * @param {String} options.title - Tiêu đề
 * @param {String} options.message - Nội dung
 * @param {String} [options.type='system'] - Loại thông báo ('system', 'package', ...)
 * @param {Object} [options.meta] - Thông tin phụ (vd: requestId, link, data thêm)
 */
export const createNotification = async ({
  user,
  title,
  message,
  type = "system",
  meta = {},
}) => {
  try {
    const notification = await Notification.create({
      user,
      title,
      message,
      type,
      meta,
      read: false,
    });
    console.log(`📩 Notification created for user ${user}: ${title}`);
    return notification;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
  }
};

/**
 * 📋 Lấy danh sách thông báo của người dùng
 * @param {String} userId - ID người dùng
 * @param {Number} [limit=20]
 */
export const getUserNotifications = async (userId, limit = 20) => {
  try {
    return await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return [];
  }
};

/**
 * ✅ Đánh dấu 1 thông báo là đã đọc
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
  }
};

/**
 * ✅ Đánh dấu tất cả thông báo là đã đọc (theo user)
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );
    console.log(`✅ All notifications marked as read for user ${userId}`);
  } catch (error) {
    console.error("❌ Error marking all as read:", error);
  }
};
