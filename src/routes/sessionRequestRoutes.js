import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
    studentRequestChange,
    studentRequestAbsent,
} from "../controllers/sessionRequestController.js";

const router = express.Router();

router.post("/student/request-change", authMiddleware.authenTokenCookie, studentRequestChange);
router.post("/student/request-absent", authMiddleware.authenTokenCookie, studentRequestAbsent);

export default router;
