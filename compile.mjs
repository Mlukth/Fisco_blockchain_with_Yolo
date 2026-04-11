import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractPath = path.join(__dirname, 'contracts', 'AttendanceProof.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'AttendanceProof.sol': { content: source }
    },
    settings: {
        evmVersion: 'berlin',
        optimizer: { enabled: true, runs: 200 },
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        }
    }
};

console.log('Compiling with solc 0.8.11...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    output.errors.forEach(err => console.log(err.formattedMessage));
}

const contract = output.contracts['AttendanceProof.sol']['AttendanceProof'];
const abi = JSON.stringify(contract.abi, null, 2);
const bytecode = contract.evm.bytecode.object;

fs.writeFileSync('build/AttendanceProof.abi', abi);
fs.writeFileSync('build/AttendanceProof.bin', bytecode);

console.log('✅ Compiled!');
console.log('ABI length:', abi.length);
console.log('BIN length:', bytecode.length);

const push0Count = (bytecode.match(/5f/g) || []).length;
console.log('PUSH0 count:', push0Count);
