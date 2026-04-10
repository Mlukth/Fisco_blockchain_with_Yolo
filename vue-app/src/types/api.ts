/**
 * API 类型定义 - 考勤存证系统版
 */

// ==================== 认证相关（保持不变） ====================
export interface LoginRequest {
  username: string
  password: string
}
export interface LoginResponse {
  success: boolean
  token: string
  user: { username: string; role: string }
}
export interface ProfileResponse {
  success: boolean
  profile: { id: number; username: string; role: string; createdAt: string }
}
export interface MeResponse {
  success: boolean
  user: { userId: number; username: string; role: string }
}

// ==================== 考勤存证相关 ====================
export interface CalculateMerkleRootRequest {
  records: Array<{ studentId?: string; timestamp?: number; [key: string]: any }>
}
export interface CalculateMerkleRootResponse {
  success: boolean
  merkleRoot: string // 0x开头的64位十六进制
}

export interface UploadMerkleRootRequest {
  merkleRoot: string
  attendanceDate: number // Unix时间戳（秒）
  metadata?: Record<string, any>
}
export interface UploadMerkleRootResponse {
  success: boolean
  message: string
  blockHeight: number | null
  merkleRoot: string
}

export interface VerifyMerkleRootRequest {
  merkleRoot: string
}
export interface VerifyMerkleRootResponse {
  success: boolean
  exists: boolean
  timestamp: number | null
  message: string
}

export interface DeleteAttendanceRecordResponse {
  success: boolean
}

export interface AttendanceHistoryRecord {
  id: number
  merkleRoot: string
  attendanceDate: number
  uploadTime: string
  blockHeight: number | null
  status: 'confirmed' | 'deleted'
  metadata?: Record<string, any>
}

// 兼容旧版（可选）
export interface HistoryRecord extends AttendanceHistoryRecord {}

// ==================== 调试相关 ====================
export interface DebugStorageResponse {
  storagePath: string
  exists: boolean
  fileCount: number
  files: Array<{ name: string; size?: number; path?: string }>
}

// ==================== 历史管理相关 ====================
export interface ClearAllHistoryResponse {
  success: boolean
  message: string
  clearedCount: number
}
export interface ResetAllHistoryResponse {
  success: boolean
  message: string
  stats: { deletedRecords: number; deletedFiles: number; deletedDirectories: number }
}

// 保留部分旧版类型以兼容 Dashboard 模拟数据（可选）
export interface CalculateHashResponse {
  success: boolean
  hash: string
}
export interface UploadToBlockchainResponse {
  success: boolean
  imageUrl?: string
  blockHeight: number | null
}
export interface VerifyHashRequest { hash: string }
export interface VerifyHashResponse {
  success: boolean
  isVerified: boolean
  message: string
}
export interface CheckExistenceRequest { hash: string }
export interface CheckExistenceResponse { exists: boolean }
export interface DeleteHashResponse { success: boolean; message: string }
export interface HashListResponse { success: boolean; data: Array<{ id: number; hash: string; timestamp: string }> }
export interface DebugPathsResponse { storagePath: string; baseUrl: string; files: string[] }