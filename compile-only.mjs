import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractSource = fs.readFileSync(path.join(__dirname, 'contracts', 'AttendanceProof.sol'), 'utf8');
const solc = await import('solc');

const input = {
  language: 'Solidity',
  sources: { 'AttendanceProof.sol': { content: contractSource } },
  settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
};

const output = JSON.parse(solc.default.compile(JSON.stringify(input)));

if (output.errors && output.errors.some(e => e.severity === 'error')) {
  console.error('编译错误:', output.errors);
  process.exit(1);
}

const contract = output.contracts['AttendanceProof.sol']['AttendanceProof'];

// 保存完整编译产物
fs.writeFileSync('artifacts/AttendanceProof.json', JSON.stringify({
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object
}, null, 2));

console.log('✅ 编译成功！');
console.log('���� ��已保存到 artifacts/AttendanceProof.json');
console.log(`Bytecode 长度: ${('0x' + contract.evm.bytecode.object).length} 字符`);
