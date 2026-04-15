#!/usr/bin/env node

/**
 * 独立测试脚本：验证通过 HTTP RPC 连接 FISCO BCOS 节点并调用合约
 * 增加权限检查：如果当前账户不是 owner，则提示需要替换私钥
 */

import { Web3 } from 'web3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ========== 配置参数 ==========
const RPC_URL = 'http://192.168.171.157:8545';
const CONTRACT_ADDRESS = readFileSync(join(projectRoot, 'contract_address.txt'), 'utf8').trim();
const CONTRACT_ABI = JSON.parse(readFileSync(join(projectRoot, 'artifacts/AttendanceProof.json'), 'utf8')).abi;

// 从 .env 提取 PEM 私钥
const envContent = readFileSync(join(projectRoot, '.env'), 'utf8');
const privateKeyMatch = envContent.match(/ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n([\s\S]*?)\n-----END PRIVATE KEY-----/);
if (!privateKeyMatch) {
    console.error('❌ 未在 .env 中找到 ADMIN_PRIVATE_KEY');
    process.exit(1);
}
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----\n${privateKeyMatch[1]}\n-----END PRIVATE KEY-----`;

// ========== PEM 转 Hex ==========
function pemToHex(pem) {
    const key = crypto.createPrivateKey({
        key: pem,
        format: 'pem',
        type: 'pkcs8'
    });
    const jwk = key.export({ format: 'jwk' });
    const privateKeyBuffer = Buffer.from(jwk.d, 'base64url');
    return '0x' + privateKeyBuffer.toString('hex');
}

const PRIVATE_KEY_HEX = pemToHex(PRIVATE_KEY_PEM);

// ========== 初始化 Web3 ==========
const web3 = new Web3(RPC_URL);
const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY_HEX);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

console.log('🔗 连接节点:', RPC_URL);
console.log('📇 合约地址:', CONTRACT_ADDRESS);
console.log('👤 当前使用账户:', account.address);

// ========== 辅助函数 ==========
function generateRandomMerkleRoot() {
    return '0x' + crypto.randomBytes(32).toString('hex');
}

// ========== 测试流程 ==========
async function main() {
    try {
        // 1. 节点连接检查
        const blockNumber = await web3.eth.getBlockNumber();
        console.log('✅ 节点连接成功，当前区块高度:', blockNumber);

        // 2. 合约代码检查
        const code = await web3.eth.getCode(CONTRACT_ADDRESS);
        if (code === '0x' || code === '0x0') {
            throw new Error('合约地址无代码，请确认部署成功');
        }
        console.log('✅ 合约代码存在，长度:', code.length);

        // 3. 实例化合约
        const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

        // 4. 查询合约 owner（如果合约有 owner 方法）
        let ownerAddress = null;
        if (contract.methods.owner) {
            try {
                ownerAddress = await contract.methods.owner().call();
                console.log('👑 合约 owner 地址:', ownerAddress);
            } catch (e) {
                console.log('⚠️ 合约无 owner 方法，跳过权限检查');
            }
        }

        // 5. 权限检查
        if (ownerAddress && ownerAddress.toLowerCase() !== account.address.toLowerCase()) {
            console.error('❌ 权限错误：当前账户不是合约 owner，无法调用 uploadMerkleRoot');
            console.error('   当前账户:', account.address);
            console.error('   合约 owner:', ownerAddress);
            console.error('   请将 .env 中的 ADMIN_PRIVATE_KEY 替换为部署合约时使用的私钥，或联系管理员获取。');
            process.exit(1);
        }

        // 6. 查询存证数量
        const countBefore = await contract.methods.getMerkleRootCount().call();
        console.log('📊 链上存证数量（上传前）:', countBefore.toString());

        // 7. 生成测试数据并发送交易
        const testRoot = generateRandomMerkleRoot();
        const timestamp = Math.floor(Date.now() / 1000);
        console.log('📤 准备上传:');
        console.log('   - merkleRoot:', testRoot);
        console.log('   - timestamp:', timestamp);

        console.log('⏳ 发送交易中...');
        const receipt = await contract.methods.uploadMerkleRoot(testRoot, timestamp).send({
            from: account.address,
            gas: 300000,
            gasPrice: 1
        });

        console.log('✅ 交易成功！');
        console.log('   - 交易哈希:', receipt.transactionHash);
        console.log('   - 区块高度:', receipt.blockNumber);

        // 8. 验证结果
        const countAfter = await contract.methods.getMerkleRootCount().call();
        console.log('📊 链上存证数量（上传后）:', countAfter.toString());
        const allRoots = await contract.methods.getAllMerkleRoots().call();
        const found = allRoots.includes(testRoot);
        console.log(found ? '✅ 确认上传的根已存在于链上' : '⚠️ 未在链上找到上传的根');

        console.log('\n🎉 测试完成！RPC 方案可行。');
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.cause) {
            console.error('   原因:', error.cause);
        }
        process.exit(1);
    }
}

main();