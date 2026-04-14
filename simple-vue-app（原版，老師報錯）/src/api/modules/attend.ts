import api from '../index'

export interface VerifyMerkleRootParams {
  merkleRoot: string
}

export interface VerifyMerkleRootResponse {
  success: boolean
  exists: boolean
  timestamp: number | null
  merkleRoot: string
  message: string
}

export interface BatchVerifyResponse {
  success: boolean
  validCount: number
  invalidCount: number
  details: Array<{
    merkleRoot: string
    exists: boolean
    timestamp: number | null
  }>
}

export const attendApi = {
  /**
   * 验证单个默克尔根是否在链上
   */
  verifyMerkleRoot: (merkleRoot: string): Promise<VerifyMerkleRootResponse> => {
    return api.post('/attend/verify-merkle-root', { merkleRoot })
  },

  /**
   * 批量验证默克尔根（核心功能：一键验真）
   */
  batchVerifyMerkleRoot: (merkleRootList: string[]): Promise<BatchVerifyResponse> => {
    return api.post('/attend/batch-verify', { merkleRootList })
  },

  /**
   * 计算默克尔根（不上链）
   */
  calculateMerkleRoot: (records: any[]): Promise<{ success: boolean; merkleRoot: string; recordCount: number }> => {
    return api.post('/attend/calculate-merkle-root', { records })
  },

  /**
   * 上传默克尔根上链
   */
  uploadMerkleRoot: (merkleRoot: string, attendanceDate: string | number, metadata?: any): Promise<any> => {
    return api.post('/attend/upload-merkle-root', { merkleRoot, attendanceDate, metadata })
  },

  /**
   * 获取存证历史记录
   */
  getAttendanceHistory: (): Promise<{ success: boolean; data: any[] }> => {
    return api.get('/attend/attendance-history')
  }
}