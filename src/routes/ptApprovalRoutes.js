import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { submitPTApprovalRequest } from "../controllers/ptApprovalController.js";

const router = express.Router();

router.post(
  "/approval-request",
  authMiddleware.authenTokenCookie,
  authMiddleware.isPT,
  submitPTApprovalRequest
);

export default router;
