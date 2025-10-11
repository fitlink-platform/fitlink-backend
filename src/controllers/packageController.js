// src/controllers/packageController.js
import { StatusCodes } from 'http-status-codes'
import Package from '~/models/Package'
import StudentPackage from '~/models/StudentPackage'

// PT tạo gói mới (route nên gắn authMiddleware.authenTokenCookie + isPT)
const createPackage = async (req, res) => {
  try {
    const { name, description, price, totalSessions, durationDays, visibility, tags } = req.body

    if (!name || !totalSessions || !durationDays) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ: tên gói, số buổi, thời hạn'
      })
    }

    const pkg = await Package.create({
      pt: req.user?._id,
      name,
      description,
      price: price ?? 0,            // model đã round & validate min/max
      totalSessions,
      durationDays,
      visibility: visibility || 'private',
      tags: tags || []
    })

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo gói tập thành công',
      data: pkg
    })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Tên gói đã tồn tại trong tài khoản PT'
      })
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    })
  }
}

// PT xem danh sách gói của mình (có phân trang)
const getMyPackages = async (req, res) => {
  try {
    const { isActive, page = '1', limit = '10' } = req.query
    const _page = Math.max(1, parseInt(page, 10) || 1)
    const _limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10))

    const filter = { pt: req.user?._id }
    if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true'

    const [items, total] = await Promise.all([
      Package.find(filter).sort({ createdAt: -1 }).limit(_limit).skip((_page - 1) * _limit),
      Package.countDocuments(filter)
    ])

    return res.status(StatusCodes.OK).json({
      success: true,
      data: items,
      pagination: { total, page: _page, pages: Math.ceil(total / _limit) }
    })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    })
  }
}

// Public: Student xem danh sách gói của 1 PT (chỉ show gói đang active; tùy bạn bổ sung visibility='public')
const getPackagesByPTPublic = async (req, res) => {
  try {
    const { ptId } = req.params
    const items = await Package.find({ pt: ptId, isActive: true }).sort({ createdAt: -1 })
    return res.status(StatusCodes.OK).json({ success: true, data: items })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    })
  }
}

// Xem chi tiết một gói (PT chủ gói hoặc gói public mới xem được)
const getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id).populate('pt', 'name avatar')
    if (!pkg) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy gói tập' })
    }

    const isOwner = req.user && String(pkg.pt._id) === String(req.user._id)
    const isPublic = pkg.visibility === 'public'
    if (!isOwner && !isPublic) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Bạn không có quyền xem gói này' })
    }

    return res.status(StatusCodes.OK).json({ success: true, data: pkg })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    })
  }
}

// PT cập nhật gói của mình
const updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id)
    if (!pkg) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy gói tập' })
    }
    if (String(pkg.pt) !== String(req.user._id)) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Bạn không có quyền sửa gói này' })
    }

    const allowedFields = ['name', 'description', 'price', 'totalSessions', 'durationDays', 'isActive', 'visibility', 'tags']
    for (const f of allowedFields) if (typeof req.body[f] !== 'undefined') pkg[f] = req.body[f]
    await pkg.save()

    return res.status(StatusCodes.OK).json({ success: true, message: 'Cập nhật gói thành công', data: pkg })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: 'Tên gói đã tồn tại trong tài khoản PT' })
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Lỗi server', error: error.message })
  }
}

// PT ẩn gói (soft delete = set isActive=false) – chặn nếu đang có học viên active dùng gói
const deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id)
    if (!pkg) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy gói tập' })
    }
    if (String(pkg.pt) !== String(req.user._id)) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Bạn không có quyền ẩn gói này' })
    }

    const activeCount = await StudentPackage.countDocuments({ package: pkg._id, status: 'active' })
    if (activeCount > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Không thể ẩn gói này vì đang có ${activeCount} học viên sử dụng`
      })
    }

    pkg.isActive = false
    await pkg.save()
    return res.status(StatusCodes.OK).json({ success: true, message: 'Đã ẩn gói tập thành công' })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Lỗi server', error: error.message })
  }
}

// PT xoá hẳn gói (hard delete) – chỉ khi chưa từng được dùng
const hardDeletePackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id)
    if (!pkg) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy gói tập' })
    }
    if (String(pkg.pt) !== String(req.user._id)) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Bạn không có quyền xoá gói này' })
    }

    const usedCount = await StudentPackage.countDocuments({ package: pkg._id })
    if (usedCount > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Không thể xoá gói đã có học viên sử dụng' })
    }

    await pkg.deleteOne()
    return res.status(StatusCodes.OK).json({ success: true, message: 'Đã xoá gói tập vĩnh viễn' })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Lỗi server', error: error.message })
  }
}

export const packageController = {
  createPackage,
  getMyPackages,
  getPackagesByPTPublic, // cho Student duyệt & mua
  getPackageById,
  updatePackage,
  deletePackage,
  hardDeletePackage
}
