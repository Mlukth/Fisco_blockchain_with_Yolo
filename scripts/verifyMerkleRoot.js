/**
 * 验证默克尔根是否存在于 FISCO BCOS 3.x 区块链
 * 用法: node scripts/verifyMerkleRoot.js <merkleRoot>
 * 
 * 输出: JSON格式的验证结果
 *   { exists: boolean, timestamp: number, message: string }
 */

import Web3 from '@fiscobcos/nodejs-sdk';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入配置
async function loadConfig() {
  const configPath = path.resolve(__dirname, './config.js');
  const configModule = await import(configPath);
  return configModule.default;
}

/**
 * 验证默克尔根是否存在
 * @param {string} merkleRoot - 要验证的默克尔根
 * @param {object} config - 配置对象
 * @returns {object} 验证结果
 */
async function verifyMerkleRoot(merkleRoot, config) {
  try {
    // 1. 初始化 FISCO BCOS 3.x SDK
    const web3 = new Web3(config.rpcUrl);

    // 2. 检查合约是否存在
    const code = await web3.eth.getCode(config.contractAddress);
    if (code === '0x' || code === '0x0') {
      throw new Error(`合约不存在于地址: ${config.contractAddress}`);
    }

    // 3. 加载合约 ABI
    const abiPath = config.abiPath;
    if (!fs.existsSync(abiPath)) {
      throw new Error(`合约 ABI 文件不存在: ${abiPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const abi = artifact.abi || artifact;
    
    const contract = new web3.eth.Contract(abi, config.contractAddress);

    // 4. 调用合约查询
    const exists = await contract.methods.isMerkleRootValid(merkleRoot).call();
    const timestamp = exists 
      ? await contract.methods.getMerkleRootTimestamp(merkleRoot).call() 
      : 0;

    return {
      exists,
      timestamp: Number(timestamp),
      message: exists 
        ? `✅ 默克尔根已存在于链上，时间戳: ${timestamp}`
        : '❌ 默克尔根未在链上找到'
    };

  } catch (error) {
    throw error;
  }
}

async function main() {
  const merkleRoot = process.argv[2];

  try {
    // 参数验证
    if (!merkleRoot || !merkleRoot.startsWith('0x')) {
      throw new Error('❌ 请提供有效的默克尔根作为参数（格式: 0x...）');
    }

    if (!merkleRoot.match(/^0x[a-fA-F0-9]{64}$/)) {
      throw new Error('❌ 默克尔根格式错误，应为0x开头的64位十六进制字符串');
    }

    // 加载配置
    const config = await loadConfig();
    
    if (!config.contractAddress) {
      throw new Error('❌ 合约地址未配置');
    }

    // 执行验证
    const result = await verifyMerkleRoot(merkleRoot, config);
    
    // 输出 JSON 格式，供后端解析
    console.log(JSON.stringify(result));

  } catch (error) {
    console.error(JSON.stringify({ 
      exists: false, 
      timestamp: 0,
      error: `⚠️ 验证失败: ${error.message}` 
    }));
    process.exit(1);
  }
}

main();