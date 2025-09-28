import bcrypt from 'bcrypt'
import User from '~/models/User'
import { StatusCodes } from 'http-status-codes'
import { genarateAccessToken } from '~/utils/genarateTokens'
import { sendResetPasswordEmail } from '../utils/mailer'
import { generateResetToken } from '../utils/genarateTokens'
import crypto from 'crypto'

const registerByPhone = async (req, res) => {
  try {
    const { phone, password, name, email } = req.body

    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Số điện thoại đã được đăng ký' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({ phone, password: hashedPassword, name, email })
    await newUser.save()

    res.status(201).json({ message: 'Tạo tài khoản thành công' })
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message })
  }
}

const login = async (req, res) => {
  const { phone, password } = req.body

  const currentUser = await User.findOne({ phone })


  if (!currentUser) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Số điện thoại chua đăng ký' })
  }
  if (!currentUser.isActive) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: 'Tài khoản của bạn đã bị khóa' })
  }

  if (!(await bcrypt.compare(password, currentUser.password))) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Sai MK' })
  }

  if (currentUser.isActive === false) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: 'Tài khoản của bạn đã bị khóa' })
  }

  const payload = {
    _id: currentUser._id,
    role: currentUser.role,
    phone: currentUser.phone,
    name: currentUser.name,
    avatar: currentUser.avatar,
    email: currentUser.email
  }

  const accessToken = genarateAccessToken(payload)

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: false, // nếu dùng HTTPS thì để true
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 ngày
  })
  res.json({ message: 'Login successful' })
}

const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false // nếu dùng HTTPS thì để true
  })

  res.status(200).json({ message: 'Logged out successfully' })

}

const forgotPassword = async (req, res) => {
  const { phone } = req.body

  try {
    const user = await User.findOne({ phone, role: 'customer' })

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    }

    if (!user.email) {
      return res.status(404).json({ message: 'Không tìm thấy email của người dùng' })
    }

    const { token, expires } = generateResetToken()
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    user.resetPasswordToken = hashedToken
    user.resetTokenExpires = expires
    await user.save()

    const resetLink = `http://localhost:5173/reset-password/${token}`
    console.log(`Reset link: ${resetLink}`)

    await sendResetPasswordEmail(user.email, user.name || 'bạn', resetLink)

    return res.status(200).json({ message: 'Đã gửi link đặt lại mật khẩu đến email!' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Lỗi server' })
  }
}

const resetPassword = async (req, res) => {
  const { token } = req.params
  const { password, confirmPassword } = req.body

  // 1. Kiểm tra đầy đủ thông tin
  if (!password || !confirmPassword) {
    return res.status(400).json({ message: 'Vui lòng nhập đủ thông tin.' })
  }

  // 2. Kiểm tra 2 password có giống nhau không
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu không khớp.' })
  }

  // 3. Tìm user theo hashed token và kiểm tra thời hạn
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetTokenExpires: { $gt: Date.now() }
  })

  if (!user) {
    return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  // 4. Lưu mật khẩu mới (hash nếu cần)
  user.password = hashedPassword
  user.resetPasswordToken = undefined
  user.resetTokenExpires = undefined
  await user.save()

  return res.json({ message: 'Mật khẩu đã được cập nhật thành công!' })
}

export const authController = {
  registerByPhone,
  login,
  logout,
  forgotPassword,
  resetPassword
}
