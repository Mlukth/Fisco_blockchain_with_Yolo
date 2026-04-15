#!/usr/bin/env node

/**
 * 部署 AttendanceProof 合约（使用 solc 编译出的字节码）
 * 部署后自动更新 contract_address.txt 和 .env
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

// 读取 .env 中的私钥
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

// 读取编译产物
const binPath = join(projectRoot, 'build/AttendanceProof.bin');
const abiPath = join(projectRoot, 'build/AttendanceProof.abi');

let bytecode;
try {
    bytecode = readFileSync(binPath, 'utf8').trim();
    if (!bytecode.startsWith('0x')) bytecode = '0x' + bytecode;
} catch (e) {
    console.error('❌ 未找到字节码文件:', binPath);
    console.error('   请先执行编译命令：npx solc --bin --abi contracts/AttendanceProof.sol -o build/ --overwrite');
    process.exit(1);
}

const abi = JSON.parse(readFileSync(abiPath, 'utf8'));

// ========== 部署 ==========
async function deploy() {
    const web3 = new Web3(RPC_URL);
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY_HEX);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    console.log('🔗 连接节点:', RPC_URL);
    console.log('👤 部署账户:', account.address);
    console.log('📦 合约字节码长度:', bytecode.length);

    const contract = new web3.eth.Contract(abi);

    console.log('⏳ 发送部署交易...');
    const deployedContract = await contract.deploy({
        data: bytecode,
        arguments: []
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

    // 更新 fisco.config.js（可选）
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