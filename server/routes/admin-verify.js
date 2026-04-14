/**
 * 管理员手动触发验真接口
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { runVerification } from '../utils/verificationScheduler.js';

const router = express.Router();

router.use(authenticateToken);

// 管理员权限校验
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
    next();
};

/**
 * POST /api/admin/verify-all
 * 手动触发全量验真
 */
router.post('/verify-all', adminOnly, async (req, res) => {
    try {
        const result = await runVerification();
        res.json({
            success: true,
            message: '验真完成',
            data: {
                totalRecords: result.totalRecords,
                mismatchBatches: result.mismatchBatches
            }
        });
    } catch (error) {
        console.error('手动验真失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;