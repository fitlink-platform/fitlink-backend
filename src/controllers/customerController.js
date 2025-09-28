import { StatusCodes } from 'http-status-codes'

const getInfo = (req, res) => {
  const user = req.user
  res.status(StatusCodes.ACCEPTED).json(user)
}

export const customerController = {
  getInfo
}