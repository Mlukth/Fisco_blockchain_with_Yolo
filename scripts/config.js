/**
 * 区块链交互脚本公共配置模块
 * 从 fisco.config.js 和 .env 加载配置，并提供统一的合约 ABI 加载
 */
const fs = require('fs');
const path = require('path');

// 加载 FISCO 配置
const fiscoConfigPath = path.resolve(__dirname, '../fisco.config.js');
let fiscoConfig = {};
if (fs.existsSync(fiscoConfigPath)) {
    fiscoConfig = require(fiscoConfigPath);
} else {
    console.warn('⚠️ fisco.config.js 未找到，使用环境变量');
}

// 加载环境变量（可选）
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 导出区块链配置
module.exports = {
    // 节点连接信息
    rpcUrl: fiscoConfig.rpcUrl || process.env.FISCO_RPC_URL || 'http://127.0.0.1:8545',
    groupId: fiscoConfig.groupId || process.env.FISCO_GROUP_ID || 1,
    chainId: fiscoConfig.chainId || process.env.FISCO_CHAIN_ID || 1,
    
    // 管理员账户
    adminPrivateKey: fiscoConfig.adminPrivateKey || process.env.ADMIN_PRIVATE_KEY || '',
    
    // 合约地址
    contractAddress: fiscoConfig.contractAddress || process.env.CONTRACT_ADDRESS || '',
    
    // 交易参数
    gasLimit: fiscoConfig.gasLimit || 300000,
    gasPrice: fiscoConfig.gasPrice || 1,
    
    // 合约 ABI 路径（统一从 artifacts 读取，部署后生成）
    abiPath: path.resolve(__dirname, '../artifacts/AttendanceProof.json'),
    
    // 部署记录目录
    deploymentsDir: path.resolve(__dirname, '../deployments/fisco'),
    
    // 加载合约 ABI 的辅助函数
    getContractABI: function() {
        try {
            const artifact = JSON.parse(fs.readFileSync(this.abiPath, 'utf8'));
            return artifact.abi;
        } catch (error) {
            console.error('❌ 无法加载合约 ABI，请先部署合约');
            throw error;
        }
    }
};