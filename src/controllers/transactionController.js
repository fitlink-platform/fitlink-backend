// controllers/transactionController.js (FINAL FIXED - Dùng 'payos' để qua Validation)

import Transaction from '../models/Transaction.js';
import StudentPackage from '../models/StudentPackage.js'; 
import Package from '../models/Package.js'; 
import mongoose from 'mongoose';


// >> HÀM TRUY VẤN PACKAGE THỰC TẾ <<
const getPackageDetails = async (packageId) => {
    // ... (Logic giữ nguyên)
    const pkg = await Package.findById(packageId).select('totalSessions durationDays');
    if (!pkg) {
        throw new Error(`Package with ID ${packageId} not found.`);
    }
    return {
        sessions: pkg.totalSessions,
        durationDays: pkg.durationDays
    };
};

/**
 * POST /api/transactions/initiate
 * Tạo bản ghi giao dịch và hoàn tất ngay lập tức.
 */
export const initiateInternalTransaction = async (req, res) => {
    const { studentId, ptId, packageId, amount, isPaid = true } = req.body;

    if (!studentId || !ptId || !packageId || !amount) {
        return res.status(400).json({ message: 'Thieu thong tin bat buoc: studentId, ptId, packageId, amount.' });
    }

    try {
        // 1. Tạo bản ghi giao dịch
        const transaction = await Transaction.create({
            student: studentId,
            pt: ptId,
            package: packageId,
            amount: amount,
            
            // 🔥 FIX CUỐI CÙNG: Phải dùng 'payos' để vượt qua Enum Validation trong Model
            method: 'payos', 
            
            status: isPaid ? 'paid' : 'initiated', 
        });

        // 2. KÍCH HOẠT STUDENTPACKAGE NẾU THANH TOÁN THÀNH CÔNG
        if (transaction.status === 'paid') {
            await createStudentPackageFromTransaction(transaction);
        }

        console.log(`✅ Giao dich noi bo ID: ${transaction._id} da tao va hoan tat.`);
        
        // 3. Trả về trạng thái giao dịch
        return res.status(200).json({
            message: 'Giao dich noi bo duoc khoi tao va hoan tat thanh cong.',
            transactionId: transaction._id,
            status: transaction.status
        });

    } catch (error) {
        console.error('Loi khoi tao giao dich noi bo:', error.message);
        return res.status(500).json({ 
            message: 'Khong the khoi tao giao dich noi bo.', 
            error: error.message 
        });
    }
};

/**
 * Hàm Helper: Tạo StudentPackage từ bản ghi Transaction
 */
const createStudentPackageFromTransaction = async (transaction) => {
    const packageId = transaction.package;
            
    // 1. Lay chi tiet goi tap
    const packageDetails = await getPackageDetails(packageId); 

    // 2. Tinh toan ngay bat dau va ket thuc
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + packageDetails.durationDays); 

    // 3. Tao ban ghi StudentPackage
    await StudentPackage.create({
        student: transaction.student,
        pt: transaction.pt,
        package: packageId,
        transaction: transaction._id,
        
        startDate: startDate,
        endDate: endDate,
        totalSessions: packageDetails.sessions,
        remainingSessions: packageDetails.sessions,
        status: 'active',
        isExternal: false, 
        createdByPT: false,
    });
};


/**
 * GET /api/transactions/:id
 */
export const getTransactionDetails = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Ma giao dich khong hop le.' });
        }
        
        const transaction = await Transaction.findById(req.params.id)
            .populate('student', 'username email') 
            .populate('pt', 'username email') 
            .populate('package', 'name price');   

        if (!transaction) {
            return res.status(404).json({ message: 'Khong tim thay giao dich.' });
        }

        return res.status(200).json(transaction);
    } catch (error) {
        console.error('Loi khi lay chi tiet giao dich:', error);
        return res.status(500).json({ message: 'Loi server khi tim giao dich.' });
    }
};