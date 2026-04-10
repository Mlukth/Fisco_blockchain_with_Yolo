/**
 * 考勤存证路由（FISCO BCOS 版）
 * 替代原 hash.js，处理默克尔根计算、上链、验证
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import multer from 'multer';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { BLOCKCHAIN_CONFIG, ATTENDANCE_STORAGE_PATH } from '../config.js';
import * as db from '../db/index.js';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256'; // 注意：FISCO 合约使用 SHA-256？实际存证用 keccak256 或 sha256 均可，合约端需一致

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// 配置文件上传（用于批量考勤数据文件）
const upload = multer({ dest: 'uploads/' });

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * 工具函数：执行脚本并返回 stdout
 */
async function runScript(scriptName, args = []) {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts', scriptName);
    const cmd = `node "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`;
    try {
        const { stdout, stderr } = await execAsync(cmd, { cwd: PROJECT_ROOT });
        return { success: true, stdout, stderr };
    } catch (error) {
        return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
    }
}

/**
 * 生成默克尔树根（基于考勤记录数组）
 * 每条记录格式：{ studentId, timestamp } 或其他唯一标识
 */
function generateMerkleRoot(records) {
    // 将每条记录转为哈希叶子
    const leaves = records.map(record => {
        const data = JSON.stringify(record);
        return crypto.createHash('sha256').update(data).digest('hex');
    });
    // 使用 merkletreejs 构建树，哈希算法采用 sha256
    const tree = new MerkleTree(leaves, crypto.createHash('sha256'), { sortPairs: true });
    const root = tree.getRoot().toString('hex');
    return '0x' + root;
}

// ---------- 路由定义 ----------

/**
 * POST /calculate-merkle-root
 * 接收考勤数据数组，返回默克尔根
 */
router.post('/calculate-merkle-root', authenticateToken, (req, res) => {
    try {
        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, error: '请提供有效的考勤记录数组' });
        }
        const merkleRoot = generateMerkleRoot(records);
        res.json({ success: true, merkleRoot });
    } catch (error) {
        console.error('生成默克尔根失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /upload-merkle-root
 * 上传默克尔根到区块链，并保存考勤记录元数据
 * 请求体：{ merkleRoot, attendanceDate, metadata? }
 */
router.post('/upload-merkle-root', authenticateToken, async (req, res) => {
    try {
        const { merkleRoot, attendanceDate, metadata } = req.body;
        if (!merkleRoot || !attendanceDate) {
            return res.status(400).json({ success: false, error: '缺少必要参数 merkleRoot 或 attendanceDate' });
        }
        
        // 验证默克尔根格式
        if (!merkleRoot.match(/^0x[a-fA-F0-9]{64}$/)) {
            return res.status(400).json({ success: false, error: '默克尔根格式错误' });
        }
        
        // 调用上链脚本
        const result = await runScript('uploadMerkleRoot.js', [merkleRoot, attendanceDate]);
        if (!result.success) {
            throw new Error(result.error || result.stderr);
        }
        
        // 从 stdout 提取区块高度
        const blockMatch = result.stdout.match(/blockNumber:\s*(\d+)/);
        const blockHeight = blockMatch ? parseInt(blockMatch[1]) : null;
        
        // 保存到数据库
        await db.addAttendanceRecord(merkleRoot, attendanceDate, blockHeight, metadata ? JSON.stringify(metadata) : null);
        
        res.json({
            success: true,
            message: '默克尔根已上链',
            blockHeight,
            merkleRoot
        });
    } catch (error) {
        console.error('上链失败:', error);
        res.status(500).json({ success: false, error: error.message });
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
            return res.status(400).json({ success: false, error: '缺少 merkleRoot 参数' });
        }
        
        const result = await runScript('verifyMerkleRoot.js', [merkleRoot]);
        if (!result.success) {
            throw new Error(result.error || result.stderr);
        }
        
        // 解析脚本输出的 JSON
        const output = JSON.parse(result.stdout);
        res.json({
            success: true,
            exists: output.exists,
            timestamp: output.timestamp,
            message: output.message
        });
    } catch (error) {
        console.error('验证失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /attendance-history
 * 获取考勤存证历史记录
 */
router.get('/attendance-history', authenticateToken, async (req, res) => {
    try {
        const records = db.getActiveAttendanceRecords();
        const formatted = records.map(r => ({
            id: r.id,
            merkleRoot: r.merkle_root,
            attendanceDate: r.attendance_date,
            uploadTime: r.upload_time,
            blockHeight: r.block_height,
            metadata: r.metadata ? JSON.parse(r.metadata) : null
        }));
        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('获取历史失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /attendance-record/:merkleRoot
 * 软删除考勤记录
 */
router.delete('/attendance-record/:merkleRoot', authenticateToken, async (req, res) => {
    try {
        const { merkleRoot } = req.params;
        const success = db.deleteAttendanceRecord(merkleRoot);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 调试端点：检查存储目录
router.get('/debug/storage', authenticateToken, (req, res) => {
    const exists = fs.existsSync(ATTENDANCE_STORAGE_PATH);
    let files = [];
    if (exists) {
        files = fs.readdirSync(ATTENDANCE_STORAGE_PATH);
    }
    res.json({ storagePath: ATTENDANCE_STORAGE_PATH, exists, fileCount: files.length, files });
});

export default router;