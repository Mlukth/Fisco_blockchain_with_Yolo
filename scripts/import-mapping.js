#!/usr/bin/env node
/**
 * 匿名映射表 CSV 导入脚本
 * 用法：
 *   node scripts/import-mapping.js [csv文件路径]
 * 若不指定路径，默认读取 mapping/student_mapping.csv
 * 
 * CSV 格式要求：
 *   必须包含列：student_name, anonymous_id
 *   可选列：class（班级名称）
 *   表头顺序任意，脚本自动识别列名
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'server', 'data', 'users.db');
const defaultCsvPath = path.join(projectRoot, 'mapping', 'student_mapping.csv');

// 获取用户指定的 CSV 文件路径（命令行参数）
const csvFilePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultCsvPath;

console.log('========================================');
console.log('  匿名映射表 CSV 导入工具');
console.log('========================================');
console.log(`数据库文件: ${dbPath}`);
console.log(`CSV 文件:   ${csvFilePath}`);

// 检查 CSV 文件是否存在
if (!fs.existsSync(csvFilePath)) {
    console.error(`\n❌ 错误：CSV 文件不存在`);
    console.error(`   请确保文件位于: ${csvFilePath}`);
    console.error(`   或使用命令: node scripts/import-mapping.js <你的CSV文件路径>`);
    process.exit(1);
}

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
    console.error(`\n❌ 错误：数据库文件不存在 (${dbPath})`);
    console.error(`   请先启动一次后端服务以初始化数据库，或检查路径是否正确。`);
    process.exit(1);
}

// 连接数据库
const db = new Database(dbPath);

// 读取 CSV 文件
let content;
try {
    content = fs.readFileSync(csvFilePath, 'utf-8');
} catch (e) {
    console.error(`\n❌ 读取 CSV 文件失败: ${e.message}`);
    process.exit(1);
}

// 解析 CSV（简单解析，支持引号包裹的字段）
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
if (lines.length < 2) {
    console.error('\n❌ CSV 文件至少需要包含表头和一行数据');
    process.exit(1);
}

const headers = parseCSVLine(lines[0]);
const nameIdx = headers.findIndex(h => h.toLowerCase() === 'student_name');
const idIdx = headers.findIndex(h => h.toLowerCase() === 'anonymous_id');
const classIdx = headers.findIndex(h => h.toLowerCase() === 'class' || h.toLowerCase() === 'class_name');

if (nameIdx === -1) {
    console.error('\n❌ CSV 缺少必填列: student_name');
    process.exit(1);
}
if (idIdx === -1) {
    console.error('\n❌ CSV 缺少必填列: anonymous_id');
    process.exit(1);
}

console.log(`\n检测到列: ${headers.join(', ')}`);
console.log(`student_name 列索引: ${nameIdx}`);
console.log(`anonymous_id 列索引: ${idIdx}`);
console.log(`班级列索引: ${classIdx !== -1 ? classIdx : '无'}`);

// 准备插入语句（使用 INSERT OR REPLACE，存在则更新）
const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO anonymous_map (anonymous_id, student_name, class_name)
    VALUES (?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
    for (const row of rows) {
        insertStmt.run(row.anonymous_id, row.student_name, row.class_name);
    }
});

const rows = [];
let skipped = 0;
for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const studentName = cols[nameIdx]?.trim();
    const anonymousId = cols[idIdx]?.trim();
    if (!studentName || !anonymousId) {
        console.warn(`⚠️  第 ${i+1} 行数据不完整，已跳过`);
        skipped++;
        continue;
    }
    const className = classIdx !== -1 ? (cols[classIdx]?.trim() || '') : '';
    rows.push({
        student_name: studentName,
        anonymous_id: anonymousId,
        class_name: className
    });
}

if (rows.length === 0) {
    console.log('\n⚠️  没有有效数据可导入');
    db.close();
    process.exit(0);
}

// 执行事务插入
try {
    insertMany(rows);
    console.log(`\n✅ 成功导入 ${rows.length} 条映射记录`);
    if (skipped > 0) {
        console.log(`⚠️  跳过 ${skipped} 条不完整记录`);
    }
} catch (e) {
    console.error(`\n❌ 数据库写入失败: ${e.message}`);
    db.close();
    process.exit(1);
}

// 显示当前映射表统计
const countStmt = db.prepare('SELECT COUNT(*) as total FROM anonymous_map');
const { total } = countStmt.get();
console.log(`\n📊 当前 anonymous_map 表共有 ${total} 条记录`);

// 可选：显示前5条记录
const sampleStmt = db.prepare('SELECT anonymous_id, student_name, class_name FROM anonymous_map LIMIT 5');
const samples = sampleStmt.all();
if (samples.length > 0) {
    console.log('\n📋 示例数据:');
    samples.forEach(r => {
        console.log(`   ${r.anonymous_id} -> ${r.student_name} (${r.class_name || '未分班'})`);
    });
}

db.close();
console.log('\n✨ 导入完成！');