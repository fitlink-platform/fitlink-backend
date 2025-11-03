import StudentPackage from '../models/StudentPackage.js';
import Package from '../models/Package.js';
import User from '../models/User.js';

// 🧠 Lấy tất cả học viên của PT (dựa trên gói)
export const getMyStudents = async (req, res) => {
  const ptId = req.user._id;
  const data = await StudentPackage
    .find({ pt: ptId })
    .populate('student', 'name avatar email phone')
    .populate('package', 'name totalSessions durationDays')
    .lean();

  res.json(data);
};

// 🏷️ Lấy danh sách gói template của PT
export const getMyPackages = async (req, res) => {
  const ptId = req.user._id;
  const list = await Package.find({ pt: ptId, isActive: true }).lean();
  res.json(list);
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