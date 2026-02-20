import { Router } from "express";
import { 
    createComment, 
    getComments, 
    updateComment, 
    deleteComment 
} from "../controllers/comment.controller.js";
import { verifyAuth, verifyWorkspaceMembership } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";

const commentRouter = Router();

// All routes require authentication and workspace membership
commentRouter.post('/:articleId/comments', verifyAuth, verifyWorkspaceMembership(), createComment);
commentRouter.get('/:articleId/comments', verifyAuth, verifyWorkspaceMembership(), getComments);
commentRouter.put('/:articleId/comments/:commentId', verifyAuth, verifyWorkspaceMembership(), updateComment);
commentRouter.delete('/:articleId/comments/:commentId', verifyAuth, verifyWorkspaceMembership(), deleteComment);

export default commentRouter;
