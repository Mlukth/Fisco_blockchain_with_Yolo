import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

const getParentStudents = (req) => {
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
            
            let merkleRoot = null;
            let verified = null;
            if (todayRecord) {
                const detail = db.getDb().prepare(`
                    SELECT merkle_root, verified FROM attendance_records WHERE id = ?
                `).get(todayRecord.id);
                if (detail) {
                    merkleRoot = detail.merkle_root;
                    verified = detail.verified;
                }
            }
            
            results.push({
                anonymousId: s.anonymous_id,
                name: s.student_name,
                class: s.class_name || s.classroom_id,
                attendance: todayRecord ? { 
                    status: todayRecord.status, 
                    time: todayRecord.time,
                    merkleRoot: merkleRoot,
                    verified: verified === 1 ? true : false
                } : { status: 'unknown', time: null, merkleRoot: null, verified: false }
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
        
        const students = getParentStudents(req);
        const valid = students.find(s => s.anonymous_id === anonymousId);
        if (!valid) return res.status(403).json({ success: false, error: '无权访问' });
        
        const records = db.getMonthlyAttendanceByAnonymousId(anonymousId, month);
        const enrichedRecords = records.map(r => {
            const detail = db.getDb().prepare(`
                SELECT merkle_root, verified FROM attendance_records WHERE id = ?
            `).get(r.id);
            return {
                ...r,
                merkleRoot: detail?.merkle_root || null,
                verified: detail?.verified === 1 ? true : false
            };
        });
        
        const stats = { present: 0, late: 0, absent: 0, leave: 0 };
        enrichedRecords.forEach(r => { stats[r.status]++; });
        
        res.json({
            success: true,
            data: {
                student: { name: valid.student_name, anonymousId, class: valid.class_name || valid.classroom_id },
                month,
                summary: stats,
                records: enrichedRecords
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;