import { Router } from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { deleteUser } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.delete('/', verifyAuth, deleteUser);

export default userRouter;