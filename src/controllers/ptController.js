import StudentPackage from '../models/StudentPackage.js';
import Package from '../models/Package.js';
import Transaction from '~/models/Transaction.js';
import User from '../models/User.js';
import PTProfile from '../models/PTProfile.js';
import { StatusCodes } from 'http-status-codes';
import Session from '../models/Session.js';
import Notification from '../models/Notification.js';
import SessionChangeRequest from '../models/SessionChangeRequest.js';

// ---- Endpoint ----
// GET /api/pt/me/verification-status
export const isPTVerified = async (req, res) => {
  try {
    const ptId = req.user._id

    const profile = await PTProfile.findOne({ user: ptId }).select('verified').lean()

    // Nếu chưa có hồ sơ -> coi như chưa verified
    const verified = !!profile?.verified

    return res.status(StatusCodes.OK).json({ verified })
  } catch (err) {
    console.error('isPTVerified error:', err)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: 'Server error' })
  }
}

// 🧠 Lấy tất cả học viên của PT (dựa trên gói)
// MỖI HỌC VIÊN CHỈ TRẢ VỀ 1 LẦN
export const getMyStudents = async (req, res) => {
  try {
    const ptId = req.user._id;

    const packages = await StudentPackage.find({ pt: ptId })
      .populate("student", "name avatar email phone")
      .populate("package", "name totalSessions durationDays")
      .lean();

    const map = new Map(); // key: studentId, value: info học viên

    for (const pkg of packages) {
      const s = pkg.student;
      if (!s) continue; // skip nếu dữ liệu lỗi

      const studentId = String(s._id);

      // Nếu chưa có trong map thì thêm vào
      if (!map.has(studentId)) {
        map.set(studentId, {
          _id: s._id,                // id học viên thật
          name: s.name,
          avatar: s.avatar,
          email: s.email,
          phone: s.phone,
          // nếu cần thông tin gói gần nhất thì giữ lại 1 cái
          packageId: pkg._id,
          packageName: pkg.package?.name,
          totalSessions: pkg.package?.totalSessions,
          durationDays: pkg.package?.durationDays,
        });
      }

      // Nếu sau này bạn muốn “ưu tiên gói mới nhất”, có thể update ở đây
      // ví dụ so sánh createdAt của pkg rồi overwrite
    }

    const students = Array.from(map.values());

    // Nếu FE đang đọc res.data.data thì trả như sau:
    // return res.json({ success: true, data: students });

    // Còn hiện tại bạn đang fallback cả 2 kiểu (data hoặc res trực tiếp)
    // nên trả thế này vẫn OK:
    return res.json({ success: true, data: students });
  } catch (err) {
    console.error("❌ getMyStudents error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// 🏷️ Lấy danh sách gói template của PT
export const getMyPackages = async (req, res) => {
  try {
    const ptId = req.user._id;
    const list = await Package.find({ pt: ptId, isActive: true }).lean();

    return res.json({ data: list });
  } catch (err) {
    console.error("getMyPackages error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ➕ Tạo gói cho học viên
export const createStudentPackage = async (req, res) => {
  const { student, package: pkgId, totalSessions, durationDays, startDate } = req.body;
  const stu = await User.findById(student).lean();
  if (!stu || stu.role !== 'student') return res.status(400).json({ message: 'Invalid student' });

  let ts = totalSessions, dd = durationDays;
  if (pkgId) {
    const pkg = await Package.findById(pkgId).lean();
    if (!pkg || String(pkg.pt) !== String(req.user._id))
      return res.status(400).json({ message: 'Package not found / not owned' });
    ts = ts ?? pkg.totalSessions;
    dd = dd ?? pkg.durationDays;
  }
  if (!ts || !dd) return res.status(400).json({ message: 'totalSessions/durationDays required' });

  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + dd);

  const newPkg = await StudentPackage.create({
    student,
    pt: req.user._id,
    package: pkgId || undefined,
    startDate: start,
    endDate: end,
    totalSessions: ts,
    remainingSessions: ts,
    status: 'active',
    createdByPT: true
  });

  res.status(201).json(newPkg);
};

// ✏️ Cập nhật gói
export const updateStudentPackage = async (req, res) => {
  const pkg = await StudentPackage.findOne({ _id: req.params.id, pt: req.user._id });
  if (!pkg) return res.status(404).json({ message: 'Not found' });

  Object.assign(pkg, req.body);
  if (pkg.remainingSessions > pkg.totalSessions)
    pkg.remainingSessions = pkg.totalSessions;
  await pkg.save();

  res.json(pkg);
};
// 🧩 Lấy tất cả PT (dành cho admin)
export const getAllPTs = async (req, res) => {
  try {
    // Lấy danh sách user có role là 'pt' (Personal Trainer)
    const pts = await User.find({ role: "pt" })
      .lean()
      .sort({ createdAt: -1 });

    res.status(200).json(pts);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách PT:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách PT" });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const ptId = req.user._id

    // 1) Số gói đã bán (StudentPackage của PT, trừ paused nếu muốn)
    const soldPackageCount = await StudentPackage.countDocuments({
      pt: ptId,
      status: { $in: ['active', 'completed', 'expired'] } // bỏ paused
    })

    // 2) Số học viên unique
    const studentIds = await StudentPackage.distinct('student', {
      pt: ptId,
      status: { $in: ['active', 'completed', 'expired'] }
    })
    const studentCount = studentIds.length

    // 3) Số package template đang active
    const packageTemplateCount = await Package.countDocuments({
      pt: ptId,
      isActive: true
    })

    // 4) Tổng tiền thu được – tạm thời = 0 nếu chưa nối với Transaction
    // Nếu sau này bạn có Transaction với field `amount` và status `paid`
    // thì chỉnh phần này:
    let totalRevenue = 0
    // ví dụ:
    const pkgs = await StudentPackage.find({
      pt: ptId,
      transaction: { $ne: null }
    }).select('transaction').lean()
    const transactionIds = pkgs.map(p => p.transaction)
    const agg = await Transaction.aggregate([
      { $match: { _id: { $in: transactionIds }, status: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$ptEarning' } } }
    ])
    totalRevenue = agg[0]?.totalRevenue || 0

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        studentCount,
        soldPackageCount,
        packageTemplateCount,
        totalRevenue
      }
    })
  } catch (err) {
    console.error('getDashboardStats error:', err)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: 'Server error' })
  }
}
//
// 1) GET REQUESTS FOR PT
//
export const ptGetRequests = async (req, res) => {
  try {
    const sessions = await Session.find({
      pt: req.user._id,
      requestStatus: {
        $in: ["change_request_pending", "absent_request_pending"],
      },
    })
      .populate("student", "name email")
      .lean();

    const sessionIds = sessions.map((s) => s._id);

    // Tìm request đổi lịch
    const changeRequests = await SessionChangeRequest.find({
      session: { $in: sessionIds },
      status: "pending",
    }).lean();

    const mapReq = {};
    changeRequests.forEach((r) => {
      mapReq[r.session.toString()] = r;
    });

    const result = sessions.map((s) => ({
      ...s,
      requestInfo: s.requestType === "change" ? mapReq[s._id.toString()] : {
        reason: s.requestReason,
      },
    }));

    return res.status(StatusCodes.OK).json(result);
  } catch (err) {
    console.error("ptGetRequests error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Lỗi hệ thống",
    });
  }
};

//
// 2) APPROVE REQUEST
//
// APPROVE REQUEST — FINAL VERSION
export const ptApproveRequest = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId)
      return res.status(400).json({ message: "Thiếu sessionId" });

    const session = await Session.findById(sessionId)
      .populate("student", "name")
      .populate("pt", "name");

    if (!session)
      return res.status(404).json({ message: "Session không tồn tại" });

    if (String(session.pt._id) !== String(req.user._id))
      return res.status(403).json({ message: "Không có quyền" });

    const type = session.requestType;
    if (!["change", "absent"].includes(type))
      return res.status(400).json({ message: "Yêu cầu không hợp lệ" });

    const oldStart = session.startTime;
    const oldEnd = session.endTime;

    // ============================================
    // 💚 APPROVE CHANGE (đổi lịch)
    // ============================================
    if (type === "change") {
      const reqDoc = await SessionChangeRequest.findOne({
        session: sessionId,
        status: "pending",
      });

      if (!reqDoc)
        return res.status(400).json({ message: "Không tìm thấy request đổi lịch" });

      // cập nhật thời gian mới
      session.startTime = reqDoc.newStartTime;
      session.endTime = reqDoc.newEndTime;

      // complete request
      reqDoc.status = "approved";
      await reqDoc.save();

      // 🔔 notify student
      await Notification.create({
        user: session.student._id,
        type: "session",
        title: "PT đã chấp nhận yêu cầu đổi lịch",
        message: `PT ${session.pt.name} đã CHẤP NHẬN yêu cầu đổi lịch.`,
        meta: {
          sessionId,
          requestType: "change",
          oldStartTime: oldStart,
          oldEndTime: oldEnd,
          newStartTime: reqDoc.newStartTime,
          newEndTime: reqDoc.newEndTime,
        },
      });

      // giữ nguyên status schedule
      session.status = "scheduled";
    }

    // ============================================
    // 💛 APPROVE ABSENT (xin nghỉ)
    // ============================================
    if (type === "absent") {
      // ❗ Buổi này được tính là vắng
      session.status = "missed";

      await Notification.create({
        user: session.student._id,
        type: "session",
        title: "PT đã chấp nhận yêu cầu xin nghỉ",
        message: `PT ${session.pt.name} đã CHẤP NHẬN yêu cầu xin nghỉ.`,
        meta: {
          sessionId,
          requestType: "absent",
          oldStartTime: oldStart,
          oldEndTime: oldEnd,
          reason: session.requestReason,
        },
      });
    }

    // ============================================
    // ⭐ RESET request để student có thể gửi lại
    // ============================================
    session.requestType = null;
    session.requestStatus = null;
    session.requestReason = null;

    await session.save();

    return res.json({ message: "Đã chấp nhận yêu cầu", session });

  } catch (e) {
    console.error("approve error", e);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};


