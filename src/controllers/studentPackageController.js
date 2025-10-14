// controllers/studentPackageController.js

import StudentPackage from '../models/StudentPackage.js';

/**
 * GET /api/student-packages/student/:studentId
 * Lấy tất cả gói tập active và inactive của một học viên theo studentId.
 */
export const getStudentPackages = async (req, res) => {
    const { studentId } = req.params;
    
    try {
        const packages = await StudentPackage.find({ student: studentId })
            .populate('pt', 'username email') 
            .populate('package', 'name totalSessions durationDays price')
            .sort({ startDate: -1 }); 

        return res.status(200).json(packages); 
        
    } catch (error) {
        console.error('Loi khi lay danh sach goi tap hoc vien:', error);
        return res.status(500).json({ message: 'Loi server khi truy van goi tap.' });
    }
};

/**
 * GET /api/student-packages/:id
 * Lấy chi tiết một gói tập cụ thể
 */
export const getPackageDetails = async (req, res) => {
    try {
        const pkg = await StudentPackage.findById(req.params.id)
            .populate('pt', 'username email') 
            .populate('student', 'username email')
            .populate('package', 'name totalSessions durationDays price');

        if (!pkg) {
            return res.status(404).json({ message: 'Khong tim thay goi tap.' });
        }

        return res.status(200).json(pkg);
    } catch (error) {
        console.error('Loi khi lay chi tiet goi tap:', error);
        return res.status(500).json({ message: 'Loi server khi tim goi tap.' });
    }
};