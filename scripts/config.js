/**
 * 区块链交互脚本公共配置模块
 * FISCO BCOS 3.x 版本 - 使用 Channel 协议
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载 FISCO 配置
const fiscoConfigPath = path.resolve(__dirname, '../fisco.config.js');
let fiscoConfig = {};

if (fs.existsSync(fiscoConfigPath)) {
  // 动态导入 ES Module
  fiscoConfig = (await import(fiscoConfigPath)).default;
} else {
  console.warn('⚠️ fisco.config.js 未找到，使用环境变量');
}

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 导出区块链配置
export default {
  // Channel 连接信息（FISCO BCOS 3.x）
  channelUrl: fiscoConfig.channelUrl || process.env.FISCO_CHANNEL_URL || '127.0.0.1:20200',
  
  // 群组和链信息
  groupId: fiscoConfig.groupId || process.env.FISCO_GROUP_ID || 'group0',
  chainId: fiscoConfig.chainId || process.env.FISCO_CHAIN_ID || 'chain0',
  
  // 管理员账户
  adminPrivateKey: fiscoConfig.adminPrivateKey || process.env.ADMIN_PRIVATE_KEY || '',
  
  // 合约地址
  contractAddress: fiscoConfig.contractAddress || process.env.CONTRACT_ADDRESS || '',
  
  // 交易参数
  gasLimit: fiscoConfig.gasLimit || 300000,
  gasPrice: fiscoConfig.gasPrice || 1,
  
  // SSL 证书配置（3.x 必需）
  ssl: {
    enable: fiscoConfig.ssl?.enable ?? true,
    certPath: fiscoConfig.ssl?.certPath || process.env.SDK_CERT_PATH || './nodes/127.0.0.1/sdk',
    caCert: fiscoConfig.ssl?.caCert || process.env.SDK_CA_CERT || 'ca.crt',
    sslCert: fiscoConfig.ssl?.sslCert || process.env.SDK_SSL_CERT || 'sdk.crt',
    sslKey: fiscoConfig.ssl?.sslKey || process.env.SDK_SSL_KEY || 'sdk.key'
  },
  
  // 合约 ABI 路径（统一从 artifacts 读取，部署后生成）
  abiPath: path.resolve(__dirname, '../artifacts/AttendanceProof.json'),
  
  // 部署记录目录
  deploymentsDir: path.resolve(__dirname, '../deployments/fisco'),
  
  // 加载合约 ABI 的辅助函数
  getContractABI() {
    try {
      const artifact = JSON.parse(fs.readFileSync(this.abiPath, 'utf8'));
      return artifact.abi || artifact;
    } catch (error) {
      console.error('❌ 无法加载合约 ABI，请先编译合约');
      throw error;
    }
  },
  
  // 获取完整的证书路径
  getCertPaths() {
    return {
      ca: path.join(this.ssl.certPath, this.ssl.caCert),
      cert: path.join(this.ssl.certPath, this.ssl.sslCert),
      key: path.join(this.ssl.certPath, this.ssl.sslKey)
    };
  }
};