// REJECT REQUEST — FINAL VERSION
export const ptRejectRequest = async (req, res) => {
  try {
    const { sessionId, reason, requestType } = req.body;

    if (!sessionId || !reason) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Thiếu sessionId hoặc lý do từ chối",
      });
    }

    const session = await Session.findById(sessionId)
      .populate("student", "name email")
      .populate("pt", "name email");

    if (!session) {
      return res.status(404).json({ message: "Session không tồn tại" });
    }

    if (String(session.pt._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Không có quyền xử lý" });
    }

    const realType = session.requestType || requestType;

    if (!realType || !["change", "absent"].includes(realType)) {
      return res.status(400).json({
        message: "Yêu cầu không hợp lệ hoặc đã xử lý",
      });
    }

    // Nếu là CHANGE → reject request trong bảng SessionChangeRequest
    if (realType === "change") {
      await SessionChangeRequest.findOneAndUpdate(
        { session: sessionId, status: "pending" },
        { status: "rejected", rejectReason: reason }
      );
    }

    // Reset session để student có thể gửi lại
    const oldStartTime = session.startTime;
    const oldEndTime = session.endTime;

    session.requestType = null;
    session.requestStatus = null;
    session.requestReason = null;
    session.status = "scheduled";

    await session.save();

    // 🔔 Gửi thông báo CHO STUDENT — CÓ LÝ DO PT ghi trong prompt
    await Notification.create({
      user: session.student._id,
      type: "session",
      title:
        realType === "change"
          ? "❌ PT đã từ chối yêu cầu đổi lịch"
          : "❌ PT đã từ chối yêu cầu xin nghỉ",
      message:
        realType === "change"
          ? `PT ${session.pt.name} đã TỪ CHỐI yêu cầu đổi lịch.\nLý do: ${reason}`
          : `PT ${session.pt.name} đã TỪ CHỐI yêu cầu xin nghỉ.\nLý do: ${reason}`,
      meta: {
        sessionId: session._id,
        requestType: realType,
        action: "rejected",
        oldStartTime,
        oldEndTime,
        rejectReason: reason,   // ⭐ gửi chính xác lý do PT nhập
      },
    });

    return res.json({ message: "Đã từ chối yêu cầu", session });
  } catch (err) {
    console.error("ptRejectRequest error:", err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};



// src/controllers/ptController.js

export const updateSessionTimeByPT = async (req, res) => {
  try {
    const { id } = req.params;       // ✔ sessionId = id
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Thiếu startTime hoặc endTime" });
    }

    // ✔ Sửa QUERY đúng
    const session = await Session.findOne({
      _id: id,
      pt: req.user._id,
    });

    if (!session) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Session không tồn tại hoặc bạn không có quyền" });
    }

    session.startTime = new Date(startTime);
    session.endTime = new Date(endTime);

    await session.save();

    return res.status(StatusCodes.OK).json({
      message: "Cập nhật lịch buổi tập thành công",
      session,
    });
  } catch (err) {
    console.error("updateSessionTimeByPT error:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Lỗi hệ thống" });
  }
};


export const ptController = {
  isPTVerified,
  getMyStudents,
  getMyPackages,
  createStudentPackage,
  updateStudentPackage,
  getAllPTs,
  getDashboardStats,
  ptGetRequests,
  ptApproveRequest,
  ptRejectRequest,
  updateSessionTimeByPT
};