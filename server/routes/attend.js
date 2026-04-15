/**
 * 考勤存证路由 - 真实上链版（Web3.js + RPC）
 * calculate-merkle-root 同时存储考勤记录
 */
import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { MerkleTree } from 'merkletreejs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { Web3 } from 'web3';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 数据库连接
const dbPath = path.join(__dirname, '../data/users.db');
const db = new Database(dbPath);

// 默认值
const DEFAULT_CLASSROOM = '一年级1班';
const DEFAULT_DEVICE = 'yolo-edge-device';

// ========== 区块链初始化 ==========
const RPC_URL = process.env.FISCO_RPC_URL || 'http://192.168.171.157:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY_HEX = process.env.ADMIN_PRIVATE_KEY_HEX;

if (!CONTRACT_ADDRESS) {
    console.error('❌ 环境变量 CONTRACT_ADDRESS 未设置');
    process.exit(1);
}
if (!ADMIN_PRIVATE_KEY_HEX) {
    console.error('❌ 环境变量 ADMIN_PRIVATE_KEY_HEX 未设置');
    console.error('   请将十六进制私钥添加到 .env 文件中：ADMIN_PRIVATE_KEY_HEX=0x...');
    process.exit(1);
}

// 加载合约 ABI（从 artifacts 读取，与测试脚本一致）
const artifactPath = path.join(__dirname, '../../artifacts/AttendanceProof.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
const CONTRACT_ABI = artifact.abi;

// 初始化 Web3
const web3 = new Web3(RPC_URL);

// 直接使用十六进制私钥
const account = web3.eth.accounts.privateKeyToAccount(ADMIN_PRIVATE_KEY_HEX);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

// 合约实例
const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

console.log('✅ 区块链模块初始化成功');
console.log(`   RPC: ${RPC_URL}`);
console.log(`   合约地址: ${CONTRACT_ADDRESS}`);
console.log(`   账户: ${account.address}`);

// ========== 辅助函数：生成默克尔根 ==========
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

// ========== 匿名映射管理（保持不变） ==========
router.get('/mapping', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM anonymous_map ORDER BY anonymous_id');
        const mappings = stmt.all();
        res.json({ success: true, data: mappings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/mapping', authenticateToken, (req, res) => {
    try {
        const { anonymous_id, student_name, grade, class_name, parent_phone } = req.body;
        const stmt = db.prepare(`
            INSERT INTO anonymous_map (anonymous_id, student_name, grade, class_name, parent_phone)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(anonymous_id, student_name, grade, class_name, parent_phone);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/mapping/:anonymous_id', authenticateToken, (req, res) => {
    try {
        const { student_name, grade, class_name, parent_phone } = req.body;
        const stmt = db.prepare(`
            UPDATE anonymous_map SET student_name = ?, grade = ?, class_name = ?, parent_phone = ?
            WHERE anonymous_id = ?
        `);
        stmt.run(student_name, grade, class_name, parent_phone, req.params.anonymous_id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/mapping/:anonymous_id', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM anonymous_map WHERE anonymous_id = ?');
        stmt.run(req.params.anonymous_id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/mapping/import', authenticateToken, (req, res) => {
    res.json({ success: true, imported: 0 });
});

// ========== 核心接口：计算默克尔根 + 存储考勤记录（保持不变） ==========
router.post('/calculate-merkle-root', authenticateToken, (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的考勤记录数组' });
    }

    const merkleRoot = generateMerkleRoot(records);

    const insertStmt = db.prepare(`
      INSERT INTO attendance_records (anonymous_id, status, time, classroom_id, device_id, merkle_root, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const record of records) {
      const anonymousId = record.id || record.studentId;
      const timestamp = record.timestamp ? new Date(record.timestamp * 1000).toISOString() : new Date().toISOString();
      const status = record.action === 'check-in' ? 'present' : 
                     record.action === 'check-out' ? 'leave' : 'present';
      
      insertStmt.run(anonymousId, status, timestamp, DEFAULT_CLASSROOM, DEFAULT_DEVICE, merkleRoot);
    }

    console.log(`✅ 存储 ${records.length} 条考勤记录，默克尔根: ${merkleRoot.substring(0, 16)}...`);

    res.json({
      success: true,
      merkleRoot,
      recordCount: records.length,
      message: `已存储 ${records.length} 条考勤记录`
    });

  } catch (error) {
    console.error('处理失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 上传默克尔根到链上（真实交易） ==========
router.post('/upload-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot, attendanceDate } = req.body;

    if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ success: false, error: '默克尔根格式错误' });
    }

    // 计算时间戳（秒）
    const timestamp = attendanceDate 
      ? Math.floor(new Date(attendanceDate).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    console.log(`📤 发送上链交易: root=${merkleRoot}, timestamp=${timestamp}`);

    // 调用合约方法
    const receipt = await contract.methods.uploadMerkleRoot(merkleRoot, timestamp).send({
      from: account.address,
      gas: 300000,
      gasPrice: 1
    });

    console.log(`✅ 上链成功，交易哈希: ${receipt.transactionHash}`);

    // 可选：将交易记录存入 merkle_roots 表（如果表存在）
    try {
      const insertTxStmt = db.prepare(`
        INSERT INTO merkle_roots (root_hash, record_count, tx_hash, block_number, uploaded_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      insertTxStmt.run(merkleRoot, 1, receipt.transactionHash, receipt.blockNumber);
    } catch (dbError) {
      console.warn('⚠️ 无法写入 merkle_roots 表（可能不存在）:', dbError.message);
    }

    res.json({
      success: true,
      message: '默克尔根已上链',
      data: {
        merkleRoot,
        attendanceDate,
        blockNumber: Number(receipt.blockNumber),
        transactionHash: receipt.transactionHash
      }
    });

  } catch (error) {
    console.error('上链失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 验证默克尔根（保持不变） ==========
router.post('/verify-merkle-root', authenticateToken, async (req, res) => {
  try {
    const { merkleRoot } = req.body;

    if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
      return res.status(400).json({ success: false, error: '默克尔根格式错误' });
    }

    const stmt = db.prepare('SELECT * FROM attendance_records WHERE merkle_root = ?');
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

// ========== 批量验证（保持不变） ==========
router.post('/batch-verify', authenticateToken, async (req, res) => {
  try {
    const { merkleRootList } = req.body;

    if (!Array.isArray(merkleRootList) || merkleRootList.length === 0) {
      return res.status(400).json({ success: false, error: '请提供默克尔根列表' });
    }

    const placeholders = merkleRootList.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT merkle_root, created_at FROM attendance_records WHERE merkle_root IN (${placeholders})`);
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

// ========== 考勤历史（保持不变） ==========
router.get('/attendance-history', authenticateToken, async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM attendance_records WHERE merkle_root IS NOT NULL ORDER BY created_at DESC LIMIT 100');
    const records = stmt.all();

    const formatted = records.map(r => ({
      id: r.id,
      anonymousId: r.anonymous_id,
      status: r.status,
      time: r.time,
      classroomId: r.classroom_id,
      deviceId: r.device_id,
      merkleRoot: r.merkle_root,
      uploadTime: r.created_at
    }));

    res.json({ success: true, data: formatted, count: formatted.length });

  } catch (error) {
    console.error('获取历史失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 统计（保持不变） ==========
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM attendance_records');
    const merkleStmt = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE merkle_root IS NOT NULL');
    
    const total = totalStmt.get();
    const merkle = merkleStmt.get();

    res.json({
      success: true,
      data: {
        totalRecords: total.count,
        chainRecordCount: merkle.count,
        dbRecordCount: total.count
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;