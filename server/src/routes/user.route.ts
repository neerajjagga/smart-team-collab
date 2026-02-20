import { Router } from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { 
    deleteUser, 
    getUserProfile, 
    updateUserProfile, 
    changePassword, 
    getUserWorkspaces 
} from "../controllers/user.controller.js";
import { validate } from "../middlewares/validate.js";
import { updateProfileSchema, changePasswordSchema } from "../utils/validator.js";


const userRouter = Router();

userRouter.get('/profile', verifyAuth, getUserProfile);
userRouter.put('/profile', verifyAuth, validate(updateProfileSchema), updateUserProfile);
userRouter.post('/change-password', verifyAuth, validate(changePasswordSchema), changePassword);
userRouter.get('/workspaces', verifyAuth, getUserWorkspaces);
userRouter.delete('/', verifyAuth, deleteUser);

export default userRouter;