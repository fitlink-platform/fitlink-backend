// routes/transactionRoutes.js (FINAL FIXED)

import express from 'express';
import { 
    initiateInternalTransaction,
    getTransactionDetails, 
} from '../controllers/transactionController.js';

const router = express.Router();

// Endpoint mới: Client/Admin gọi để tạo và hoàn tất giao dịch nội bộ
router.post('/initiate', initiateInternalTransaction); 

// Endpoint để client/admin xem chi tiết giao dịch 
router.get('/:id', getTransactionDetails);

export default router;