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

export const attendApi = {
  /**
   * 验证默克尔根是否在链上
   */
  verifyMerkleRoot: (merkleRoot: string): Promise<VerifyMerkleRootResponse> => {
    return api.post('/attend/verify-merkle-root', { merkleRoot })
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
