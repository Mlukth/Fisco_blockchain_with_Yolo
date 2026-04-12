/**
 * 部署 AttendanceProof 合约到 FISCO BCOS 3.x
 * 精简版：移除对 config.js 的依赖，直接读取 fisco.config.js 和 .env
 */

import { Web3jService, Configuration } from '@fiscobcos/nodejs-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 加载环境变量
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

// 加载 fisco.config.js
const fiscoConfigPath = path.join(PROJECT_ROOT, 'fisco.config.js');
const fiscoConfig = (await import(`file://${fiscoConfigPath}`)).default;

const CONTRACT_PATH = path.join(PROJECT_ROOT, 'contracts', 'AttendanceProof.sol');
const ABI_OUTPUT_PATH = path.join(PROJECT_ROOT, 'contracts', 'AttendanceProof.abi');
const BIN_OUTPUT_PATH = path.join(PROJECT_ROOT, 'contracts', 'AttendanceProof.bin');

async function compileContract() {
    console.log('📦 编译合约...');
    const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            'AttendanceProof.sol': { content: source }
        },
        settings: {
            outputSelection: {
                '*': { '*': ['abi', 'evm.bytecode.object'] }
            },
            optimizer: { enabled: true, runs: 200 }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            console.error('❌ 编译错误:', errors);
            throw new Error('合约编译失败');
        }
    }

    const contract = output.contracts['AttendanceProof.sol']['AttendanceProof'];
    const abi = contract.abi;
    const bytecode = '0x' + contract.evm.bytecode.object;

    fs.writeFileSync(ABI_OUTPUT_PATH, JSON.stringify(abi, null, 2));
    fs.writeFileSync(BIN_OUTPUT_PATH, bytecode);
    
    console.log('✅ 编译成功，ABI 和 Bytecode 已保存');
    return { abi, bytecode };
}

async function deploy() {
    try {
        const { abi, bytecode } = await compileContract();
        
        console.log('🔗 连接 FISCO BCOS 节点...');
        const certPath = fiscoConfig.ssl.certPath;
        
        const config = new Configuration({
            peers: [fiscoConfig.channel.url],
            group: fiscoConfig.groupId,
            chain: fiscoConfig.chainId,
            certPath: certPath,
            timeout: 30000
        });

        const web3 = new Web3jService(config);
        
        // 获取管理员账户
        const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
        if (!adminPrivateKey) {
            throw new Error('请在 .env 中设置 ADMIN_PRIVATE_KEY');
        }

        console.log('📤 发送部署交易...');
        
        // 构造部署交易
        const deployResult = await web3.deploy(abi, bytecode, []);
        
        const contractAddress = deployResult.contractAddress;
        console.log(`✅ 合约部署成功！地址: ${contractAddress}`);
        
        // 更新 .env 文件
        const envPath = path.join(PROJECT_ROOT, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        if (envContent.includes('CONTRACT_ADDRESS=')) {
            envContent = envContent.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${contractAddress}`);
        } else {
            envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`📝 合约地址已写入 .env`);

        // 更新 fisco.config.js（可选）
        let fiscoContent = fs.readFileSync(fiscoConfigPath, 'utf8');
        fiscoContent = fiscoContent.replace(/contractAddress:.*,/, `contractAddress: '${contractAddress}',`);
        fs.writeFileSync(fiscoConfigPath, fiscoContent);
        console.log(`📝 合约地址已更新到 fisco.config.js`);

        console.log('🎉 部署完成！');
        
    } catch (error) {
        console.error('❌ 部署失败:', error.message);
        process.exit(1);
    }
}

deploy();