// src/routes/studentRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getMyPTs } from "../controllers/studentController.js";

const router = express.Router();

router.get(
  "/me/pts",
  authMiddleware.authenTokenCookie,  // ✅ middleware xác thực
  authMiddleware.isStudent,          // ✅ middleware kiểm tra role
  getMyPTs
);

export default router;
