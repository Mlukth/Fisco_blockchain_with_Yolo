/**
 * 合约管理器 - FISCO BCOS 3.x 版本
 * 处理与区块链合约的交互
 */

import { BLOCKCHAIN_CONFIG, loadContractABI, getCertPaths } from '../config.js';
import fs from 'fs';
import path from 'path';

// 缓存 Web3jService 实例
let web3Service = null;
let contractInstance = null;

/**
 * 初始化 FISCO BCOS 3.x SDK 连接
 */
async function initWeb3Service() {
  if (web3Service) {
    return web3Service;
  }

  try {
    // 动态导入 FISCO BCOS 3.x SDK
    const { Web3jService, Configuration } = await import('@fiscobcos/nodejs-sdk');
    
    // 获取证书路径
    const certPaths = getCertPaths();
    
    // 验证证书文件存在
    for (const [name, certPath] of Object.entries(certPaths)) {
      if (!fs.existsSync(certPath)) {
        throw new Error(`证书文件不存在: ${certPath}`);
      }
    }

    // 创建配置
    const config = new Configuration({
      peers: [BLOCKCHAIN_CONFIG.CHANNEL_URL],
      group: BLOCKCHAIN_CONFIG.GROUP_ID,
      chain: BLOCKCHAIN_CONFIG.CHAIN_ID,
      certPath: BLOCKCHAIN_CONFIG.SSL.CERT_PATH,
      timeout: 30000
    });

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
  if (contractInstance) {
    return contractInstance;
  }

  if (!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
    throw new Error('合约地址未设置，请先部署合约');
  }

  const web3 = await initWeb3Service();
  const abi = loadContractABI();

  // FISCO BCOS 3.x 合约实例
  contractInstance = {
    address: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS,
    abi: abi,
    web3: web3
  };

  return contractInstance;
}

/**
 * 调用合约只读方法（call）
 * @param {string} methodName - 方法名
 * @param {Array} params - 参数列表
 */
async function callContractMethod(methodName, params = []) {
  const contract = await getContractInstance();
  
  try {
    // FISCO BCOS 3.x 调用方式
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
 * 发送交易（sendTransaction）
 * @param {string} methodName - 方法名
 * @param {Array} params - 参数列表
 * @param {Object} options - 交易选项
 */
async function sendContractTransaction(methodName, params = [], options = {}) {
  const contract = await getContractInstance();
  
  if (!BLOCKCHAIN_CONFIG.ADMIN_PRIVATE_KEY) {
    throw new Error('管理员私钥未设置');
  }

  try {
    // FISCO BCOS 3.x 发送交易
    const tx = {
      to: contract.address,
      from: options.from || await getAdminAddress(),
      data: encodeMethodData(contract.abi, methodName, params),
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
 * 编码方法调用数据
 */
function encodeMethodData(abi, methodName, params) {
  // 简化实现，实际应使用 ABI 编码器
  // FISCO BCOS SDK 通常会自动处理
  const method = abi.find(item => item.name === methodName && item.type === 'function');
  if (!method) {
    throw new Error(`方法不存在: ${methodName}`);
  }
  return { method, params };
}

/**
 * 获取管理员地址
 */
async function getAdminAddress() {
  // 从私钥计算地址（简化实现）
  const privateKey = BLOCKCHAIN_CONFIG.ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('管理员私钥未设置');
  }
  
  // FISCO BCOS 使用以太坊兼容地址
  // 实际应使用 elliptic 库从私钥计算
  // 这里返回占位符，SDK 会自动处理
  return '0x' + privateKey.slice(2, 42);
}

/**
 * 恢复合约状态（从部署记录）
 */
export async function restoreContractState() {
  try {
    const deploymentPath = path.resolve(
      process.cwd(), 
      '../deployments/fisco/AttendanceProof.json'
    );
    
    if (!fs.existsSync(deploymentPath)) {
      console.warn('⚠️ 部署记录不存在，请先部署合约');
      return null;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    if (deployment.address) {
      console.log(`✅ 从部署记录恢复合约地址: ${deployment.address}`);
      return deployment.address;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 恢复合约状态失败:', error.message);
    return null;
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

/**
 * 上传默克尔根
 */
export async function uploadMerkleRoot(merkleRoot, timestamp) {
  return await sendContractTransaction('uploadMerkleRoot', [merkleRoot, timestamp]);
}

/**
 * 验证默克尔根
 */
export async function verifyMerkleRoot(merkleRoot) {
  const result = await callContractMethod('isMerkleRootValid', [merkleRoot]);
  return result === true || result === 'true' || result?.[0] === true;
}

/**
 * 获取默克尔根时间戳
 */
export async function getMerkleRootTimestamp(merkleRoot) {
  const result = await callContractMethod('getMerkleRootTimestamp', [merkleRoot]);
  return parseInt(result) || 0;
}

/**
 * 获取所有默克尔根
 */
export async function getAllMerkleRoots() {
  const result = await callContractMethod('getAllMerkleRoots', []);
  return result || [];
}

/**
 * 获取默克尔根数量
 */
export async function getMerkleRootCount() {
  const result = await callContractMethod('getMerkleRootCount', []);
  return parseInt(result) || 0;
}

// 导出模块
export default {
  initWeb3Service,
  getContractInstance,
  callContractMethod,
  sendContractTransaction,
  restoreContractState,
  verifyContractDeployment,
  uploadMerkleRoot,
  verifyMerkleRoot,
  getMerkleRootTimestamp,
  getAllMerkleRoots,
  getMerkleRootCount
};