/**
 * 考勤存证路由 - 精简版
 * 处理默克尔根计算、上链、验证、批量验真
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { BLOCKCHAIN_CONFIG, ATTENDANCE_STORAGE_PATH } from '../config.js';
import * as db from '../db/index.js';
import {
  uploadMerkleRoot,
  verifyMerkleRoot,
  getMerkleRootTimestamp,
  getAllMerkleRoots,
  getMerkleRootCount
} from '../utils/contractManager.js';
import { MerkleTree } from 'merkletreejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 配置文件上传
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * 生成默克尔树根（基于考勤记录数组）
 */
function generateMerkleRoot(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('考勤记录数组不能为空');
  }

  const leaves = records.map(record => {
    const normalized = {
      id: record.id || record.studentId || record.employeeId,
      timestamp: record.timestamp || Date.now(),
      date: record.date || record.attendanceDate,
      action: record.action || 'check-in'
    };
    const data = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(data).digest();
  });

  const tree = new MerkleTree(leaves, (data) => {
    return crypto.createHash('sha256').update(data).digest();
  }, { 
    sortPairs: true,
    hashLeaves: false
  });

  const root = tree.getRoot().toString('hex');
  return '0x' + root;
}

// ==================== 核心路由 ====================

/**
 * POST /calculate-merkle-root
 * 计算默克尔根（不上链）
 */
router.post('/calculate-merkle-root', authenticateToken, (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的考勤记录数组' });
    }
    const merkleRoot = generateMerkleRoot(records);
    res.json({ success: true, merkleRoot, recordCount: records.length });
  } catch (error) {
    console.error('生成默克尔根失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /upload-merkle-root
 * 上传默克尔根到区块链
 */
router.post('/upload-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot, attendanceDate, metadata } = req.body;
    
    if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ success: false, error: '默克尔根格式错误' });
    }
    if (!attendanceDate) {
      return res.status(400).json({ success: false, error: '缺少 attendanceDate 参数' });
    }
    if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
      return res.status(503).json({ success: false, error: '合约未部署' });
    }

    const timestamp = typeof attendanceDate === 'string' 
      ? Math.floor(new Date(attendanceDate).getTime() / 1000)
      : attendanceDate;

    console.log(`📤 上传默克尔根: ${merkleRoot}`);
    const receipt = await uploadMerkleRoot(merkleRoot, timestamp);
    
    const blockHeight = receipt.blockNumber || receipt.blockNumber;
    const txHash = receipt.transactionHash || receipt.hash;

    try {
      await db.addAttendanceRecord(merkleRoot, attendanceDate, blockHeight, metadata ? JSON.stringify(metadata) : null);
    } catch (dbError) {
      console.warn('⚠️ 数据库保存失败，但链上操作成功:', dbError.message);
    }

    res.json({ 
      success: true, 
      message: '默克尔根已上链',
      data: { merkleRoot, attendanceDate, blockHeight, transactionHash: txHash }
    });
  } catch (error) {
    console.error('上链失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /verify-merkle-root
 * 验证单个默克尔根是否在链上
 */
router.post('/verify-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot } = req.body;
    if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ success: false, error: '默克尔根格式错误' });
    }
    if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
      return res.status(503).json({ success: false, error: '合约未部署' });
    }

    const exists = await verifyMerkleRoot(merkleRoot);
    const timestamp = exists ? await getMerkleRootTimestamp(merkleRoot) : null;

    res.json({ success: true, exists, timestamp, merkleRoot });
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /batch-verify
 * 批量验证默克尔根（核心功能）
 */
router.post('/batch-verify', authenticateToken, async (req, res) => {
  try {
    const { merkleRootList } = req.body;
    
    if (!Array.isArray(merkleRootList) || merkleRootList.length === 0) {
      return res.status(400).json({ success: false, error: '请提供默克尔根列表' });
    }

    // 验证格式
    const invalidFormat = merkleRootList.filter(root => !/^0x[a-fA-F0-9]{64}$/.test(root));
    if (invalidFormat.length > 0) {
      return res.status(400).json({ success: false, error: '部分默克尔根格式错误' });
    }

    if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
      return res.status(503).json({ success: false, error: '合约未部署' });
    }

    // 并行调用合约验证
    const results = await Promise.all(
      merkleRootList.map(async (root) => {
        try {
          const exists = await verifyMerkleRoot(root);
          const timestamp = exists ? await getMerkleRootTimestamp(root) : null;
          return { merkleRoot: root, exists, timestamp };
        } catch (err) {
          return { merkleRoot: root, exists: false, timestamp: null, error: err.message };
        }
      })
    );

    const validCount = results.filter(r => r.exists).length;

    res.json({
      success: true,
      validCount,
      invalidCount: merkleRootList.length - validCount,
      details: results
    });
  } catch (error) {
    console.error('批量验证失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /attendance-history
 * 获取考勤存证历史记录
 */
router.get('/attendance-history', authenticateToken, async (req, res) => {
  try {
    const records = db.getActiveAttendanceRecords ? db.getActiveAttendanceRecords() : [];
    const formatted = records.map(r => ({
      id: r.id,
      merkleRoot: r.merkle_root || r.merkleRoot,
      attendanceDate: r.attendance_date || r.attendanceDate,
      uploadTime: r.upload_time || r.uploadTime || r.created_at,
      blockHeight: r.block_height || r.blockHeight,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null
    }));
    res.json({ success: true, data: formatted, count: formatted.length });
  } catch (error) {
    console.error('获取历史失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /stats
 * 获取存证统计信息
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const chainCount = await getMerkleRootCount();
    const dbRecords = db.getActiveAttendanceRecords ? db.getActiveAttendanceRecords() : [];
    res.json({
      success: true,
      data: {
        chainRecordCount: chainCount,
        dbRecordCount: dbRecords.length,
        contractAddress: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;