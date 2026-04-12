/**
 * 合约管理器 - FISCO BCOS 3.x 版本
 */
import { BLOCKCHAIN_CONFIG, loadContractABI } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let web3Service = null;
let contractInstance = null;

/**
 * 初始化 FISCO BCOS 3.x SDK 连接
 */
async function initWeb3Service() {
  if (web3Service) return web3Service;

  try {
    const sdkPath = '/home/mmm/Fisco_blockchain_with_Yolo/node_modules/@fiscobcos/nodejs-sdk/packages/api/index.js';
    const { Web3jService, Configuration } = await import(sdkPath);

    // 使用 JSON 配置文件路径（FISCO SDK 要求）
    const configPath = '/home/mmm/Fisco_blockchain_with_Yolo/sdk-config.json';
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`SDK 配置文件不存在: ${configPath}`);
    }

    // Configuration 构造函数需要配置文件路径，不是对象
    const config = new Configuration(configPath);
    
    web3Service = new Web3jService(config);
    console.log('✅ FISCO BCOS 3.x SDK 初始化成功');
    return web3Service;
  } catch (error) {
    console.error('❌ SDK 初始化失败:', error.message);
    throw error;
  }
}

/**
 * 获取合约实例
 */
async function getContractInstance() {
  if (contractInstance) return contractInstance;

  if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
    throw new Error('合约地址未设置，请先部署合约');
  }

  const web3 = await initWeb3Service();
  const abi = loadContractABI();

  contractInstance = {
    address: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS,
    abi: abi,
    web3: web3
  };

  return contractInstance;
}

/**
 * 调用合约只读方法
 */
async function callContractMethod(methodName, params = []) {
  const contract = await getContractInstance();

  try {
    const result = await contract.web3.call(
      contract.address,
      methodName,
      params,
      { abi: contract.abi }
    );
    return result;
  } catch (error) {
    console.error(`❌ 合约调用失败 (${methodName}):`, error.message);
    throw error;
  }
}

/**
 * 发送交易
 */
async function sendContractTransaction(methodName, params = [], options = {}) {
  const contract = await getContractInstance();

  if (!BLOCKCHAIN_CONFIG.ADMIN_PRIVATE_KEY) {
    throw new Error('管理员私钥未设置，无法发送交易');
  }

  try {
    const method = contract.abi.find(item => item.name === methodName && item.type === 'function');
    if (!method) throw new Error(`方法不存在: ${methodName}`);

    const tx = {
      to: contract.address,
      data: { method, params },
      gas: options.gas || BLOCKCHAIN_CONFIG.GAS_LIMIT,
      gasPrice: options.gasPrice || BLOCKCHAIN_CONFIG.GAS_PRICE
    };

    const receipt = await contract.web3.sendTransaction(tx);
    console.log(`✅ 交易发送成功: ${receipt.transactionHash || receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error(`❌ 交易发送失败 (${methodName}):`, error.message);
    throw error;
  }
}

/**
 * 验证合约部署状态
 */
export async function verifyContractDeployment() {
  if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
    return { valid: false, reason: '合约地址未设置' };
  }

  try {
    const web3 = await initWeb3Service();
    const code = await web3.getCode(BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS);

    if (code === '0x' || code === '0x0') {
      return { valid: false, reason: '合约地址没有代码' };
    }

    return { valid: true, address: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
}

// ==================== 核心存证方法 ====================

export async function uploadMerkleRoot(merkleRoot, timestamp) {
  return await sendContractTransaction('uploadMerkleRoot', [merkleRoot, timestamp]);
}

export async function verifyMerkleRoot(merkleRoot) {
  const result = await callContractMethod('isMerkleRootValid', [merkleRoot]);
  return result === true || result === 'true' || result?.[0] === true;
}

export async function getMerkleRootTimestamp(merkleRoot) {
  const result = await callContractMethod('getMerkleRootTimestamp', [merkleRoot]);
  return parseInt(result) || 0;
}

export async function getAllMerkleRoots() {
  const result = await callContractMethod('getAllMerkleRoots', []);
  return result || [];
}

export async function getMerkleRootCount() {
  const result = await callContractMethod('getMerkleRootCount', []);
  return parseInt(result) || 0;
}

export default {
  initWeb3Service,
  getContractInstance,
  verifyContractDeployment,
  uploadMerkleRoot,
  verifyMerkleRoot,
  getMerkleRootTimestamp,
  getAllMerkleRoots,
  getMerkleRootCount
};