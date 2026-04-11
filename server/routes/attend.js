/**
 * 考勤存证路由 - FISCO BCOS 3.x 版本
 * 处理默克尔根计算、上链、验证
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 限制
});

/**
 * 生成默克尔树根（基于考勤记录数组）
 * @param {Array} records - 考勤记录数组
 * @returns {string} 默克尔根（bytes32格式）
 */
function generateMerkleRoot(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('考勤记录数组不能为空');
  }

  // 将每条记录转为哈希叶子节点
  const leaves = records.map(record => {
    // 标准化记录格式
    const normalized = {
      id: record.id || record.studentId || record.employeeId,
      timestamp: record.timestamp || Date.now(),
      date: record.date || record.attendanceDate,
      action: record.action || 'check-in'
    };
    
    const data = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(data).digest();
  });

  // 使用 merkletreejs 构建树
  const tree = new MerkleTree(leaves, (data) => {
    return crypto.createHash('sha256').update(data).digest();
  }, { 
    sortPairs: true,
    hashLeaves: false
  });

  const root = tree.getRoot().toString('hex');
  return '0x' + root;
}

/**
 * 生成默克尔证明
 * @param {Array} records - 所有记录
 * @param {number} index - 目标记录索引
 * @returns {Object} 证明数据
 */
function generateMerkleProof(records, index) {
  const leaves = records.map(record => {
    const normalized = {
      id: record.id || record.studentId || record.employeeId,
      timestamp: record.timestamp || Date.now(),
      date: record.date || record.attendanceDate,
      action: record.action || 'check-in'
    };
    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest();
  });

  const tree = new MerkleTree(leaves, (data) => {
    return crypto.createHash('sha256').update(data).digest();
  }, { sortPairs: true });

  const leaf = leaves[index];
  const proof = tree.getProof(leaf);

  return {
    leaf: '0x' + leaf.toString('hex'),
    proof: proof.map(p => ({
      position: p.position,
      data: '0x' + p.data.toString('hex')
    })),
    root: '0x' + tree.getRoot().toString('hex')
  };
}

// ==================== 路由定义 ====================

/**
 * POST /calculate-merkle-root
 * 计算默克尔根（不上链）
 */
router.post('/calculate-merkle-root', authenticateToken, (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '请提供有效的考勤记录数组' 
      });
    }

    const merkleRoot = generateMerkleRoot(records);
    const recordCount = records.length;

    res.json({ 
      success: true, 
      merkleRoot,
      recordCount,
      message: `已计算 ${recordCount} 条记录的默克尔根`
    });
  } catch (error) {
    console.error('生成默克尔根失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /upload-merkle-root
 * 上传默克尔根到区块链
 */
router.post('/upload-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot, attendanceDate, metadata, records } = req.body;
    
    // 参数验证
    if (!merkleRoot) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 merkleRoot 参数' 
      });
    }

    if (!attendanceDate) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 attendanceDate 参数' 
      });
    }

    // 验证默克尔根格式（bytes32）
    if (!/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ 
        success: false, 
        error: '默克尔根格式错误，应为 0x 开头的 64 位十六进制字符串' 
      });
    }

    // 检查合约是否已部署
    if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
      return res.status(503).json({ 
        success: false, 
        error: '合约未部署，请先运行 npm run deploy' 
      });
    }

    // 计算时间戳（如果提供了日期字符串）
    let timestamp;
    if (typeof attendanceDate === 'string') {
      timestamp = Math.floor(new Date(attendanceDate).getTime() / 1000);
    } else {
      timestamp = attendanceDate;
    }

    console.log(`📤 上传默克尔根: ${merkleRoot}`);
    console.log(`📅 时间戳: ${timestamp}`);

    // 调用合约上传
    const receipt = await uploadMerkleRoot(merkleRoot, timestamp);
    
    const blockHeight = receipt.blockNumber || receipt.blockNumber;
    const txHash = receipt.transactionHash || receipt.hash;

    // 保存到数据库
    try {
      await db.addAttendanceRecord(
        merkleRoot, 
        attendanceDate, 
        blockHeight, 
        metadata ? JSON.stringify(metadata) : null
      );
    } catch (dbError) {
      console.warn('⚠️ 数据库保存失败，但链上操作成功:', dbError.message);
    }

    res.json({ 
      success: true, 
      message: '默克尔根已上链',
      data: {
        merkleRoot,
        attendanceDate,
        blockHeight,
        transactionHash: txHash
      }
    });
  } catch (error) {
    console.error('上链失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /verify-merkle-root
 * 验证默克尔根是否在链上
 */
router.post('/verify-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot } = req.body;
    
    if (!merkleRoot) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 merkleRoot 参数' 
      });
    }

    // 验证格式
    if (!/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ 
        success: false, 
        error: '默克尔根格式错误' 
      });
    }

    // 检查合约
    if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
      return res.status(503).json({ 
        success: false, 
        error: '合约未部署' 
      });
    }

    // 调用合约验证
    const exists = await verifyMerkleRoot(merkleRoot);
    
    let timestamp = null;
    if (exists) {
      timestamp = await getMerkleRootTimestamp(merkleRoot);
    }

    res.json({ 
      success: true, 
      exists,
      timestamp,
      merkleRoot,
      message: exists ? '默克尔根存在于链上' : '默克尔根不存在'
    });
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /attendance-history
 * 获取考勤存证历史记录
 */
