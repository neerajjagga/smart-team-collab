import { Router } from "express";
import { 
    loginUser, 
    logoutUser, 
    refresh, 
    registerUser, 
    getCurrentUser,
    forgotPassword,
    resetPassword,
    verifyResetToken
} from "../controllers/auth.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";
import { 
    loginUserSchema, 
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyResetTokenSchema
} from "../utils/validator.js";

const authRouter = Router();

authRouter.post('/register', registerUser)
authRouter.post('/login', loginUser)
authRouter.get('/refresh', refresh);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/verify-reset-token', verifyResetToken);

authRouter.post('/logout', verifyAuth, logoutUser)
authRouter.get('/me', verifyAuth, getCurrentUser);

export default authRouter;