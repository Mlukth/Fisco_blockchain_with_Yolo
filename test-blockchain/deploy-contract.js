#!/usr/bin/env node

/**
 * 部署 AttendanceProof 合约（使用 Web3.js + RPC）
 * 部署后自动更新 contract_address.txt 和 .env 中的合约地址
 */

import { Web3 } from 'web3';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ========== 配置 ==========
const RPC_URL = 'http://192.168.171.157:8545';

// 读取当前 .env 中的私钥（已经是您已知的账户）
const envPath = join(projectRoot, '.env');
const envContent = readFileSync(envPath, 'utf8');
const privateKeyMatch = envContent.match(/ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n([\s\S]*?)\n-----END PRIVATE KEY-----/);
if (!privateKeyMatch) {
    console.error('❌ 未在 .env 中找到 ADMIN_PRIVATE_KEY');
    process.exit(1);
}
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----\n${privateKeyMatch[1]}\n-----END PRIVATE KEY-----`;

// PEM 转 Hex
function pemToHex(pem) {
    const key = crypto.createPrivateKey({ key: pem, format: 'pem', type: 'pkcs8' });
    const jwk = key.export({ format: 'jwk' });
    const privateKeyBuffer = Buffer.from(jwk.d, 'base64url');
    return '0x' + privateKeyBuffer.toString('hex');
}

const PRIVATE_KEY_HEX = pemToHex(PRIVATE_KEY_PEM);

// 读取合约字节码和 ABI
const artifactPath = join(projectRoot, 'artifacts/AttendanceProof.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
const abi = artifact.abi;
// 注意：编译产物中可能没有 bytecode，我们需要从编译脚本获取或直接使用 solc 编译
// 但这里我们可以从项目中已有的编译输出读取（例如 contracts/AttendanceProof.bin）
// 如果缺失，需要先编译合约。下面假设字节码文件存在。
let bytecode;
try {
    bytecode = readFileSync(join(projectRoot, 'contracts/AttendanceProof.bin'), 'utf8').trim();
    if (!bytecode.startsWith('0x')) bytecode = '0x' + bytecode;
} catch (e) {
    console.error('❌ 未找到合约字节码文件 contracts/AttendanceProof.bin');
    console.error('   请先编译合约：cd /home/mmm/Fisco_blockchain_with_Yolo && npx hardhat compile');
    process.exit(1);
}

// ========== 部署 ==========
async function deploy() {
    const web3 = new Web3(RPC_URL);
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY_HEX);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    console.log('🔗 连接节点:', RPC_URL);
    console.log('👤 部署账户:', account.address);
    console.log('📦 合约字节码长度:', bytecode.length);

    // 创建合约对象
    const contract = new web3.eth.Contract(abi);

    // 部署
    console.log('⏳ 发送部署交易...');
    const deployedContract = await contract.deploy({
        data: bytecode,
        arguments: []  // 构造函数无参数
    }).send({
        from: account.address,
        gas: 3000000,
        gasPrice: 1
    });

    const newAddress = deployedContract.options.address;
    console.log('✅ 合约部署成功！新地址:', newAddress);

    // 更新 contract_address.txt
    const addrFilePath = join(projectRoot, 'contract_address.txt');
    writeFileSync(addrFilePath, newAddress);
    console.log('📝 已更新 contract_address.txt');

    // 更新 .env 中的 CONTRACT_ADDRESS
    let envUpdated = envContent.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${newAddress}`);
    writeFileSync(envPath, envUpdated);
    console.log('📝 已更新 .env 中的 CONTRACT_ADDRESS');

    // 可选：更新 fisco.config.js
    const fiscoConfigPath = join(projectRoot, 'fisco.config.js');
    let fiscoConfig = readFileSync(fiscoConfigPath, 'utf8');
    fiscoConfig = fiscoConfig.replace(/contractAddress:.*,/g, `contractAddress: '${newAddress}',`);
    writeFileSync(fiscoConfigPath, fiscoConfig);
    console.log('📝 已更新 fisco.config.js');

    console.log('\n🎉 部署完成，新合约地址已写入配置。');
}

deploy().catch(err => {
    console.error('❌ 部署失败:', err.message);
    process.exit(1);
});