router.get('/attendance-history', authenticateToken, async (req, res) => {
  try {
    // 从数据库获取记录
    const records = db.getActiveAttendanceRecords ? 
      db.getActiveAttendanceRecords() : 
      await db.getAllAttendanceRecords();
    
    const formatted = records.map(r => ({
      id: r.id,
      merkleRoot: r.merkle_root || r.merkleRoot,
      attendanceDate: r.attendance_date || r.attendanceDate,
      uploadTime: r.upload_time || r.uploadTime || r.created_at,
      blockHeight: r.block_height || r.blockHeight,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null
    }));

    res.json({ 
      success: true, 
      data: formatted,
      count: formatted.length
    });
  } catch (error) {
    console.error('获取历史失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /merkle-root/:root
 * 获取单个默克尔根详情
 */
router.get('/merkle-root/:root', authenticateToken, async (req, res) => {
  try {
    const { root } = req.params;
    
    // 链上查询
    const exists = await verifyMerkleRoot(root);
    const timestamp = exists ? await getMerkleRootTimestamp(root) : null;

    // 数据库查询
    const dbRecord = db.getAttendanceByRoot ? 
      db.getAttendanceByRoot(root) : 
      null;

    res.json({
      success: true,
      data: {
        merkleRoot: root,
        exists,
        timestamp,
        dbRecord
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * DELETE /attendance-record/:merkleRoot
 * 软删除考勤记录（仅数据库，不影响链上）
 */
router.delete('/attendance-record/:merkleRoot', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot } = req.params;
    
    const success = db.deleteAttendanceRecord ? 
      db.deleteAttendanceRecord(merkleRoot) : 
      await db.softDeleteAttendance(merkleRoot);

    res.json({ 
      success: !!success,
      message: success ? '记录已删除' : '记录不存在或删除失败'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /stats
 * 获取存证统计信息
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 链上统计
    const chainCount = await getMerkleRootCount();
    
    // 数据库统计
    const dbRecords = db.getActiveAttendanceRecords ? 
      db.getActiveAttendanceRecords() : 
      [];

    res.json({
      success: true,
      data: {
        chainRecordCount: chainCount,
        dbRecordCount: dbRecords.length,
        contractAddress: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /batch-upload
 * 批量上传考勤记录
 */
router.post('/batch-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '请上传文件' 
      });
    }

    // 读取上传的文件
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = JSON.parse(fileContent);

    if (!Array.isArray(records)) {
      return res.status(400).json({ 
        success: false, 
        error: '文件内容应为 JSON 数组' 
      });
    }

    // 计算默克尔根
    const merkleRoot = generateMerkleRoot(records);
    
    // 清理临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      merkleRoot,
      recordCount: records.length,
      message: '请使用 /upload-merkle-root 接口将此默克尔根上链'
    });
  } catch (error) {
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /debug/storage
 * 调试端点：检查存储目录
 */
router.get('/debug/storage', authenticateToken, (req, res) => {
  const exists = fs.existsSync(ATTENDANCE_STORAGE_PATH);
  let files = [];
  
  if (exists) {
    files = fs.readdirSync(ATTENDANCE_STORAGE_PATH);
  }

  res.json({ 
    storagePath: ATTENDANCE_STORAGE_PATH, 
    exists, 
    fileCount: files.length,
    files: files.slice(0, 20) // 最多显示20个
  });
});

export default router;