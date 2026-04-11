/**
 * 服务器配置文件 - FISCO BCOS 3.x 版本
 * 使用 Channel 协议连接区块链节点
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 加载 FISCO 配置
const fiscoConfigPath = path.resolve(__dirname, '../fisco.config.js');
let fiscoConfig = {};

if (fs.existsSync(fiscoConfigPath)) {
  try {
    const configModule = await import(fiscoConfigPath);
    fiscoConfig = configModule.default || configModule;
  } catch (error) {
    console.warn('⚠️ fisco.config.js 加载失败，使用环境变量:', error.message);
  }
} else {
  console.warn('⚠️ fisco.config.js 未找到，使用环境变量作为后备');
}

// 保护机制，防止生产环境误操作
export const ALLOW_FULL_RESET = process.env.ALLOW_FULL_RESET === 'true' || process.env.NODE_ENV !== 'production';

// 区块链配置导出
export const BLOCKCHAIN_CONFIG = {
  // Channel 连接（FISCO BCOS 3.x）
  CHANNEL_URL: fiscoConfig.channelUrl || process.env.FISCO_CHANNEL_URL || '127.0.0.1:20200',
  
  // 群组和链信息
  GROUP_ID: fiscoConfig.groupId || process.env.FISCO_GROUP_ID || 'group0',
  CHAIN_ID: fiscoConfig.chainId || process.env.FISCO_CHAIN_ID || 'chain0',
  
  // 管理员账户
  ADMIN_PRIVATE_KEY: fiscoConfig.adminPrivateKey || process.env.ADMIN_PRIVATE_KEY || '',
  
  // 合约地址
  CONTRACT_ADDRESS: fiscoConfig.contractAddress || process.env.CONTRACT_ADDRESS || '',
  
  // 交易参数
  GAS_LIMIT: fiscoConfig.gasLimit || 300000,
  GAS_PRICE: fiscoConfig.gasPrice || 1,
  
  // SSL 证书配置
  SSL: {
    ENABLE: fiscoConfig.ssl?.enable ?? true,
    CERT_PATH: fiscoConfig.ssl?.certPath || process.env.SDK_CERT_PATH || '/home/mmm/fisco/nodes/127.0.0.1/sdk',
    CA_CERT: fiscoConfig.ssl?.caCert || process.env.SDK_CA_CERT || 'ca.crt',
    SSL_CERT: fiscoConfig.ssl?.sslCert || process.env.SDK_SSL_CERT || 'sdk.crt',
    SSL_KEY: fiscoConfig.ssl?.sslKey || process.env.SDK_SSL_KEY || 'sdk.key'
  }
};

// 考勤数据存储路径
export const ATTENDANCE_STORAGE_PATH = process.env.ATTENDANCE_STORAGE_PATH || path.join(__dirname, 'attendance_storage');

// JWT密钥
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 服务器端口
export const PORT = process.env.PORT || 3002;

// CORS 允许源（包含本地开发前端地址）
export const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:8000',
  'http://192.168.171.157:8000',   // 虚拟机前端地址
  'http://192.168.171.157:3002'
];

// 合约 ABI 路径
export const CONTRACT_ABI_PATH = path.resolve(__dirname, '../artifacts/AttendanceProof.json');

// 输出配置信息
console.log('='.repeat(60));
console.log('���� FISCO BCOS 3.x ��考勤存证系统配置');
console.log(`- Channel URL: ${BLOCKCHAIN_CONFIG.CHANNEL_URL}`);
console.log(`- 群组ID: ${BLOCKCHAIN_CONFIG.GROUP_ID}`);
console.log(`- 链ID: ${BLOCKCHAIN_CONFIG.CHAIN_ID}`);
console.log(`- 合约地址: ${BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS || '未设置'}`);
console.log(`- 证书路径: ${BLOCKCHAIN_CONFIG.SSL.CERT_PATH}`);
console.log(`- 考勤存储路径: ${ATTENDANCE_STORAGE_PATH}`);
console.log(`- 允许完全重置: ${ALLOW_FULL_RESET ? '是' : '否'}`);
console.log('='.repeat(60));

// 确保存储目录存在
if (!fs.existsSync(ATTENDANCE_STORAGE_PATH)) {
  console.log('���� ��考勤存储目录不存在，正在创建...');
  fs.mkdirSync(ATTENDANCE_STORAGE_PATH, { recursive: true });
}

/**
 * 获取证书完整路径
 */
