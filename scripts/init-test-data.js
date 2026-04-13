/**
 * 初始化测试数据
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../server/data/users.db');
const db = new Database(dbPath);

console.log('📝 开始初始化测试数据...\n');

// ==================== 1. 创建家长账号 ====================
console.log('1️⃣ 创建家长账号...');

const parents = [
  { username: 'parent_zhang', name: '张三家长', phone: '13800000001' },
  { username: 'parent_li', name: '李四家长', phone: '13800000002' },
  { username: 'parent_wang', name: '王五家长', phone: '13800000003' },
  { username: 'parent_zhao', name: '赵六家长', phone: '13800000004' },
  { username: 'parent_sun', name: '孙七家长', phone: '13800000005' }
];

const hashedPassword = bcrypt.hashSync('password123', 10);

const insertUser = db.prepare(`
  INSERT INTO users (username, passwordHash, role, name, phone)
  VALUES (?, ?, 'parent', ?, ?)
`);

for (const p of parents) {
  try {
    insertUser.run(p.username, hashedPassword, p.name, p.phone);
    console.log(`   ✅ ${p.name} (${p.username})`);
  } catch (err) {
    console.log(`   ⚠️ ${p.name} 已存在`);
  }
}

// ==================== 2. 创建匿名映射 ====================
console.log('\n2️⃣ 创建学生匿名映射...');

const insertMap = db.prepare(`
  INSERT INTO anonymous_map (anonymous_id, student_name, student_no, classroom_id, parent_phone)
  VALUES (?, ?, ?, ?, ?)
`);

const students = [
  { id: 'S001', name: '张三', no: '2024001', classroom: '一年级1班', phone: '13800000001' },
  { id: 'S002', name: '李四', no: '2024002', classroom: '一年级1班', phone: '13800000002' },
  { id: 'S003', name: '王五', no: '2024003', classroom: '一年级1班', phone: '13800000003' },
  { id: 'S004', name: '赵六', no: '2024004', classroom: '一年级1班', phone: '13800000004' },
  { id: 'S005', name: '孙七', no: '2024005', classroom: '一年级2班', phone: '13800000005' }
];

for (const s of students) {
  try {
    insertMap.run(s.id, s.name, s.no, s.classroom, s.phone);
    console.log(`   ✅ ${s.id} → ${s.name}`);
  } catch (err) {
    console.log(`   ⚠️ ${s.id} 已存在`);
  }
}

// ==================== 3. 显示结果 ====================
console.log('\n========================================');
console.log('📊 初始化完成');
console.log('========================================');

console.log('\n📋 家长登录信息：');
console.log('| 用户名          | 密码        | 学生  |');
console.log('|----------------|-------------|-------|');
console.log('| parent_zhang   | password123 | 张三  |');
console.log('| parent_li      | password123 | 李四  |');
console.log('| parent_wang    | password123 | 王五  |');
console.log('| parent_zhao    | password123 | 赵六  |');
console.log('| parent_sun     | password123 | 孙七  |');

console.log('\n📋 匿名ID映射（交付给YOLO）：');
const maps = db.prepare('SELECT anonymous_id, student_name, student_no, classroom_id FROM anonymous_map').all();
console.log(JSON.stringify(maps, null, 2));

db.close();
