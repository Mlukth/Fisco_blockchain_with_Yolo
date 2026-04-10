/**
 * 上传考勤默克尔根到 FISCO BCOS 区块链
 * 用法: node scripts/uploadMerkleRoot.js <merkleRoot> [timestamp]
 * 参数:
 *   merkleRoot: 0x开头的64位十六进制字符串（默克尔根哈希）
 *   timestamp: 可选，考勤日期的时间戳（Unix秒），默认为当前时间
 * 
 * 输出: 
 *   blockNumber: xxx
 *   transactionHash: xxx
 */
const Web3 = require('@fisco/bcos-node-sdk');
const config = require('./config');

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('用法: node uploadMerkleRoot.js <merkleRoot> [timestamp]');
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
        // 1. 连接 FISCO 节点
        const web3 = new Web3(config.rpcUrl);
        const account = web3.eth.accounts.privateKeyToAccount(config.adminPrivateKey);
        console.log(`👤 使用账户: ${account.address}`);
        
        // 2. 加载合约
        const abi = config.getContractABI();
        const contract = new web3.eth.Contract(abi, config.contractAddress);
        
        // 3. 检查默克尔根是否已存在
        console.log('🔍 检查默克尔根是否已上链...');
        const exists = await contract.methods.isMerkleRootValid(merkleRoot).call();
        if (exists) {
            console.log('⚠️ 该默克尔根已存在于链上，无需重复上传');
            // 获取已存在记录的时间戳
            const existingTimestamp = await contract.methods.getMerkleRootTimestamp(merkleRoot).call();
            console.log(`   已存在时间戳: ${existingTimestamp}`);
            // 仍然输出符合格式的信息供后端解析（可选）
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
        }
        process.exit(1);
    }
}

main();