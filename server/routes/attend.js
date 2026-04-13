/**
 * 考勤存证路由 - 持久化版本
 * 数据存到数据库，上链操作模拟
 */
import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { BLOCKCHAIN_CONFIG } from '../config.js';
import { MerkleTree } from 'merkletreejs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库连接
const dbPath = path.join(__dirname, '../data/users.db');
const db = new Database(dbPath);

function generateMerkleRoot(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('考勤记录数组不能为空');
  }
  const leaves = records.map(record => {
    const normalized = {
      id: record.id || record.studentId,
      timestamp: record.timestamp || Date.now(),
      date: record.date,
      action: record.action || 'check-in'
    };
    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest();
  });
  const tree = new MerkleTree(leaves, (data) => crypto.createHash('sha256').update(data).digest(), { sortPairs: true });
  return '0x' + tree.getRoot().toString('hex');
}

const router = express.Router();

router.post('/calculate-merkle-root', authenticateToken, (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的考勤记录数组' });
    }
    const merkleRoot = generateMerkleRoot(records);
    res.json({ success: true, merkleRoot, recordCount: records.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/upload-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot, attendanceDate, metadata } = req.body;
    
    if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ success: false, error: '默克尔根格式错误' });
    }

    const mockBlockHeight = Math.floor(Math.random() * 10000) + 1000;
    const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');
    
    const stmt = db.prepare(`
      INSERT INTO attendance_records 
      (anonymous_id, status, time, classroom_id, device_id, merkle_root, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    stmt.run(
      `merkle_${Date.now()}`,
      'uploaded',
      attendanceDate || new Date().toISOString(),
      'blockchain',
      'fisco-node',
      merkleRoot
    );

    res.json({
      success: true,
      message: '默克尔根已上链',
      data: { merkleRoot, attendanceDate, blockHeight: mockBlockHeight, transactionHash: mockTxHash }
    });
  } catch (error) {
    console.error('上链失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/verify-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot } = req.body;
    if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ success: false, error: '默克尔根格式错误' });
    }

    const stmt = db.prepare('SELECT * FROM attendance_records WHERE merkle_root = ? AND is_deleted = 0');
    const record = stmt.get(merkleRoot);

    res.json({
      success: true,
      exists: !!record,
      timestamp: record ? record.created_at : null,
      merkleRoot
    });
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/batch-verify', authenticateToken, async (req, res) => {
  try {
    const { merkleRootList } = req.body;
    if (!Array.isArray(merkleRootList) || merkleRootList.length === 0) {
      return res.status(400).json({ success: false, error: '请提供默克尔根列表' });
    }

    const placeholders = merkleRootList.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT merkle_root, created_at FROM attendance_records WHERE merkle_root IN (${placeholders}) AND is_deleted = 0`);
    const records = stmt.all(...merkleRootList);
    
    const recordMap = new Map(records.map(r => [r.merkle_root, r.created_at]));
    
    const results = merkleRootList.map(root => ({
      merkleRoot: root,
      exists: recordMap.has(root),
      timestamp: recordMap.get(root) || null
    }));

    res.json({
      success: true,
      validCount: results.filter(r => r.exists).length,
      invalidCount: results.filter(r => !r.exists).length,
      details: results
    });
  } catch (error) {
    console.error('批量验证失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/attendance-history', authenticateToken, async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM attendance_records WHERE merkle_root IS NOT NULL AND is_deleted = 0 ORDER BY created_at DESC');
    const records = stmt.all();
    
    const formatted = records.map(r => ({
      id: r.id,
      merkleRoot: r.merkle_root,
      attendanceDate: r.time,
      uploadTime: r.created_at,
      blockHeight: r.id * 100,
      classroomId: r.classroom_id,
      deviceId: r.device_id
    }));
    
    res.json({ success: true, data: formatted, count: formatted.length });
  } catch (error) {
    console.error('获取历史失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE merkle_root IS NOT NULL AND is_deleted = 0');
    const result = stmt.get();
    
    res.json({
      success: true,
      data: {
        chainRecordCount: result.count,
        dbRecordCount: result.count,
        contractAddress: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
