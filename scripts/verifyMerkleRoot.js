/**
 * 验证默克尔根是否存在于 FISCO BCOS 区块链
 * 用法: node scripts/verifyMerkleRoot.js <merkleRoot>
 * 输出: JSON格式的验证结果
 */
const Web3 = require('@fisco/bcos-node-sdk');
const config = require('./config');

async function verifyMerkleRoot(merkleRoot) {
    try {
        // 1. 连接 FISCO 节点
        const web3 = new Web3(config.rpcUrl);
        
        // 2. 加载合约（查询无需签名者）
        const abi = config.getContractABI();
        const contract = new web3.eth.Contract(abi, config.contractAddress);
        
        // 3. 检查合约是否存在
        const code = await web3.eth.getCode(config.contractAddress);
        if (code === '0x' || code === '0x0') {
            throw new Error(`合约不存在于地址: ${config.contractAddress}`);
        }
        
        // 4. 调用合约查询
        const exists = await contract.methods.isMerkleRootValid(merkleRoot).call();
        const timestamp = exists ? await contract.methods.getMerkleRootTimestamp(merkleRoot).call() : 0;
        
        return {
            exists,
            timestamp,
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
        if (!merkleRoot || !merkleRoot.startsWith('0x')) {
            throw new Error('❌ 请提供有效的默克尔根作为参数（格式: 0x...）');
        }
        
        const result = await verifyMerkleRoot(merkleRoot);
        // 输出 JSON 格式，供后端解析
        console.log(JSON.stringify(result));
    } catch (error) {
        console.error(JSON.stringify({
            exists: false,
            error: `⚠️ 验证失败: ${error.message}`
        }));
        process.exit(1);
    }
}

main();