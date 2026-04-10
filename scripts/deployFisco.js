/**
 * FISCO BCOS 考勤存证合约部署脚本
 * 使用 @fisco/bcos-node-sdk 部署 AttendanceProof 合约
 * 自动更新配置文件中的合约地址，保存部署记录
 */
const fs = require('fs');
const path = require('path');
const Web3 = require('@fisco/bcos-node-sdk');
const config = require('./config');

// 更新 fisco.config.js 中的合约地址
function updateFiscoConfig(contractAddress) {
    const fiscoConfigPath = path.resolve(__dirname, '../fisco.config.js');
    if (!fs.existsSync(fiscoConfigPath)) {
        console.warn('⚠️ fisco.config.js 不存在，将创建新文件');
        const template = `module.exports = ${JSON.stringify({
            rpcUrl: config.rpcUrl,
            groupId: config.groupId,
            chainId: config.chainId,
            adminPrivateKey: config.adminPrivateKey,
            contractAddress: contractAddress,
            gasLimit: config.gasLimit,
            gasPrice: config.gasPrice
        }, null, 2)};`;
        fs.writeFileSync(fiscoConfigPath, template);
        console.log('✅ 已创建 fisco.config.js');
        return;
    }
    
    const currentConfig = require(fiscoConfigPath);
    const updatedConfig = {
        ...currentConfig,
        contractAddress: contractAddress
    };
    const content = `module.exports = ${JSON.stringify(updatedConfig, null, 2)};`;
    fs.writeFileSync(fiscoConfigPath, content);
    console.log('🔄 已更新 fisco.config.js 中的合约地址');
}

// 保存部署记录
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
            rpcUrl: config.rpcUrl,
            groupId: config.groupId,
            chainId: config.chainId
        }
    };
    
    const filePath = path.join(deploymentsDir, 'AttendanceProof.json');
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
    console.log(`📝 部署记录已保存至: ${filePath}`);
}

// 编译合约并提取 ABI 和 Bytecode
function getContractArtifact() {
    // 由于迁移项目，合约源码在 contracts/AttendanceProof.sol
    // 实际部署时需先编译合约，这里假设编译产物已通过 solc 或控制台生成在 artifacts 目录
    const artifactPath = config.abiPath;
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`合约编译产物不存在: ${artifactPath}，请先编译合约。`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return artifact;
}

async function main() {
    console.log('='.repeat(60));
    console.log('🚀 FISCO BCOS 考勤存证合约部署');
    console.log(`🔗 RPC: ${config.rpcUrl}`);
    console.log(`📦 群组ID: ${config.groupId}`);
    console.log(`🔑 部署账户私钥: ${config.adminPrivateKey ? '已设置' : '❌ 未设置'}`);
    console.log('='.repeat(60));
    
    if (!config.adminPrivateKey) {
        throw new Error('❌ 请先在 .env 或 fisco.config.js 中设置 ADMIN_PRIVATE_KEY');
    }
    
    // 1. 初始化 FISCO SDK
    const web3 = new Web3(config.rpcUrl);
    const account = web3.eth.accounts.privateKeyToAccount(config.adminPrivateKey);
    console.log(`👤 部署账户地址: ${account.address}`);
    
    // 2. 获取合约编译产物
    const artifact = getContractArtifact();
    const abi = artifact.abi;
    const bytecode = artifact.bytecode || artifact.data?.bytecode?.object;
    if (!bytecode) {
        throw new Error('合约编译产物中缺少 bytecode');
    }
    
    // 3. 创建合约部署对象
    const contract = new web3.eth.Contract(abi);
    const deployTx = contract.deploy({
        data: bytecode,
        arguments: []  // 构造函数无参数
    });
    
    console.log('⏳ 正在发送部署交易...');
    
    // 4. 发送部署交易
    const receipt = await deployTx.send({
        from: account.address,
        gas: config.gasLimit,
        gasPrice: config.gasPrice
    });
    
    const contractAddress = receipt.contractAddress;
    console.log('✅ 合约部署成功！');
    console.log(`📜 合约地址: ${contractAddress}`);
    console.log(`📦 交易哈希: ${receipt.transactionHash}`);
    console.log(`🔢 区块号: ${receipt.blockNumber}`);
    
    // 5. 保存 ABI 到 artifacts（确保存在）
    const artifactDir = path.dirname(config.abiPath);
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
    }
    fs.writeFileSync(config.abiPath, JSON.stringify({
        abi: abi,
        address: contractAddress
    }, null, 2));
    
    // 6. 更新配置文件
    updateFiscoConfig(contractAddress);
    
    // 7. 保存部署记录
    saveDeploymentRecord(contractAddress, receipt.transactionHash, account.address);
    
    console.log('='.repeat(60));
    console.log('🎉 部署完成！');
    console.log('='.repeat(60));
    
    return contractAddress;
}

main().catch(error => {
    console.error('❌ 部署失败:', error.message);
    process.exit(1);
});