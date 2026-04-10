/**
 * 批量考勤数据上链脚本
 * 用法: node batchUpload.js <dataDirectory> [reportDirectory]
 * 功能: 扫描目录中的JSON/CSV考勤数据文件，生成默克尔根并上链
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Web3 = require('@fisco/bcos-node-sdk');
const config = require('./config');

// 数据库模块
let db;
try {
    db = require('../server/db/index.js');
} catch (e) {
    console.warn('⚠️ 数据库模块加载失败，将跳过数据库记录');
    db = {
        addAttendanceRecord: () => console.log('跳过数据库记录')
    };
}

// 默克尔树库（若无则用简化版哈希合并）
let MerkleTree;
try {
    MerkleTree = require('merkletreejs');
} catch (e) {
    console.warn('⚠️ merkletreejs 未安装，将使用简化根计算（仅用于演示）');
}

class BatchUploader {
    constructor() {
        // 初始化 FISCO SDK
        this.web3 = new Web3(config.rpcUrl);
        this.account = this.web3.eth.accounts.privateKeyToAccount(config.adminPrivateKey);
        
        // 加载合约
        const abi = config.getContractABI();
        this.contract = new this.web3.eth.Contract(abi, config.contractAddress);
        
        // nonce 管理
        this.currentNonce = null;
        this.nonceLock = false;
    }
    
    async getNextNonce() {
        while (this.nonceLock) await new Promise(r => setTimeout(r, 100));
        this.nonceLock = true;
        try {
            if (this.currentNonce === null) {
                this.currentNonce = await this.web3.eth.getTransactionCount(this.account.address, 'pending');
                console.log(`ℹ️ 初始Nonce: ${this.currentNonce}`);
            }
            return this.currentNonce++;
        } finally {
            this.nonceLock = false;
        }
    }
    
    /**
     * 从文件内容生成默克尔根
     * @param {string} filePath 
     * @returns {string} 0x开头的根哈希
     */
    generateMerkleRootFromFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        let records;
        if (filePath.endsWith('.json')) {
            records = JSON.parse(content);
        } else {
            // 简单CSV解析
            const lines = content.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',');
            records = lines.slice(1).map(line => {
                const values = line.split(',');
                return headers.reduce((obj, h, i) => ({ ...obj, [h.trim()]: values[i]?.trim() }), {});
            });
        }
        if (!Array.isArray(records) || records.length === 0) {
            throw new Error('无效的考勤数据：记录为空');
        }
        
        // 计算每条记录的哈希
        const leaves = records.map(r => crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex'));
        
        // 构建默克尔树
        if (MerkleTree) {
            const tree = new MerkleTree(leaves, crypto.createHash('sha256'), { sortPairs: true });
            return '0x' + tree.getRoot().toString('hex');
        } else {
            // 简化：将所有叶子哈希拼接再哈希（仅演示用）
            const combined = leaves.sort().join('');
            return '0x' + crypto.createHash('sha256').update(combined).digest('hex');
        }
    }
    
    async uploadSingleFile(filePath, attendanceDate) {
        const filename = path.basename(filePath);
        try {
            const merkleRoot = this.generateMerkleRootFromFile(filePath);
            console.log(`  生成默克尔根: ${merkleRoot.substring(0, 20)}...`);
            
            // 检查是否已存在
            const exists = await this.contract.methods.isMerkleRootValid(merkleRoot).call();
            if (exists) {
                throw new Error('默克尔根已存在于链上');
            }
            
            const nonce = await this.getNextNonce();
            const receipt = await this.contract.methods.uploadMerkleRoot(merkleRoot, attendanceDate).send({
                from: this.account.address,
                gas: config.gasLimit,
                gasPrice: config.gasPrice,
                nonce
            });
            
            console.log(`  ✅ 交易确认: ${receipt.transactionHash} (区块: ${receipt.blockNumber})`);
            
            // 数据库记录
            if (db.addAttendanceRecord) {
                db.addAttendanceRecord(merkleRoot, attendanceDate, receipt.blockNumber, JSON.stringify({ sourceFile: filename }));
            }
            
            return {
                success: true,
                merkleRoot,
                blockHeight: receipt.blockNumber,
                txHash: receipt.transactionHash
            };
        } catch (error) {
            if (error.message.includes('nonce')) this.currentNonce = null;
            return { success: false, message: error.message };
        }
    }
    
    async batchUpload(filePaths, attendanceDate, progressCallback) {
        const results = [];
        const startTime = Date.now();
        
        for (let i = 0; i < filePaths.length; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 1000)); // 间隔1秒
            
            const result = await this.uploadSingleFile(filePaths[i], attendanceDate);
            result.file = path.basename(filePaths[i]);
            results.push(result);
            
            if (progressCallback) {
                progressCallback({ current: i+1, total: filePaths.length, file: result.file, result });
            }
        }
        
        return {
            total: filePaths.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            duration: `${((Date.now() - startTime)/1000).toFixed(1)}秒`,
            results
        };
    }
}

async function main() {
    const dataDir = process.argv[2];
    const reportDir = process.argv[3] || path.join(dataDir, 'reports');
    const attendanceDateStr = process.argv[4]; // YYYY-MM-DD
    
    if (!dataDir || !fs.existsSync(dataDir)) {
        console.error('请提供有效的考勤数据目录');
        process.exit(1);
    }
    
    let attendanceDate = Math.floor(Date.now() / 1000);
    if (attendanceDateStr) {
        attendanceDate = Math.floor(new Date(attendanceDateStr).getTime() / 1000);
    }
    
    const filePaths = fs.readdirSync(dataDir)
        .filter(f => f.endsWith('.json') || f.endsWith('.csv'))
        .map(f => path.join(dataDir, f));
    
    if (filePaths.length === 0) {
        console.error('目录中无 JSON/CSV 文件');
        process.exit(1);
    }
    
    console.log(`📁 找到 ${filePaths.length} 个数据文件，考勤日期: ${new Date(attendanceDate*1000).toLocaleDateString()}`);
    
    const uploader = new BatchUploader();
    const report = await uploader.batchUpload(filePaths, attendanceDate, ({current, total, file, result}) => {
        console.log(`[${current}/${total}] ${file}: ${result.success ? '✅' : '❌'} ${result.message || ''}`);
    });
    
    console.log(`\n===== 批量上链报告 =====`);
    console.log(`成功: ${report.success}, 失败: ${report.failed}, 耗时: ${report.duration}`);
    
    // 保存报告
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const reportFile = path.join(reportDir, `batch-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📝 报告已保存: ${reportFile}`);
}

main().catch(e => { console.error(e); process.exit(1); });