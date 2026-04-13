import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../data/users.db');
const dbase = new Database(dbPath);

const router = express.Router();

router.use(authenticateToken);

const teacherOnly = (req, res, next) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '需要教师权限' });
  }
  next();
};

router.use(teacherOnly);

/**
 * GET /teacher/class/attendance - 今日班级考勤
 */
router.get('/class/attendance', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 联表查询，带上学生姓名
    const records = dbase.prepare(`
      SELECT a.*, m.student_name, m.class_name
      FROM attendance_records a
      LEFT JOIN anonymous_map m ON a.anonymous_id = m.anonymous_id
      WHERE DATE(a.time) = ?
      ORDER BY a.time DESC
    `).all(today);
    
    const stats = { present: 0, late: 0, absent: 0, leave: 0, total: records.length };
    records.forEach(r => {
      if (stats.hasOwnProperty(r.status)) stats[r.status]++;
    });
    
    res.json({
      success: true,
      data: {
        classroom: '一年级1班',
        date: today,
        stats,
        records: records.map(r => ({
          id: r.id,
          anonymous_id: r.anonymous_id,
          student_name: r.student_name || r.anonymous_id,
          status: r.status,
          time: r.time,
          classroom_id: r.classroom_id,
          device_id: r.device_id,
          is_reviewed: 0
        }))
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /teacher/class/history - 历史统计
 */
router.get('/class/history', (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = end || new Date().toISOString().slice(0, 10);
    
    // 按日期分组统计
    const dailyStats = dbase.prepare(`
      SELECT 
        DATE(time) as date,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave,
        COUNT(*) as total
      FROM attendance_records
      WHERE DATE(time) BETWEEN ? AND ?
      GROUP BY DATE(time)
      ORDER BY date DESC
    `).all(startDate, endDate);
    
    // 计算汇总
    let totalDays = dailyStats.length;
    let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalAll = 0;
    dailyStats.forEach(d => {
      totalPresent += d.present;
      totalLate += d.late;
      totalAbsent += d.absent;
      totalAll += d.total;
    });
    
    const avgRate = totalAll > 0 ? (totalPresent / totalAll * 100) : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalDays,
          avgRate: parseFloat(avgRate.toFixed(1)),
          lateCount: totalLate,
          absentCount: totalAbsent
        },
        history: dailyStats.map(d => ({
          date: d.date,
          present: d.present,
          late: d.late,
          absent: d.absent,
          leave: d.leave,
          total: d.total
        }))
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /teacher/exceptions - 异常复核列表
 */
router.get('/exceptions', (req, res) => {
  try {
    const records = dbase.prepare(`
      SELECT a.*, m.student_name
      FROM attendance_records a
      LEFT JOIN anonymous_map m ON a.anonymous_id = m.anonymous_id
      WHERE a.status IN ('late', 'absent')
      ORDER BY a.time DESC
      LIMIT 50
    `).all();
    
    res.json({
      success: true,
      data: records.map(r => ({
        id: r.id,
        anonymous_id: r.anonymous_id,
        student_name: r.student_name || r.anonymous_id,
        status: r.status,
        time: r.time,
        classroom_id: r.classroom_id,
        device_id: r.device_id,
        is_reviewed: 0
      }))
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /teacher/review - 提交复核
 */
router.post('/review', (req, res) => {
  try {
    const { recordId, isReviewed, note } = req.body;
    // 简化处理，实际应该更新数据库
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
