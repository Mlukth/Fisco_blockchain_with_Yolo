import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// 教师角色校验（简化）
const teacherOnly = (req, res, next) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: '需要教师权限' });
    }
    next();
};

router.use(teacherOnly);

/**
 * GET /class/:classId - 获取班级今日考勤
 */
router.get('/class/:classId', (req, res) => {
    try {
        const { classId } = req.params;
        const today = new Date().toISOString().split('T')[0];
        const records = db.getAttendanceByClassroom(classId, today);
        const stats = db.getClassStatistics(classId, today);
        res.json({
            success: true,
            data: {
                classId,
                date: today,
                stats,
                records
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /history/:classId - 获取班级历史统计
 * 查询参数: month (YYYY-MM)
 */
router.get('/history/:classId', (req, res) => {
    try {
        const { classId } = req.params;
        const { month } = req.query; // 格式: YYYY-MM

        if (!month) {
            return res.status(400).json({ success: false, error: '缺少 month 参数' });
        }

        // 获取该月所有考勤记录
        const records = db.getDb().prepare(`
            SELECT * FROM attendance_records 
            WHERE classroom_id = ? AND strftime('%Y-%m', time) = ?
            ORDER BY time
        `).all(classId, month);

        // 汇总统计
        const stats = { present: 0, late: 0, absent: 0, leave: 0 };
        records.forEach(r => { stats[r.status]++; });

        res.json({
            success: true,
            data: {
                classId,
                month,
                stats,
                records
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;