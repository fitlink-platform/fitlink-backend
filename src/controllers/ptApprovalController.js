import PTApprovalRequest from "../models/PTApprovalRequest.js";
import PTProfile from "../models/PTProfile.js";
import User from "../models/User.js";
import { createNotification } from "../services/notificationService.js";
import { sendNewPTRequestEmail } from "../utils/mailer.js";

/**
 * 📨 PT gửi yêu cầu duyệt hồ sơ
 */
export const submitPTApprovalRequest = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id; // ✅ fix để lấy đúng id từ cookie-based auth
    console.log("👤 PT gửi yêu cầu:", req.user);

    // 🔍 Kiểm tra có hồ sơ PT chưa
    const ptProfile = await PTProfile.findOne({ user: userId });
    if (!ptProfile) {
      console.log("❌ Không tìm thấy hồ sơ PT cho userId:", userId);
      return res.status(404).json({ message: "Không tìm thấy hồ sơ PT" });
    }

    // ⚠️ Kiểm tra đã gửi yêu cầu trước đó chưa
    const existing = await PTApprovalRequest.findOne({
      user: userId,
      status: "pending",
    });
    if (existing) {
      console.log("⚠️ PT đã có yêu cầu pending:", existing._id);
      return res
        .status(400)
        .json({ message: "Bạn đã có yêu cầu đang chờ duyệt" });
    }

    // ✅ Tạo yêu cầu duyệt mới
    const newRequest = await PTApprovalRequest.create({
      user: userId,
      ptProfile: ptProfile._id,
      submittedProfile: ptProfile.toObject(),
      logs: [{ action: "submit", by: userId }],
    });

    console.log("✅ Đã tạo yêu cầu duyệt PT:", newRequest._id);

    // 📬 Gửi notification + mail cho admin
    const admins = await User.find({ role: "admin" });
    console.log(
      "🧩 Admins tìm thấy:",
      admins.map((a) => a.email)
    );

    for (const admin of admins) {
      console.log(`📨 Gửi thông báo & mail cho admin: ${admin.email}`);

      await createNotification({
        user: admin._id,
        type: "system",
        title: "Yêu cầu duyệt hồ sơ PT mới",
        message: `PT ${req.user.name} (${req.user.email}) vừa gửi yêu cầu duyệt hồ sơ.`,
        meta: { requestId: newRequest._id },
      });

      try {
        await sendNewPTRequestEmail(admin.email, req.user.name, req.user.email);
        console.log(`✅ Đã gửi email tới ${admin.email}`);
      } catch (mailError) {
        console.error(`❌ Lỗi khi gửi email tới ${admin.email}:`, mailError);
      }
    }

    console.log("🎉 Đã hoàn tất gửi yêu cầu duyệt PT");

    res.status(201).json({
      message: "Đã gửi yêu cầu duyệt hồ sơ PT",
      request: newRequest,
    });
  } catch (error) {
    console.error("💥 Lỗi trong submitPTApprovalRequest:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
