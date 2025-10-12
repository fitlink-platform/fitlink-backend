import { StatusCodes } from 'http-status-codes'
import PTProfile from '~/models/PTProfile'
import User from '~/models/User'

/// GET /api/pt/profile/me
const getMyProfile = async (req, res) => {
    try {
        const ptId = req.user._id

        let profile = await PTProfile.findOne({ user: ptId })
        if (!profile) {
            profile = await PTProfile.create({
                user: ptId,
                location: { coords: { type: 'Point', coordinates: [0, 0] } }
            })
        }

        res.status(200).json({ success: true, data: profile })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
}


// PT tạo/cập nhật (upsert) profile của chính mình
const upsertMyProfile = async (req, res) => {
    try {
        const ptId = req.user?._id

        // (tuỳ chọn) bảo đảm user là pt
        const user = await User.findById(ptId).select('role')
        if (!user || user.role !== 'pt') {
            return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Chỉ PT mới cập nhật hồ sơ PT' })
        }

        // Chỉ cho phép update các field hợp lệ
        const allowed = [
            'bio', 'specialties', 'yearsExperience', 'priceRange',
            'avatar', 'certificates', 'gymLocation', 'socials',
            'videoIntroUrl', 'isAvailable'  // bạn có thể thêm/bớt theo schema của bạn
        ]
        const payload = {}
        allowed.forEach((k) => { if (typeof req.body[k] !== 'undefined') payload[k] = req.body[k] })

        const doc = await PTProfile.findOneAndUpdate(
            { user: ptId },
            { user: ptId, ...payload },
            { new: true, upsert: true, runValidators: true }
        )

        return res.status(StatusCodes.OK).json({ success: true, message: 'Lưu hồ sơ PT thành công', data: doc })
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Lỗi server', error: error.message })
    }
}

// Public: xem profile của 1 PT (ẩn thông tin nhạy cảm nếu có)
const getPTProfilePublic = async (req, res) => {
    try {
        const { ptId } = req.params
        const profile = await PTProfile.findOne({ user: ptId })
            .select('-internalNotes') // ví dụ ẩn field nội bộ nếu có
            .lean()

        if (!profile) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'PT chưa có hồ sơ' })
        return res.status(StatusCodes.OK).json({ success: true, data: profile })
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Lỗi server', error: error.message })
    }
}

// (tuỳ chọn) PT xoá hồ sơ của mình
const deleteMyProfile = async (req, res) => {
    try {
        const ptId = req.user?._id
        const r = await PTProfile.deleteOne({ user: ptId })
        if (r.deletedCount === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy hồ sơ để xoá' })
        }
        return res.status(StatusCodes.OK).json({ success: true, message: 'Đã xoá hồ sơ PT' })
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Lỗi server', error: error.message })
    }
}

export const ptProfileController = {
    getMyProfile,
    upsertMyProfile,
    getPTProfilePublic,
    deleteMyProfile
}
