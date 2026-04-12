import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 中间件：仅管理员可访问
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
    next();
};

router.use(authenticateToken);
router.use(adminOnly);

// ========== 统计仪表盘 ==========
router.get('/stats', (req, res) => {
    try {
        const users = db.getAllUsers();
        const totalStudents = db.getStudentsByClassroom('%').length;
        const teachers = users.filter(u => u.role === 'teacher').length;
        const parents = users.filter(u => u.role === 'parent').length;
        
        const today = new Date().toISOString().split('T')[0];
        const allAttendance = db.getDb().prepare(`
            SELECT status, COUNT(*) as count FROM attendance_records 
            WHERE DATE(time) = ? AND is_deleted = 0 GROUP BY status
        `).all(today);
        const present = allAttendance.find(a => a.status === 'present')?.count || 0;
        const total = allAttendance.reduce((sum, a) => sum + a.count, 0);
        const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
        
        res.json({
            success: true,
            data: {
                totalStudents,
                totalTeachers: teachers,
                totalParents: parents,
                todayAttendanceRate: parseFloat(rate),
                todayTotal: total
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========== 用户管理 ==========
router.get('/users', (req, res) => {
    const { role } = req.query;
    const users = db.getAllUsers(role || null);
    res.json({ success: true, data: users });
});

router.post('/users', (req, res) => {
    try {
        const result = db.createUser(req.body);
        // 操作日志（可选，若未删除 operation_logs 表可保留）
        if (db.addOperationLog) {
            db.addOperationLog({ user_id: req.user.userId, operation: 'create_user', detail: JSON.stringify(req.body) });
        }
        res.json({ success: true, data: { id: result.lastInsertRowid } });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.put('/users/:id', (req, res) => {
    try {
        const result = db.updateUser(req.params.id, req.body);
        if (db.addOperationLog) {
            db.addOperationLog({ user_id: req.user.userId, operation: 'update_user', detail: JSON.stringify(req.body) });
        }
        res.json({ success: true, changes: result.changes });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.delete('/users/:id', (req, res) => {
    try {
        const result = db.deleteUser(req.params.id);
        if (db.addOperationLog) {
            db.addOperationLog({ user_id: req.user.userId, operation: 'delete_user', detail: `id=${req.params.id}` });
        }
        res.json({ success: true, changes: result.changes });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// ========== 异常提醒 ==========
router.get('/exceptions', (req, res) => {
    try {
        const exceptions = db.getUnreviewedExceptions();
        res.json({
            success: true,
            data: {
                attendance: exceptions.slice(0, 10)
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;