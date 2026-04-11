/**
 * 上传考勤默克尔根到 FISCO BCOS 3.x 区块链
 * 用法: node scripts/uploadMerkleRoot.js <merkleRoot> [timestamp]
 * 
 * 参数:
 *   merkleRoot: 0x开头的64位十六进制字符串（默克尔根哈希）
 *   timestamp: 可选，考勤日期的时间戳（Unix秒），默认为当前时间
 * 
 * 输出:
 *   blockNumber: xxx
 *   transactionHash: xxx
 */

import Web3 from '@fiscobcos/nodejs-sdk';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入配置（ES Module）
async function loadConfig() {
  const configPath = path.resolve(__dirname, './config.js');
  const configModule = await import(configPath);
  return configModule.default;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('用法: node uploadMerkleRoot.js <merkleRoot> [timestamp]');
    console.error('示例: node uploadMerkleRoot.js 0x1234... 1712851200');
    process.exit(1);
  }

  const merkleRoot = args[0];
  const timestamp = args[1] ? parseInt(args[1]) : Math.floor(Date.now() / 1000);

  // 验证哈希格式
  if (!merkleRoot.match(/^0x[a-fA-F0-9]{64}$/)) {
    console.error('❌ 默克尔根格式错误，应为0x开头的64位十六进制字符串');
    process.exit(1);
  }

  console.log(`📤 准备上链默克尔根: ${merkleRoot}`);
  console.log(`⏰ 时间戳: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);

  try {
    // 加载配置
    const config = await loadConfig();
    
    // 检查配置完整性
    if (!config.contractAddress) {
      throw new Error('❌ 合约地址未配置，请先部署合约');
    }
    if (!config.adminPrivateKey) {
      throw new Error('❌ 管理员私钥未配置，请在 .env 或 fisco.config.js 中设置 ADMIN_PRIVATE_KEY');
    }

    // 1. 初始化 FISCO BCOS 3.x SDK（Channel 协议）
    const web3 = new Web3(config.rpcUrl);
    
    // 设置账户
    const account = web3.eth.accounts.privateKeyToAccount(config.adminPrivateKey);
    console.log(`👤 使用账户: ${account.address}`);

    // 2. 加载合约 ABI
    const abiPath = config.abiPath;
    if (!fs.existsSync(abiPath)) {
      throw new Error(`❌ 合约 ABI 文件不存在: ${abiPath}，请先部署合约`);
    }
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const abi = artifact.abi || artifact;
    
    const contract = new web3.eth.Contract(abi, config.contractAddress);

    // 3. 检查默克尔根是否已存在
    console.log('🔍 检查默克尔根是否已上链...');
    const exists = await contract.methods.isMerkleRootValid(merkleRoot).call();
    
    if (exists) {
      console.log('⚠️ 该默克尔根已存在于链上，无需重复上传');
      const existingTimestamp = await contract.methods.getMerkleRootTimestamp(merkleRoot).call();
      console.log(`   已存在时间戳: ${existingTimestamp}`);
      console.log(`blockNumber: 0 (already exists)`);
      return;
    }

    // 4. 发送上链交易
    console.log('⏳ 正在发送交易...');
    
    const receipt = await contract.methods.uploadMerkleRoot(merkleRoot, timestamp).send({
      from: account.address,
      gas: config.gasLimit,
      gasPrice: config.gasPrice
    });

    // 5. 输出结果
    console.log('✅ 默克尔根上链成功！');
    console.log(`blockNumber: ${receipt.blockNumber}`);
    console.log(`transactionHash: ${receipt.transactionHash}`);

  } catch (error) {
    console.error('❌ 上链失败:', error.message);
    
    // 检查是否为网络错误
    if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
      console.error('⚠️ 网络连接失败，请确保 FISCO BCOS 节点已启动');
      console.error('   节点地址应为: 127.0.0.1:20200 (Channel 协议)');
    }
    
    // 检查是否为证书问题
    if (error.message.includes('certificate') || error.message.includes('SSL')) {
      console.error('⚠️ 证书配置错误，请检查 fisco.config.js 中的证书路径');
    }
    
    process.exit(1);
  }
}

main();