// 服务器配置文件（FISCO BCOS 迁移版）
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// 引入FISCO配置
const fiscoConfigPath = path.resolve(__dirname, '../fisco.config.js');
let fiscoConfig = {};
if (fs.existsSync(fiscoConfigPath)) {
    fiscoConfig = require(fiscoConfigPath);
} else {
    console.warn('⚠️ fisco.config.js 未找到，使用环境变量作为后备');
    fiscoConfig = {
        rpcUrl: process.env.FISCO_RPC_URL || 'http://127.0.0.1:8545',
        groupId: process.env.FISCO_GROUP_ID || 1,
        chainId: process.env.FISCO_CHAIN_ID || 1,
        adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
        contractAddress: process.env.CONTRACT_ADDRESS || '',
        gasLimit: 300000,
        gasPrice: 1
    };
}

// 保护机制，防止生产环境误操作
export const ALLOW_FULL_RESET = process.env.ALLOW_FULL_RESET === 'true' || process.env.NODE_ENV !== 'production';

// 区块链配置导出
export const BLOCKCHAIN_CONFIG = {
    RPC_URL: fiscoConfig.rpcUrl,
    GROUP_ID: fiscoConfig.groupId,
    CHAIN_ID: fiscoConfig.chainId,
    ADMIN_PRIVATE_KEY: fiscoConfig.adminPrivateKey,
    CONTRACT_ADDRESS: fiscoConfig.contractAddress,
    GAS_LIMIT: fiscoConfig.gasLimit,
    GAS_PRICE: fiscoConfig.gasPrice
};

// 考勤数据存储路径
export const ATTENDANCE_STORAGE_PATH = process.env.ATTENDANCE_STORAGE_PATH || 
    path.join(__dirname, '../server/attendance_storage');

// 考勤数据访问URL基础路径
export const ATTENDANCE_BASE_URL = process.env.ATTENDANCE_BASE_URL || '/api/attendance';

// JWT密钥
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 服务器端口
export const PORT = process.env.PORT || 3002;

// CORS允许源
export const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:3002'];

// 验证配置
console.log('='.repeat(60));
console.log('🔧 FISCO BCOS 考勤存证系统配置');
console.log(`- RPC URL: ${BLOCKCHAIN_CONFIG.RPC_URL}`);
console.log(`- 群组ID: ${BLOCKCHAIN_CONFIG.GROUP_ID}`);
console.log(`- 链ID: ${BLOCKCHAIN_CONFIG.CHAIN_ID}`);
console.log(`- 合约地址: ${BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS || '未设置'}`);
console.log(`- 考勤存储路径: ${ATTENDANCE_STORAGE_PATH}`);
console.log(`- 允许完全重置: ${ALLOW_FULL_RESET ? '是' : '否'}`);
console.log('='.repeat(60));

// 确保存储目录存在
if (!fs.existsSync(ATTENDANCE_STORAGE_PATH)) {
    console.log('📁 考勤存储目录不存在，正在创建...');
    fs.mkdirSync(ATTENDANCE_STORAGE_PATH, { recursive: true });
}

// 动态重载配置函数（用于部署后更新合约地址）
export async function reloadConfig() {
    console.log('🔄 重新加载FISCO配置...');
    delete require.cache[require.resolve(fiscoConfigPath)];
    const newConfig = require(fiscoConfigPath);
    
    BLOCKCHAIN_CONFIG.RPC_URL = newConfig.rpcUrl;
    BLOCKCHAIN_CONFIG.GROUP_ID = newConfig.groupId;
    BLOCKCHAIN_CONFIG.CHAIN_ID = newConfig.chainId;
    BLOCKCHAIN_CONFIG.ADMIN_PRIVATE_KEY = newConfig.adminPrivateKey;
    BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS = newConfig.contractAddress;
    BLOCKCHAIN_CONFIG.GAS_LIMIT = newConfig.gasLimit;
    BLOCKCHAIN_CONFIG.GAS_PRICE = newConfig.gasPrice;
    
    console.log('✅ FISCO配置已更新，合约地址:', BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS);
}

// 合约地址验证函数（使用FISCO SDK）
export async function validateContractAddress() {
    if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
        console.error('❌ 合约地址未设置');
        return false;
    }
    try {
        const Web3 = require('@fisco/bcos-node-sdk');
        const web3 = new Web3(BLOCKCHAIN_CONFIG.RPC_URL);
        const code = await web3.eth.getCode(BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS);
        
        if (code === '0x' || code === '0x0') {
            console.error('❌ 合约地址没有代码 - 合约未部署');
            return false;
        }
        
        console.log('✅ 合约验证成功');
        return true;
    } catch (error) {
        console.error('❌ 合约验证失败:', error.message);
        return false;
    }
}

// 延迟验证（等待网络就绪）
setTimeout(() => {
    if (BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
        validateContractAddress().catch(console.error);
    }
}, 1000);