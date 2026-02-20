import { Router } from "express";
import { loginUser, logoutUser, refresh, registerUser, getCurrentUser } from "../controllers/auth.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";
import { loginUserSchema, registerUserSchema } from "../utils/validator.js";

const authRouter = Router();

authRouter.post('/register', validate(registerUserSchema), registerUser)
authRouter.post('/login', validate(loginUserSchema), loginUser)
authRouter.get('/refresh', refresh);

authRouter.post('/logout', verifyAuth, logoutUser)
authRouter.get('/me', verifyAuth, getCurrentUser);

export default authRouter;