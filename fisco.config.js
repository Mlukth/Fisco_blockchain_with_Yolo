/**
 * FISCO BCOS 3.x 配置 - 精简版
 * 仅保留区块链连接核心参数
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  // 节点连接信息
  channel: {
    url: process.env.FISCO_CHANNEL_URL || '127.0.0.1:20200',
    timeout: 30000
  },
  
  // 群组和链ID
  groupId: process.env.FISCO_GROUP_ID || 'group0',
  chainId: process.env.FISCO_CHAIN_ID || 'chain0',
  
  // 合约地址（部署后自动更新）
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  
  // SSL 证书路径
  ssl: {
    certPath: path.resolve(__dirname, 'sdk/'),
    caCert: path.resolve(__dirname, 'sdk/ca.crt'),
    sdkCert: path.resolve(__dirname, 'sdk/sdk.crt'),
    sdkKey: path.resolve(__dirname, 'sdk/sdk.key')
  },
  
  // 管理员私钥（用于发送交易）
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
  
  // Gas 配置
  gasLimit: 3000000,
  gasPrice: 1
};