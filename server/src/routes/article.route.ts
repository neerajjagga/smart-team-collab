import { Router } from "express";
import { 
    createArticle, 
    getArticles, 
    getArticle, 
    updateArticle, 
    archiveArticle,
    submitForReview
} from "../controllers/article.controller.js";
import { verifyAuth, verifyWorkspaceMembership } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";
import { 
    createArticleSchema,
    updateArticleSchema
} from "../utils/validator.js";

const articleRouter = Router();

// Article routes (require workspace membership)
articleRouter.post('/:workspaceId/articles', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), validate(createArticleSchema), createArticle);
articleRouter.get('/:workspaceId/articles', verifyAuth, verifyWorkspaceMembership(), getArticles);
articleRouter.get('/:workspaceId/articles/:articleId', verifyAuth, verifyWorkspaceMembership(), getArticle);
articleRouter.put('/:workspaceId/articles/:articleId', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR', 'REVIEWER']), validate(updateArticleSchema), updateArticle);
articleRouter.delete('/:workspaceId/articles/:articleId', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), archiveArticle);
articleRouter.post('/:workspaceId/articles/:articleId/submit-review', verifyAuth, verifyWorkspaceMembership(['OWNER', 'EDITOR']), submitForReview);

export default articleRouter;
