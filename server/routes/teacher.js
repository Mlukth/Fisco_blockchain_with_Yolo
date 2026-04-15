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

const teacherOnly = (req, res, next) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '需要教师或管理员权限' });
  }
  next();
};

router.use(authenticateToken);
router.use(teacherOnly);

const DEFAULT_CLASSROOM = '一年级1班';

// ========== 今日班级考勤 ==========
router.get('/class/attendance', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const records = dbase.prepare(`
      SELECT 
        a.id,
        a.anonymous_id,
        m.student_name,
        a.status,
        a.time,
        a.classroom_id,
        a.device_id,
        a.merkle_root
      FROM attendance_records a
      LEFT JOIN anonymous_map m ON a.anonymous_id = m.anonymous_id
      WHERE DATE(a.time) = ? AND a.classroom_id = ?
      ORDER BY a.time DESC
    `).all(today, DEFAULT_CLASSROOM);
    
    const stats = { present: 0, late: 0, absent: 0, leave: 0, total: records.length };
    records.forEach(r => { if (stats[r.status] !== undefined) stats[r.status]++; });
    
    res.json({
      success: true,
      data: {
        classroom: DEFAULT_CLASSROOM,
        date: today,
        stats,
        records
      }
    });
  } catch (e) {
    console.error('班级考勤查询失败:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 历史统计 ==========
router.get('/class/history', (req, res) => {
  try {
    const { start, end } = req.query;
    
    let dateCondition = '';
    let params = [];
    if (start && end) {
      dateCondition = 'WHERE DATE(a.time) BETWEEN ? AND ?';
      params = [start, end];
    } else {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      dateCondition = 'WHERE DATE(a.time) BETWEEN ? AND ?';
      params = [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];
    }
    params.push(DEFAULT_CLASSROOM);
    
    const rows = dbase.prepare(`
      SELECT 
        DATE(a.time) as date,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave,
        COUNT(*) as total
      FROM attendance_records a
      ${dateCondition} AND a.classroom_id = ?
      GROUP BY DATE(a.time)
      ORDER BY date ASC
    `).all(...params);
    
    const history = rows.map(r => ({
      ...r,
      rate: r.total > 0 ? ((r.present / r.total) * 100).toFixed(1) : '0.0'
    }));
    
    const summary = {
      days: history.length,
      avgRate: history.length > 0 
        ? (history.reduce((sum, h) => sum + parseFloat(h.rate), 0) / history.length).toFixed(1)
        : '0.0',
      totalLate: history.reduce((sum, h) => sum + h.late, 0),
      totalAbsent: history.reduce((sum, h) => sum + h.absent, 0)
    };
    
    res.json({
      success: true,
      data: { history, summary }
    });
  } catch (e) {
    console.error('历史统计失败:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 异常复核列表 ==========
router.get('/exceptions', (req, res) => {
  try {
    // 由于没有复核字段，暂时返回空数组或基于状态筛选
    const records = dbase.prepare(`
      SELECT 
        a.id,
        a.anonymous_id,
        m.student_name,
        a.status,
        a.time
      FROM attendance_records a
      LEFT JOIN anonymous_map m ON a.anonymous_id = m.anonymous_id
      WHERE a.classroom_id = ? AND a.status IN ('late', 'absent')
      ORDER BY a.time DESC
    `).all(DEFAULT_CLASSROOM);
    
    res.json({ success: true, data: records });
  } catch (e) {
    console.error('异常列表失败:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 提交复核（模拟） ==========
router.post('/review', (req, res) => {
  const { recordId, isReviewed, note } = req.body;
  console.log(`[模拟复核] recordId=${recordId}, isReviewed=${isReviewed}, note=${note}`);
  res.json({ success: true, message: '复核已提交（模拟）' });
});

// ========== 仪表盘摘要 ==========
router.get('/dashboard-summary', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const todayStats = dbase.prepare(`
      SELECT status, COUNT(*) as count FROM attendance_records 
      WHERE DATE(time) = ? AND classroom_id = ?
      GROUP BY status
    `).all(today, DEFAULT_CLASSROOM);
    
    const summary = { present: 0, late: 0, absent: 0, leave: 0, total: 0 };
    todayStats.forEach(s => { summary[s.status] = s.count; summary.total += s.count; });
    const todayRate = summary.total > 0 ? ((summary.present / summary.total) * 100).toFixed(1) : '0.0';
    
    const pending = dbase.prepare(`
      SELECT COUNT(*) as count FROM attendance_records 
      WHERE classroom_id = ? AND status IN ('late', 'absent')
    `).get(DEFAULT_CLASSROOM).count;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    const weekRows = dbase.prepare(`
      SELECT DATE(time) as date, 
             SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
             COUNT(*) as total
      FROM attendance_records 
      WHERE DATE(time) BETWEEN ? AND ? AND classroom_id = ?
      GROUP BY DATE(time)
    `).all(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], DEFAULT_CLASSROOM);
    
    let lastWeekRate = 0;
    if (weekRows.length > 0) {
      const rates = weekRows.map(r => r.total > 0 ? (r.present / r.total) * 100 : 0);
      lastWeekRate = (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1);
    }
    
    res.json({
      success: true,
      data: {
        today: { ...summary, rate: parseFloat(todayRate) },
        pendingExceptions: pending,
        lastWeekRate: parseFloat(lastWeekRate)
      }
    });
  } catch (e) {
    console.error('摘要获取失败:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;