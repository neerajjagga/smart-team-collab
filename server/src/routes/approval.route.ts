import { Router } from "express";
import { 
    createApproval, 
    getApprovals, 
    getArticleApprovals, 
    updateApproval 
} from "../controllers/approval.controller.js";
import { verifyAuth, verifyWorkspaceMembership } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";

const approvalRouter = Router();

// All routes require authentication and workspace membership
approvalRouter.post('/:articleId/approvals', verifyAuth, verifyWorkspaceMembership(['REVIEWER', 'EDITOR', 'OWNER']), createApproval);
approvalRouter.get('/approvals', verifyAuth, verifyWorkspaceMembership(), getApprovals);
approvalRouter.get('/:articleId/approvals', verifyAuth, verifyWorkspaceMembership(), getArticleApprovals);
approvalRouter.put('/approvals/:approvalId', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), updateApproval);

export default approvalRouter;
