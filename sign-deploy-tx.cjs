const fs = require('fs');
const EthereumTx = require('ethereumjs-tx');
const ethUtil = require('ethereumjs-util');

// 读取 bytecode
const artifact = JSON.parse(fs.readFileSync('./artifacts/AttendanceProof.json', 'utf8'));
let bytecode = artifact.bytecode;
if (bytecode.startsWith('0x')) {
  bytecode = bytecode.slice(2);
}

// 部署账户私钥
const privateKey = Buffer.from('f46b0cfd862931cdfb086e2e5f208b70872d55dc2da040d865fe83d995c879ce', 'hex');
const address = '0x' + ethUtil.privateToAddress(privateKey).toString('hex');

console.log('部署账户:', address);
console.log('Bytecode 长度:', bytecode.length);

// 构造部署交易
const txParams = {
  nonce: '0x00',
  gasPrice: '0x00',
  gasLimit: '0x4C4B40',
  to: null,
  value: '0x00',
  data: '0x' + bytecode,
  chainId: 0x4ee8
};

// 签名
const tx = new EthereumTx(txParams);
tx.sign(privateKey);

const signedTx = '0x' + tx.serialize().toString('hex');
console.log('\n========== 签名交易数据 ==========');
console.log(signedTx);
console.log('==================================\n');

// 保存
fs.writeFileSync('./signed-tx.txt', signedTx);
console.log('已保存到 signed-tx.txt');
