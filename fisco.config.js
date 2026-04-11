/**
 * FISCO BCOS 3.x 节点配置文件
 * 使用 Channel 协议连接本地节点
 */

module.exports = {
  // Channel 连接地址（FISCO BCOS 3.x 使用 Channel 协议）
  channelUrl: process.env.FISCO_CHANNEL_URL || '127.0.0.1:20200',
  
  // 群组ID（3.x 默认为 group0）
  groupId: process.env.FISCO_GROUP_ID || 'group0',
  
  // 链ID（3.x 默认为 chain0）
  chainId: process.env.FISCO_CHAIN_ID || 'chain0',
  
  // 管理员账户私钥（用于发送交易）
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
  
  // 合约地址（部署后更新）
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  
  // SDK 证书配置（FISCO BCOS 3.x 必需）
  ssl: {
    enable: true,
    certPath: process.env.SDK_CERT_PATH || './nodes/127.0.0.1/sdk',
    caCert: process.env.SDK_CA_CERT || 'ca.crt',
    sslCert: process.env.SDK_SSL_CERT || 'sdk.crt',
    sslKey: process.env.SDK_SSL_KEY || 'sdk.key'
  },
  
  // 交易相关配置
  gasLimit: 300000,
  gasPrice: 1
};