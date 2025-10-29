// src/controllers/studentController.js
import StudentPackage from "../models/StudentPackage.js";
import { StatusCodes } from "http-status-codes";

export const getMyPTs = async (req, res) => {
  try {
    const studentId = req.user._id;

    const packages = await StudentPackage.find({
      student: studentId,
      status: "active",
    })
      .populate("pt", "name avatar email phone")
      .populate({
        path: "package",
        select: "name totalSessions durationDays",
      })
      .lean();

    const pts = packages
      .filter(pkg => pkg.pt)
      .map(pkg => ({
        _id: pkg.pt._id,
        name: pkg.pt.name,
        avatar: pkg.pt.avatar,
        email: pkg.pt.email,
        phone: pkg.pt.phone,
        packageId: pkg._id,
        packageName: pkg.package?.name,
        totalSessions: pkg.package?.totalSessions,
        durationDays: pkg.package?.durationDays,
        startDate: pkg.startDate,
        endDate: pkg.endDate,
        remainingSessions: pkg.remainingSessions,
        status: pkg.status,
      }));

    return res.status(StatusCodes.OK).json({
      success: true,
      data: pts,
    });
  } catch (err) {
    console.error("❌ getMyPTs error:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error" });
  }
};
