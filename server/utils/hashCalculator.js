/**
 * 哈希计算工具 - FISCO BCOS 3.x 版本
 * 使用 Node.js 原生 crypto 模块，与区块链无关
 */

import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import db from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 存储目录 - 从环境变量或默认值
const STORAGE_DIR = process.env.ATTENDANCE_STORAGE_PATH || path.join(__dirname, '../attendance_storage');

// 创建存储目录
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  console.log(`📂 创建存储目录: ${STORAGE_DIR}`);
}

/**
 * 计算文件的 SHA-256 哈希，格式化为 bytes32 类型
 * @param {Buffer|string} input - 文件缓冲区或文件路径
 * @returns {string} 66 字符哈希（带0x前缀）
 */
function calculateImageHash(input) {
  let buffer;
  
  if (typeof input === 'string') {
    // 文件路径
    buffer = fs.readFileSync(input);
  } else {
    // Buffer
    buffer = input;
  }
  
  const hash = crypto.createHash('sha256')
    .update(buffer)
    .digest('hex');
  
  // 确保返回带0x前缀的66字符格式（bytes32）
  return `0x${hash}`;
}

/**
 * 验证哈希是否符合 bytes32 格式
 * @param {string} hash - 待验证的哈希字符串
 * @returns {boolean} 是否符合格式
 */
function isValidBytes32(hash) {
  return typeof hash === 'string' 
    && hash.startsWith('0x') 
    && hash.length === 66 
    && /^0x[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * 计算默克尔根哈希
 * @param {Array<string>} leaves - 叶子节点数组
 * @returns {string} 默克尔根
 */
function calculateMerkleRoot(leaves) {
  if (!Array.isArray(leaves) || leaves.length === 0) {
    throw new Error('叶子节点数组不能为空');
  }

  // 验证所有叶子节点都是有效的 bytes32
  for (const leaf of leaves) {
    if (!isValidBytes32(leaf)) {
      throw new Error(`无效的叶子节点: ${leaf}`);
    }
  }

  // 使用 merkletreejs 或手动实现
  let currentLevel = leaves.map(leaf => leaf.slice(2)); // 移除 0x

  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // 配对哈希
        const combined = currentLevel[i] + currentLevel[i + 1];
        const hash = crypto.createHash('sha256')
          .update(Buffer.from(combined, 'hex'))
          .digest('hex');
        nextLevel.push(hash);
      } else {
        // 奇数个节点，直接传递
        nextLevel.push(currentLevel[i]);
      }
    }
    
    currentLevel = nextLevel;
  }

  return `0x${currentLevel[0]}`;
}

/**
 * 计算文件哈希并存储
 * @param {Object} file - 文件对象（包含 path, originalname 等）
 * @returns {string} 文件哈希
 */
async function calculateHashWithStorage(file) {
  const hash = calculateImageHash(file.path);
  
  // 存储文件
  const ext = path.extname(file.originalname) || '.dat';
  const filename = `${hash}${ext}`;
  const destPath = path.join(STORAGE_DIR, filename);
  
  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(file.path, destPath);
  }
  
  // 添加到数据库记录（如果函数存在）
  if (db && typeof db.addImageRecord === 'function') {
    db.addImageRecord(hash, destPath);
  }
  
  return hash;
}

/**
 * 生成考勤数据哈希
 * @param {Object} attendanceData - 考勤数据对象
 * @returns {string} 哈希值
 */
function hashAttendanceData(attendanceData) {
  // 标准化数据格式
  const normalized = JSON.stringify({
    date: attendanceData.date,
    employeeId: attendanceData.employeeId,
    checkIn: attendanceData.checkIn,
    checkOut: attendanceData.checkOut,
    location: attendanceData.location || '',
    timestamp: attendanceData.timestamp || Date.now()
  });
  
  const hash = crypto.createHash('sha256')
    .update(normalized)
    .digest('hex');
  
  return `0x${hash}`;
}

/**
 * 验证文件完整性
 * @param {string} filePath - 文件路径
 * @param {string} expectedHash - 预期哈希
 * @returns {boolean} 是否匹配
 */
function verifyFileIntegrity(filePath, expectedHash) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  const actualHash = calculateImageHash(filePath);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}

// 导出模块
export {
  calculateImageHash,
  isValidBytes32,
  calculateMerkleRoot,
  calculateHashWithStorage,
  hashAttendanceData,
  verifyFileIntegrity
};

export default {
  calculateImageHash,
  isValidBytes32,
  calculateMerkleRoot,
  calculateHashWithStorage,
  hashAttendanceData,
  verifyFileIntegrity
};