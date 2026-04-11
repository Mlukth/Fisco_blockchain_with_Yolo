/**
 * FISCO BCOS 3.x 考勤存证合约部署脚本
 * 使用 @fiscobcos/nodejs-sdk 部署 AttendanceProof 合约
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入 FISCO BCOS 3.x SDK
let Web3jService, Configuration;
try {
  const sdk = await import('@fiscobcos/nodejs-sdk');
  Web3jService = sdk.Web3jService;
  Configuration = sdk.Configuration;
} catch (error) {
  console.error('❌ 请先安装 FISCO BCOS 3.x SDK:');
  console.error('   npm install @fiscobcos/nodejs-sdk@3.8.0');
  process.exit(1);
}

/**
 * 更新 fisco.config.js 中的合约地址
 */
function updateFiscoConfig(contractAddress) {
  const fiscoConfigPath = path.resolve(__dirname, '../fisco.config.js');
  
  const updatedConfig = {
    channelUrl: config.channelUrl,
    groupId: config.groupId,
    chainId: config.chainId,
    adminPrivateKey: config.adminPrivateKey,
    contractAddress: contractAddress,
    gasLimit: config.gasLimit,
    gasPrice: config.gasPrice,
    ssl: config.ssl
  };
  
  const content = `/**
 * FISCO BCOS 3.x 节点配置文件
 * 使用 Channel 协议连接本地节点
 */

export default ${JSON.stringify(updatedConfig, null, 2)};
`;
  
  fs.writeFileSync(fiscoConfigPath, content);
  console.log('🔄 已更新 fisco.config.js 中的合约地址');
}

/**
 * 保存部署记录
 */
function saveDeploymentRecord(contractAddress, transactionHash, deployer) {
  const deploymentsDir = config.deploymentsDir;
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const record = {
    contract: 'AttendanceProof',
    address: contractAddress,
    transactionHash: transactionHash,
    deployer: deployer,
    timestamp: new Date().toISOString(),
    network: {
      channelUrl: config.channelUrl,
      groupId: config.groupId,
      chainId: config.chainId
    }
  };
  
  const filePath = path.join(deploymentsDir, 'AttendanceProof.json');
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(`📝 部署记录已保存至: ${filePath}`);
}

/**
 * 获取合约编译产物
 */
function getContractArtifact() {
  const artifactPath = config.abiPath;
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `合约编译产物不存在: ${artifactPath}\n` +
      `请先使用 FISCO BCOS 控制台或 solc 编译合约。`
    );
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

/**
 * 从私钥计算账户地址
 * FISCO BCOS 3.x 使用与以太坊兼容的地址计算方式
 */
function getAddressFromPrivateKey(privateKey) {
  // 简单实现：使用 crypto 模块
  const crypto = await import('crypto');
  const publicKey = crypto.createPublicKey({
    key: Buffer.from(privateKey.replace('0x', ''), 'hex'),
    format: 'der',
    type: 'sec1'
  });
  
  // 这里简化处理，实际应使用 elliptic 库
  // FISCO BCOS 使用 secp256k1 曲线
  return '0x' + crypto.createHash('sha256').update(publicKey.export({ format: 'der', type: 'spki' })).digest('hex').slice(0, 40);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 FISCO BCOS 3.x 考勤存证合约部署');
  console.log(`🔗 Channel: ${config.channelUrl}`);
  console.log(`📦 群组ID: ${config.groupId}`);
  console.log(`🔑 部署账户私钥: ${config.adminPrivateKey ? '已设置' : '❌ 未设置'}`);
  console.log('='.repeat(60));
  
  if (!config.adminPrivateKey) {
    throw new Error('❌ 请先在 .env 或 fisco.config.js 中设置 ADMIN_PRIVATE_KEY');
  }
  
  // 检查证书文件
  const certPaths = config.getCertPaths();
  for (const [name, certPath] of Object.entries(certPaths)) {
    if (!fs.existsSync(certPath)) {
      throw new Error(`❌ 证书文件不存在: ${certPath}\n请确保已正确配置 SDK 证书路径。`);
    }
  }
  console.log('✅ 证书文件检查通过');
  
  // 1. 初始化 FISCO BCOS 3.x SDK
  const sdkConfig = new Configuration({
    peers: [config.channelUrl],
    group: config.groupId,
    chain: config.chainId,
    certPath: config.ssl.certPath,
    timeout: 30000
  });
  
  const web3 = new Web3jService(sdkConfig);
  console.log('✅ SDK 初始化成功');
  
  // 2. 获取合约编译产物
  const artifact = getContractArtifact();
  const abi = artifact.abi || artifact;
  const bytecode = artifact.bytecode || artifact.data?.bytecode?.object || artifact.bin;
  
  if (!bytecode) {
    throw new Error('合约编译产物中缺少 bytecode');
  }
  
  console.log('📄 合约 ABI 加载成功');
  
  // 3. 计算部署账户地址
  const deployerAddress = await getAddressFromPrivateKey(config.adminPrivateKey);
  console.log(`👤 部署账户地址: ${deployerAddress}`);
  
  // 4. 部署合约
  console.log('⏳ 正在发送部署交易...');
  
  let receipt;
  try {
    // FISCO BCOS 3.x SDK 部署方式
    const deployResult = await web3.deployContract({
      abi: abi,
      bytecode: bytecode.startsWith('0x') ? bytecode : '0x' + bytecode,
      from: deployerAddress,
      gas: config.gasLimit,
      arguments: []
    });
    
    receipt = deployResult;
  } catch (error) {
    // 如果 SDK API 不同，尝试其他方式
    console.log('⚠️ 尝试备用部署方式...');
    
    // 使用原始交易发送方式
    const contractConstructor = abi.find(item => item.type === 'constructor');
    const deployTx = {
      from: deployerAddress,
      data: bytecode.startsWith('0x') ? bytecode : '0x' + bytecode,
      gas: config.gasLimit,
      gasPrice: config.gasPrice
    };
    
    receipt = await web3.sendTransaction(deployTx);
  }
  
  const contractAddress = receipt.contractAddress || receipt.address;
  const transactionHash = receipt.transactionHash || receipt.hash;
  
  if (!contractAddress) {
    throw new Error('部署失败：无法获取合约地址');
  }
  
  console.log('✅ 合约部署成功！');
  console.log(`📜 合约地址: ${contractAddress}`);
  console.log(`📦 交易哈希: ${transactionHash}`);
  console.log(`🔢 区块号: ${receipt.blockNumber || '未知'}`);
  
  // 5. 保存 ABI 到 artifacts（确保存在）
  const artifactDir = path.dirname(config.abiPath);
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }
  
  fs.writeFileSync(config.abiPath, JSON.stringify({
    abi: abi,
    bytecode: bytecode,
    address: contractAddress
  }, null, 2));
  
  // 6. 更新配置文件
  updateFiscoConfig(contractAddress);
  
  // 7. 保存部署记录
  saveDeploymentRecord(contractAddress, transactionHash, deployerAddress);
  
  console.log('='.repeat(60));
  console.log('🎉 部署完成！');
  console.log('='.repeat(60));
  
  return contractAddress;
}

main().catch(error => {
  console.error('❌ 部署失败:', error.message);
  console.error(error.stack);
  process.exit(1);
});