/**
 * 合约管理器（FISCO BCOS 迁移版）
 * 注意：原 Hardhat 部署逻辑已废弃，现使用 scripts/deployFisco.js 进行部署。
 * 本文件保留作为占位，实际合约管理功能已集成在 server/config.js 和部署脚本中。
 */
console.warn('[contractManager] 此模块在 FISCO BCOS 迁移后已废弃，请使用 scripts/deployFisco.js 部署合约。');

// 空导出，避免引用报错
export const deployContract = async () => {
    throw new Error('deployContract 已废弃，请使用 npm run deploy 或 node scripts/deployFisco.js');
};

export const checkContractDeployed = async () => {
    const { BLOCKCHAIN_CONFIG } = await import('../config.js');
    const Web3 = require('@fisco/bcos-node-sdk');
    const web3 = new Web3(BLOCKCHAIN_CONFIG.RPC_URL);
    const code = await web3.eth.getCode(BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS);
    return code !== '0x' && code !== '0x0';
};

export const restoreContractState = async () => {
    const isDeployed = await checkContractDeployed();
    if (!isDeployed) {
        throw new Error('合约未部署，请先执行部署脚本');
    }
    return BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS;
};