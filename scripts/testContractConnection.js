/**
 * 测试 AttendanceProof 合约连接
 */
const Web3 = require('@fisco/bcos-node-sdk');
const config = require('./config');

async function main() {
    console.log('🧪 测试 FISCO 考勤存证合约连接...');
    
    const web3 = new Web3(config.rpcUrl);
    const abi = config.getContractABI();
    const contract = new web3.eth.Contract(abi, config.contractAddress);
    
    try {
        // 1. 获取合约所有者
        const owner = await contract.methods.owner().call();
        console.log(`✅ 合约所有者: ${owner}`);
        
        // 2. 获取默克尔根总数
        const count = await contract.methods.getMerkleRootCount().call();
        console.log(`📊 链上默克尔根总数: ${count}`);
        
        // 3. 测试一个随机根是否存在
        const testRoot = '0x' + '1'.repeat(64);
        const exists = await contract.methods.isMerkleRootValid(testRoot).call();
        console.log(`🔍 测试根存在性: ${exists}`);
        
        console.log('🎉 合约连接测试通过！');
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

main();