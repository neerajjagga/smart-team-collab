import { Router } from "express";
import { 
    getArticleVersions, 
    getArticleVersion, 
    createArticleVersion 
} from "../controllers/articleVersion.controller.js";
import { verifyAuth, verifyWorkspaceMembership } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";

const articleVersionRouter = Router();

// All routes require authentication and workspace membership
articleVersionRouter.get('/:articleId/versions', verifyAuth, verifyWorkspaceMembership(), getArticleVersions);
articleVersionRouter.get('/:articleId/versions/:versionNumber', verifyAuth, verifyWorkspaceMembership(), getArticleVersion);
articleVersionRouter.post('/:articleId/versions', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), createArticleVersion);

export default articleVersionRouter;