export function getCertPaths() {
  const certPath = BLOCKCHAIN_CONFIG.SSL.CERT_PATH;
  return {
    ca: path.resolve(certPath, BLOCKCHAIN_CONFIG.SSL.CA_CERT),
    cert: path.resolve(certPath, BLOCKCHAIN_CONFIG.SSL.SSL_CERT),
    key: path.resolve(certPath, BLOCKCHAIN_CONFIG.SSL.SSL_KEY)
  };
}

/**
 * 动态重载配置函数（用于部署后更新合约地址）
 */
export async function reloadConfig() {
  console.log('���� ��重新加载FISCO配置...');
  
  try {
    const modulePath = path.resolve(fiscoConfigPath);
    const configModule = await import(modulePath + '?t=' + Date.now());
    const newConfig = configModule.default || configModule;
    
    BLOCKCHAIN_CONFIG.CHANNEL_URL = newConfig.channelUrl;
    BLOCKCHAIN_CONFIG.GROUP_ID = newConfig.groupId;
    BLOCKCHAIN_CONFIG.CHAIN_ID = newConfig.chainId;
    BLOCKCHAIN_CONFIG.ADMIN_PRIVATE_KEY = newConfig.adminPrivateKey;
    BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS = newConfig.contractAddress;
    BLOCKCHAIN_CONFIG.GAS_LIMIT = newConfig.gasLimit;
    BLOCKCHAIN_CONFIG.GAS_PRICE = newConfig.gasPrice;
    
    console.log('✅ FISCO配置已更新，合约地址:', BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS);
  } catch (error) {
    console.error('❌ 重载配置失败:', error.message);
  }
}

/**
 * 加载合约 ABI
 */
export function loadContractABI() {
  try {
    if (!fs.existsSync(CONTRACT_ABI_PATH)) {
      throw new Error(`合约 ABI 文件不存在: ${CONTRACT_ABI_PATH}`);
    }
    const artifact = JSON.parse(fs.readFileSync(CONTRACT_ABI_PATH, 'utf8'));
    return artifact.abi || artifact;
  } catch (error) {
    console.error('❌ 加载合约 ABI 失败:', error.message);
    throw error;
  }
}

/**
 * 验证配置完整性
 */
export function validateConfig() {
  const errors = [];
  
  if (!BLOCKCHAIN_CONFIG.ADMIN_PRIVATE_KEY) {
    errors.push('ADMIN_PRIVATE_KEY 未设置');
  }
  
  if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
    errors.push('CONTRACT_ADDRESS 未设置（请先部署合约）');
  }
  
  // 检查证书文件
  const certPaths = getCertPaths();
  for (const [name, certPath] of Object.entries(certPaths)) {
    if (!fs.existsSync(certPath)) {
      errors.push(`证书文件不存在: ${certPath}`);
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ 配置验证失败:');
    errors.forEach(err => console.error(`   - ${err}`));
    return false;
  }
  
  console.log('✅ 配置验证通过');
  return true;
}

// 启动时验证配置（延迟执行，避免阻塞）
setTimeout(() => {
  if (BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
    validateConfig();
  } else {
    console.warn('⚠️ 合约地址未设置，请先部署合约');
  }
}, 1000);

// 别名导出（兼容旧代码）
export const IMAGE_STORAGE_PATH = ATTENDANCE_STORAGE_PATH;
