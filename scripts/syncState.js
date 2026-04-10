/**
 * 考勤存证状态同步脚本
 * 将数据库中未上链的考勤记录同步到 FISCO BCOS
 */
const fs = require('fs');
const path = require('path');
const Web3 = require('@fisco/bcos-node-sdk');
const config = require('./config');
const sqlite3 = require('sqlite3').verbose();

const web3 = new Web3(config.rpcUrl);
const account = web3.eth.accounts.privateKeyToAccount(config.adminPrivateKey);
const abi = config.getContractABI();
const contract = new web3.eth.Contract(abi, config.contractAddress);

const nonceManager = {
    cache: {},
    async getNonce(address) {
        if (this.cache[address] === undefined) {
            this.cache[address] = await web3.eth.getTransactionCount(address, 'pending');
        }
        return this.cache[address]++;
    },
    reset(address) { delete this.cache[address]; }
};

function getDb() {
    const dbPath = path.resolve(__dirname, '../server/data/users.db');
    return new sqlite3.Database(dbPath);
}

async function getPendingRecords(db) {
    return new Promise((resolve, reject) => {
        db.all("SELECT merkle_root, attendance_date FROM attendance_history WHERE is_deleted = 0", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function syncState() {
    console.log('🔄 开始同步考勤状态...');
    const db = getDb();
    try {
        const records = await getPendingRecords(db);
        console.log(`- 数据库记录数: ${records.length}`);
        
        const toSync = [];
        for (const r of records) {
            const exists = await contract.methods.isMerkleRootValid(r.merkle_root).call();
            if (!exists) toSync.push(r);
        }
        console.log(`- 需同步数量: ${toSync.length}`);
        
        const results = [];
        for (const r of toSync) {
            try {
                console.log(`⏳ 同步: ${r.merkle_root.substring(0,20)}...`);
                const nonce = await nonceManager.getNonce(account.address);
                const receipt = await contract.methods.uploadMerkleRoot(r.merkle_root, r.attendance_date).send({
                    from: account.address,
                    gas: config.gasLimit,
                    gasPrice: config.gasPrice,
                    nonce
                });
                console.log(`  ✅ 区块: ${receipt.blockNumber}`);
                results.push({ root: r.merkle_root, success: true });
            } catch (e) {
                console.error(`  ❌ 失败: ${e.message}`);
                results.push({ root: r.merkle_root, success: false, error: e.message });
                nonceManager.reset(account.address);
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        
        const success = results.filter(r => r.success).length;
        console.log(`\n✅ 同步完成: 成功 ${success}, 失败 ${results.length - success}`);
        return results;
    } finally {
        db.close();
    }
}

if (require.main === module) {
    syncState().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { syncState };