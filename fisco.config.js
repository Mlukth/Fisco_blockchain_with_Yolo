/**
 * FISCO BCOS 节点配置文件
 * 用于连接本地离线单节点
 */
module.exports = {
  // 节点RPC地址（根据实际FISCO节点配置调整）
  rpcUrl: process.env.FISCO_RPC_URL || 'http://127.0.0.1:8545',
  
  // 群组ID
  groupId: process.env.FISCO_GROUP_ID || 1,
  
  // 链ID（FISCO BCOS 3.0默认使用1）
  chainId: process.env.FISCO_CHAIN_ID || 1,
  
  // 管理员账户私钥（用于发送交易）
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
  
  // 合约地址（部署后更新）
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  
  // SDK证书配置（本地单节点测试时可留空，生产环境需配置）
  ssl: {
    enable: false,
    certPath: '',
    caPath: '',
    keyPath: ''
  },
  
  // 交易相关配置
  gasLimit: 300000,
  gasPrice: 1
};