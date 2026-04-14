# 匿名映射表存放目录

本目录用于存放 FaceNet 边缘端生成的 `student_mapping.csv` 文件。

## CSV 文件格式

| 列名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `student_name` | ✅ | 学生真实姓名 |
| `anonymous_id` | ✅ | 唯一匿名标识符（如 S001） |
| `class` | ❌ | 班级名称（可选） |

示例内容：
```csv
student_name,anonymous_id,class
张三,S001,一年级1班
李四,S002,一年级1班
王五,S003,一年级2班
```

## 导入命令

将 CSV 文件放置在此目录后，执行：
```bash
node scripts/import-mapping.js
```

若 CSV 文件在其他位置，可指定路径：
```bash
node scripts/import-mapping.js /path/to/your/student_mapping.csv
```

## 注意事项

- 脚本使用 `INSERT OR REPLACE`，若 `anonymous_id` 已存在则更新姓名和班级。
- 执行前请确保后端服务已至少启动过一次（以保证数据库文件 `server/data/users.db` 已初始化）。