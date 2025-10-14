// routes/studentPackageRoutes.js

import express from 'express';
import { 
    getStudentPackages, 
    getPackageDetails
} from '../controllers/studentPackageController.js'; 

const router = express.Router();

// 1. Lấy tất cả gói tập của một học viên
router.get('/student/:studentId', getStudentPackages);

// 2. Lấy chi tiết một gói tập cụ thể
router.get('/:id', getPackageDetails); 

export default router;