/**
 * 考勤存证 API 模块
 * 替代原 hash.ts
 */
import api from '../index'
import type {
  CalculateMerkleRootRequest,
  CalculateMerkleRootResponse,
  UploadMerkleRootRequest,
  UploadMerkleRootResponse,
  VerifyMerkleRootRequest,
  VerifyMerkleRootResponse,
  DeleteAttendanceRecordResponse,
  AttendanceHistoryRecord,
  DebugStorageResponse,
} from '@/types/api'

export const attendApi = {
  /**
   * 根据考勤记录数组生成默克尔根
   */
  calculateMerkleRoot: (data: CalculateMerkleRootRequest) =>
    api.post<CalculateMerkleRootResponse>('/attend/calculate-merkle-root', data),

  /**
   * 上传默克尔根到区块链
   */
  uploadMerkleRoot: (data: UploadMerkleRootRequest) =>
    api.post<UploadMerkleRootResponse>('/attend/upload-merkle-root', data),

  /**
   * 验证默克尔根是否在链上
   */
  verifyMerkleRoot: (data: VerifyMerkleRootRequest) =>
    api.post<VerifyMerkleRootResponse>('/attend/verify-merkle-root', data),

  /**
   * 获取考勤存证历史
   */
  getAttendanceHistory: () =>
    api.get<AttendanceHistoryRecord[]>('/attend/attendance-history'),

  /**
   * 软删除考勤记录
   */
  deleteAttendanceRecord: (merkleRoot: string) =>
    api.delete<DeleteAttendanceRecordResponse>(`/attend/attendance-record/${merkleRoot}`),

  /**
   * 获取存储调试信息
   */
  getDebugStorage: () =>
    api.get<DebugStorageResponse>('/attend/debug/storage'),
}

// 兼容旧版调用（可选）
export const hashApi = attendApi