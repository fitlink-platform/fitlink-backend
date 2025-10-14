// routes/transactionRoutes.js (ĐÃ SỬA LỖI ReferenceError)

import express from 'express';
import { 
    // 💡 Đã sửa tên import từ initiateInternalTransaction sang initiateTransaction
    initiateTransaction, 
    // 💡 Thêm completeTransaction (nếu bạn có endpoint /complete/:id)
    completeTransaction,
    getTransactionDetails, 
} from '../controllers/transactionController.js'; // Kiểm tra đường dẫn có đúng không

const router = express.Router();

// Endpoint mới: Client/Admin gọi để tạo và hoàn tất giao dịch nội bộ
// Dòng này bây giờ đã dùng được vì hàm đã được import đúng tên
router.post('/initiate', initiateTransaction); 

// Thêm endpoint cho bên thanh toán hoàn tất giao dịch (rất quan trọng)
router.post('/complete/:id', completeTransaction); 

// Endpoint để client/admin xem chi tiết giao dịch 
router.get('/:id', getTransactionDetails);

export default router;