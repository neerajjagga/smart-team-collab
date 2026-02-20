import { Router } from "express";
import { 
    createTag, 
    getTags, 
    getTag, 
    updateTag, 
    deleteTag 
} from "../controllers/tag.controller.js";
import { verifyAuth, verifyWorkspaceMembership } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";

const tagRouter = Router();

// All routes require authentication and workspace membership
tagRouter.post('/', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), createTag);
tagRouter.get('/', verifyAuth, verifyWorkspaceMembership(), getTags);
tagRouter.get('/:tagId', verifyAuth, verifyWorkspaceMembership(), getTag);
tagRouter.put('/:tagId', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), updateTag);
tagRouter.delete('/:tagId', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), deleteTag);

export default tagRouter;
