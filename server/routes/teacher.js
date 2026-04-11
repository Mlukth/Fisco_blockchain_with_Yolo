import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// 中间件：仅教师可访问
const teacherOnly = (req, res, next) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: '需要教师权限' });
    }
    next();
};

router.use(teacherOnly);

// 获取教师所教班级（从用户信息获取）
const getTeacherClassroom = (req) => {
    const user = db.getUserById(req.user.userId);
    return user?.classroom_id;
};

// ========== 今日班级考勤 ==========
router.get('/class/attendance', (req, res) => {
    try {
        const classroomId = getTeacherClassroom(req);
        if (!classroomId) return res.status(400).json({ success: false, error: '教师未绑定班级' });
        
        const today = new Date().toISOString().split('T')[0];
        const stats = db.getClassStatistics(classroomId, today);
        const records = db.getAttendanceByClassroom(classroomId, today);
        const totalStudents = db.getStudentsByClassroom(classroomId).length;
        
        res.json({
            success: true,
            data: {
                classroom: classroomId,
                date: today,
                stats: { ...stats, total: totalStudents },
                records
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========== 历史统计 ==========
router.get('/class/history', (req, res) => {
    try {
        const classroomId = getTeacherClassroom(req);
        const { start, end } = req.query;
        
        const sql = `
            SELECT DATE(time) as date, 
                   SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                   SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                   SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                   SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave,
                   COUNT(*) as total
            FROM attendance_records 
            WHERE classroom_id = ? AND is_deleted = 0
        `;
        let dateCondition = '';
        const params = [classroomId];
        if (start && end) {
            dateCondition = ` AND DATE(time) BETWEEN ? AND ?`;
            params.push(start, end);
        }
        const rows = db.getDb().prepare(sql + dateCondition + ` GROUP BY DATE(time) ORDER BY date DESC`).all(...params);
        
        const totalDays = rows.length;
        const avgRate = rows.reduce((sum, r) => sum + (r.present / r.total * 100), 0) / (totalDays || 1);
        const lateCount = rows.reduce((sum, r) => sum + r.late, 0);
        const absentCount = rows.reduce((sum, r) => sum + r.absent, 0);
        
        res.json({
            success: true,
            data: {
                summary: { totalDays, avgRate, lateCount, absentCount },
                history: rows
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========== 异常复核 ==========
router.get('/exceptions', (req, res) => {
    try {
        const classroomId = getTeacherClassroom(req);
        const exceptions = db.getUnreviewedExceptions(classroomId);
        res.json({ success: true, data: exceptions });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/review', (req, res) => {
    try {
        const { recordId, isReviewed, note } = req.body;
        db.updateAttendanceReview(recordId, isReviewed, note);
        db.addOperationLog({ user_id: req.user.userId, operation: 'review_attendance', detail: `recordId=${recordId}, note=${note}` });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;