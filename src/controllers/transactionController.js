import Transaction from '../models/Transaction.js';
import StudentPackage from '../models/StudentPackage.js'; 
import Package from '../models/Package.js'; 
import mongoose from 'mongoose';


// >> HÀM TRUY VẤN PACKAGE THỰC TẾ <<
const getPackageDetails = async (packageId) => {
    // Logic: Lấy thông tin session và thời hạn từ Package
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

// ----------------------------------------------------------------------
// >> API CHÍNH <<
// ----------------------------------------------------------------------

/**
 * POST /api/transactions/initiate
 * Tạo bản ghi giao dịch chờ. Xử lý logic 0 VND ngay lập tức.
 */
export const initiateTransaction = async (req, res) => {
    // SỬ DỤNG 'price' theo yêu cầu
    const { studentId, ptId, packageId, price } = req.body; 

    // Kiểm tra validation cho các trường bắt buộc
    if (!studentId || !ptId || !packageId || price === undefined || price === null) {
        return res.status(400).json({ message: 'Thieu thong tin bat buoc: studentId, ptId, packageId, price.' });
    }

    try {
        // 1. Tạo bản ghi giao dịch với status: 'initiated'
        let transaction = await Transaction.create({
            student: studentId,
            pt: ptId,
            package: packageId,
            price: price, // Sử dụng trường price
            status: 'initiated', // Mặc định là 'initiated'
            method: 'payos', // Phương thức thanh toán giả định
            amount: 1
        });

        // 2. LOGIC BÌNH THƯỜNG (cho gói > 0 VND)
        console.log(`✅ Giao dich ID: ${transaction._id} da tao voi trang thai 'initiated', cho thanh toan.`);
        return res.status(201).json({
            message: 'Giao dich duoc khoi tao thanh cong. Dang cho thanh toan.',
            transactionId: transaction._id,
            status: transaction.status,
            price: price,
            // Thêm các thông tin cần thiết cho cổng thanh toán ở đây (ví dụ: checkoutUrl)
        });

    } catch (error) {
        console.error('Loi khoi tao giao dich:', error.message);
        return res.status(500).json({ 
            message: 'Khong the khoi tao giao dich.', 
            error: error.message 
        });
    }
};

/**
 * POST /api/transactions/complete/:id
 * CẬP NHẬT GIAO DỊCH sang status 'paid' và kích hoạt StudentPackage.
 */
export const completeTransaction = async (req, res) => {
    const { id } = req.params; 

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Ma giao dich khong hop le.' });
    }

    try {
        const transaction = await Transaction.findById(id);

        if (!transaction) {
            return res.status(404).json({ message: 'Khong tim thay giao dich.' });
        }

        if (transaction.status === 'paid') {
            return res.status(200).json({ message: 'Giao dich da duoc thanh toan truoc do.', status: 'paid' });
        }
        
        // 1. Cập nhật trạng thái giao dịch
        transaction.status = 'paid';
        // THÊM THÔNG TIN PAYMENT GATEWAY VÀO ĐÂY NẾU CÓ
        await transaction.save();

        // 2. KÍCH HOẠT STUDENTPACKAGE
        await createStudentPackageFromTransaction(transaction);

        console.log(`✅ Giao dich ID: ${transaction._id} da duoc cap nhat thanh 'paid' va StudentPackage da duoc tao.`);
        
        return res.status(200).json({
            message: 'Thanh toan hoan tat thanh cong va goi tap da duoc kich hoat.',
            transactionId: transaction._id,
            status: transaction.status
        });

    } catch (error) {
        console.error('Loi hoan tat giao dich:', error.message);
        return res.status(500).json({ 
            message: 'Loi trong buoc hoan tat giao dich hoac kich hoat goi tap.', 
            error: error.message 
        });
    }
};

/**
 * GET /api/transactions/:id
 * Lấy chi tiết giao dịch (dùng cho Frontend hiển thị xác nhận thanh toán).
 */
export const getTransactionDetails = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Ma giao dich khong hop le.' });
        }
        
        const transaction = await Transaction.findById(req.params.id)
            .populate('student', 'username email') 
            .populate('pt', 'username email') 
            .populate('package', 'name price'); // Populate trường price của package  

        if (!transaction) {
            // Lỗi xảy ra nếu không tìm thấy bản ghi (404)
            return res.status(404).json({ message: 'Khong tim thay giao dich.' });
        }

        return res.status(200).json(transaction);
    } catch (error) {
        console.error('Loi khi lay chi tiet giao dich:', error);
        return res.status(500).json({ message: 'Loi server khi tim giao dich.' });
    }
};