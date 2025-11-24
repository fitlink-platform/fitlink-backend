// controllers/sessionRequestController.js
import Session from "../models/Session.js";
import SessionChangeRequest from "../models/SessionChangeRequest.js";
import { StatusCodes } from "http-status-codes";
import Notification from "../models/Notification.js";

//
// 1) STUDENT REQUEST CHANGE (Đổi lịch)
//
export const studentRequestChange = async (req, res) => {
    try {
        const { sessionId, reason, newStartTime, newEndTime } = req.body;

        if (!sessionId || !reason || !newStartTime || !newEndTime) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Thiếu thông tin yêu cầu.",
            });
        }

        const session = await Session.findById(sessionId)
            .populate("student", "name email")
            .populate("pt", "name email");

        if (!session) return res.status(404).json({ message: "Session không tồn tại" });

        // Kiểm tra student đúng buổi
        if (String(session.student._id) !== String(req.user._id)) {
            return res.status(403).json({ message: "Không có quyền gửi yêu cầu." });
        }

        // ⭐ CHO PHÉP GỬI LẠI → xoá pending cũ
        await SessionChangeRequest.updateMany(
            { session: sessionId, status: "pending" },
            { status: "expired" }
        );

        // Tạo request mới
        const requestDoc = await SessionChangeRequest.create({
            session: sessionId,
            student: session.student._id,
            pt: session.pt._id,
            reason,
            newStartTime,
            newEndTime,
        });

        // Update trạng thái session
        session.requestType = "change";
        session.requestStatus = "change_request_pending";
        session.requestReason = reason;
        await session.save();

        // Gửi thông báo cho PT
        await Notification.create({
            user: session.pt._id,
            type: "session",
            title: "📌 Yêu cầu đổi lịch mới",
            message: `Học viên ${session.student.name} gửi yêu cầu đổi lịch.`,
            meta: {
                sessionId,
                requestType: "change",
                actions: ["accept", "reject"],
                oldStartTime: session.startTime,
                oldEndTime: session.endTime,
                newStartTime,
                newEndTime,
                reason,
            },
        });

        return res.json({ message: "Đã gửi yêu cầu đổi lịch.", request: requestDoc });
    } catch (err) {
        console.error("ERROR studentRequestChange:", err);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

//
// 2) STUDENT REQUEST ABSENT (Xin nghỉ)
//
export const studentRequestAbsent = async (req, res) => {
    try {
        const { sessionId, reason } = req.body;

        if (!sessionId || !reason) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ message: "Thiếu thông tin yêu cầu." });
        }

        const session = await Session.findById(sessionId)
            .populate("student", "name email")
            .populate("pt", "name email");

        if (!session) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Session không tồn tại" });
        }
        await SessionChangeRequest.updateMany(
            { session: sessionId, status: "pending" },
            { status: "expired" }
        );
        if (String(session.student._id) !== String(req.user._id)) {
            return res
                .status(StatusCodes.FORBIDDEN)
                .json({ message: "Không có quyền gửi yêu cầu nghỉ buổi." });
        }

        // Update trạng thái session
        session.requestType = null;
        session.requestStatus = null;
        session.requestReason = null;
        session.status = "scheduled"; // ✔ trở về schedule
        await session.save();

        await Notification.create({
            user: session.pt._id,
            type: "session",
            title: "📌 Yêu cầu xin nghỉ",
            message: `Học viên ${session.student?.name} xin nghỉ buổi tập.`,
            meta: {
                sessionId,
                requestType: "absent",
                actions: ["accept", "reject"],
                oldStartTime: session.startTime,
                oldEndTime: session.endTime,
                reason
            },
        });
        session.requestType = "absent";
        session.requestStatus = "absent_request_pending";
        session.requestReason = reason;
        session.status = "scheduled";
        await session.save();

        return res.status(StatusCodes.OK).json({
            message: "Đã gửi yêu cầu xin nghỉ.",
        });
    } catch (err) {
        console.error("ERROR studentRequestAbsent:", err);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ message: "Lỗi hệ thống" });
    }
};
