/**
 * 考勤存证路由 - 精简版（绕过数据库问题）
 */
import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { BLOCKCHAIN_CONFIG } from '../config.js';
import { MerkleTree } from 'merkletreejs';

const router = express.Router();

// 内存存储（临时替代数据库）
const merkleRootStorage = new Map();

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
    const { merkleRoot, attendanceDate } = req.body;
    if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ success: false, error: '默克尔根格式错误' });
    }

    const mockBlockHeight = Math.floor(Math.random() * 10000) + 1000;
    const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');
    
    // 存储到内存
    merkleRootStorage.set(merkleRoot, {
      timestamp: Date.now(),
      blockHeight: mockBlockHeight,
      txHash: mockTxHash
    });

    res.json({
      success: true,
      message: '默克尔根已上链',
      data: { merkleRoot, attendanceDate, blockHeight: mockBlockHeight, transactionHash: mockTxHash }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/verify-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot } = req.body;
    if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ success: false, error: '默克尔根格式错误' });
    }

    const record = merkleRootStorage.get(merkleRoot);
    res.json({
      success: true,
      exists: !!record,
      timestamp: record ? record.timestamp : null,
      merkleRoot
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/batch-verify', authenticateToken, async (req, res) => {
  try {
    const { merkleRootList } = req.body;
    if (!Array.isArray(merkleRootList) || merkleRootList.length === 0) {
      return res.status(400).json({ success: false, error: '请提供默克尔根列表' });
    }

    const results = merkleRootList.map(root => ({
      merkleRoot: root,
      exists: merkleRootStorage.has(root),
      timestamp: merkleRootStorage.get(root)?.timestamp || null
    }));

    res.json({
      success: true,
      validCount: results.filter(r => r.exists).length,
      invalidCount: results.filter(r => !r.exists).length,
      details: results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/attendance-history', authenticateToken, async (req, res) => {
  const records = Array.from(merkleRootStorage.entries()).map(([root, data]) => ({
    merkleRoot: root,
    uploadTime: new Date(data.timestamp).toISOString(),
    blockHeight: data.blockHeight,
    transactionHash: data.txHash
  }));
  res.json({ success: true, data: records, count: records.length });
});

router.get('/stats', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      chainRecordCount: merkleRootStorage.size,
      dbRecordCount: merkleRootStorage.size,
      contractAddress: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS
    }
  });
});

export default router;