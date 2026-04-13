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
    const teachers = users.filter(u => u.role === 'teacher').length;
    const parents = users.filter(u => u.role === 'parent').length;
    const totalStudents = db.getTotalStudentCount();
    const todayStats = db.getTodayStats();
    const present = todayStats.present;
    const total = todayStats.total;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    
    // 设备统计
    const devices = dbase.prepare('SELECT * FROM devices').all();
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    
    res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers: teachers,
        totalParents: parents,
        totalDevices: devices.length,
        onlineDevices,
        todayAttendanceRate: parseFloat(rate),
        todayTotal: total
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 设备管理 ==========
router.get('/devices', (req, res) => {
  try {
    const devices = dbase.prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
    res.json({ success: true, data: devices });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/devices', (req, res) => {
  try {
    const { device_id, device_name, classroom_id, ip_address } = req.body;
    dbase.prepare(`
      INSERT INTO devices (device_id, device_name, classroom_id, status, ip_address, last_heartbeat)
      VALUES (?, ?, ?, 'offline', ?, datetime('now'))
    `).run(device_id, device_name, classroom_id, ip_address);
    res.json({ success: true, data: { id: device_id } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.put('/devices/:deviceId', (req, res) => {
  try {
    const { device_name, classroom_id, status, ip_address } = req.body;
    dbase.prepare(`
      UPDATE devices SET device_name = ?, classroom_id = ?, status = ?, ip_address = ?, last_heartbeat = datetime('now')
      WHERE device_id = ?
    `).run(device_name, classroom_id, status, ip_address, req.params.deviceId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.delete('/devices/:deviceId', (req, res) => {
  try {
    dbase.prepare('DELETE FROM devices WHERE device_id = ?').run(req.params.deviceId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/devices/heartbeat', (req, res) => {
  try {
    const { device_id, ip_address } = req.body;
    dbase.prepare(`
      UPDATE devices SET status = 'online', ip_address = ?, last_heartbeat = datetime('now')
      WHERE device_id = ?
    `).run(ip_address, device_id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
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
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const result = db.updateUser(req.params.id, req.body);
    res.json({ success: true, changes: result.changes });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    const result = db.deleteUser(req.params.id);
    res.json({ success: true, changes: result.changes });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ========== 异常提醒 ==========
router.get('/exceptions', (req, res) => {
  try {
    const attendance = db.getUnreviewedExceptions();
    const devices = dbase.prepare("SELECT * FROM devices WHERE status IN ('offline', 'error')").all();
    res.json({ success: true, data: { attendance: attendance.slice(0, 10), devices } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 配置管理（简化版） ==========
router.get('/config', (req, res) => {
  res.json({ success: true, data: { blockchainEnabled: true, autoSync: true } });
});

router.post('/config', (req, res) => {
  res.json({ success: true, message: '配置已保存' });
});

// ========== 诊断与日志 ==========
router.get('/diagnosis', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/logs', (req, res) => {
  res.json({ success: true, data: [] });
});

export default router;
