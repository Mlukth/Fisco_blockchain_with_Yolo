import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// 获取家长关联的学生（方案A：通过 parent_child 表直接查询，不依赖 phone 字段）
const getParentStudents = (req) => {
    // 直接根据用户名从 parent_child 表获取绑定的孩子
    return db.getChildrenByParent(req.user.username);
};

// ========== 孩子今日考勤 ==========
router.get('/attendance', (req, res) => {
    try {
        const students = getParentStudents(req);
        if (students.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const results = [];
        for (const s of students) {
            const records = db.getAttendanceByAnonymousId(s.anonymous_id, 1);
            const todayRecord = records.find(r => r.time && r.time.startsWith(today));
            results.push({
                anonymousId: s.anonymous_id,
                name: s.student_name,
                class: s.class_name || s.classroom_id,
                attendance: todayRecord ? { status: todayRecord.status, time: todayRecord.time } : { status: 'unknown', time: null }
            });
        }
        res.json({ success: true, data: results });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========== 孩子历史考勤 ==========
router.get('/history', (req, res) => {
    try {
        const { month, anonymousId } = req.query;
        if (!anonymousId) return res.status(400).json({ success: false, error: '缺少 anonymousId' });
        
        // 验证权限：确保该匿名ID属于当前家长
        const students = getParentStudents(req);
        const valid = students.find(s => s.anonymous_id === anonymousId);
        if (!valid) return res.status(403).json({ success: false, error: '无权访问' });
        
        const records = db.getMonthlyAttendanceByAnonymousId(anonymousId, month);
        const stats = { present: 0, late: 0, absent: 0, leave: 0 };
        records.forEach(r => { stats[r.status]++; });
        
        res.json({
            success: true,
            data: {
                student: { name: valid.student_name, anonymousId, class: valid.class_name || valid.classroom_id },
                month,
                summary: stats,
                records
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;