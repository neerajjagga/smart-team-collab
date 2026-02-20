import { Router } from "express";
import { 
    createWorkspace, 
    getWorkspaces, 
    getWorkspace, 
    updateWorkspace, 
    archiveWorkspace,
    inviteMember,
    updateMemberRole,
    removeMember
} from "../controllers/workspace.controller.js";
import { verifyAuth, verifyWorkspaceMembership } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";
import { 
    createWorkspaceSchema,
    updateWorkspaceSchema,
    inviteMemberSchema,
    updateMemberRoleSchema
} from "../utils/validator.js";

const workspaceRouter = Router();

// Public routes (with authentication)
workspaceRouter.post('/', verifyAuth, validate(createWorkspaceSchema), createWorkspace);
workspaceRouter.get('/', verifyAuth, getWorkspaces);

// Workspace-specific routes (require membership)
workspaceRouter.get('/:workspaceId', verifyAuth, verifyWorkspaceMembership(), getWorkspace);
workspaceRouter.put('/:workspaceId', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), validate(updateWorkspaceSchema), updateWorkspace);
workspaceRouter.delete('/:workspaceId', verifyAuth, verifyWorkspaceMembership(['OWNER']), archiveWorkspace);

// Member management routes
workspaceRouter.post('/:workspaceId/invite', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), validate(inviteMemberSchema), inviteMember);
workspaceRouter.put('/:workspaceId/members/:memberId/role', verifyAuth, verifyWorkspaceMembership(['OWNER']), validate(updateMemberRoleSchema), updateMemberRole);
workspaceRouter.delete('/:workspaceId/members/:memberId', verifyAuth, verifyWorkspaceMembership(['OWNER']), removeMember);

export default workspaceRouter;
