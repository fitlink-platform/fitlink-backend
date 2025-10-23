import express from "express";
import { userAdminController } from "../controllers/userAdminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// USER
// Lấy danh sách user
router.get(
  "/users",
  authMiddleware.authenTokenCookie,
  authMiddleware.isAdmin,
  userAdminController.getAllUsers
);
// Block user
router.patch(
  "/users/:id/block",
  authMiddleware.authenTokenCookie,
  authMiddleware.isAdmin,
  userAdminController.blockUser
);
// Unlock user
router.patch(
  "/users/:id/unlock",
  authMiddleware.authenTokenCookie,
  authMiddleware.isAdmin,
  userAdminController.unlockUser
);
// Đếm số lượng khách hàng (role customer)
router.get(
  "/users/count",
  authMiddleware.authenTokenCookie,
  authMiddleware.isAdmin,
  userAdminController.countCustomers
);

// ✅ Thêm mới các route duyệt PT
router.get(
  "/pt-requests",
  authMiddleware.authenTokenCookie,
  authMiddleware.isAdmin,
  userAdminController.getAllPTRequests
);
router.get(
  "/pt-requests/:id",
  authMiddleware.authenTokenCookie,
  authMiddleware.isAdmin,
  userAdminController.getPTRequestDetail
);
router.post(
  "/pt-requests/:id/review",
  authMiddleware.authenTokenCookie,
  authMiddleware.isAdmin,
  userAdminController.reviewPTRequest
);
export default router;
