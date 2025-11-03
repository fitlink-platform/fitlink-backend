import StudentProfile from '../models/StudentProfile.js'
import { StatusCodes } from 'http-status-codes'
import User from '../models/User.js'

export const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .lean()

    res.status(StatusCodes.OK).json(students)
  } catch (error) {
    console.error('Lỗi khi lấy danh sách student:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi server',
      error: error.message
    })
  }
}
