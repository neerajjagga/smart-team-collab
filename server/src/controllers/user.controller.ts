import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Unauthorized", 401);

    await prisma.user.delete({
        where: { id: user.id }
    }).catch((error: any) => {
        throw new AppError(error?.message || "Something went wrong", 500);
    });

    res.clearCookie("refreshToken");

    res.status(200).json({
        success: true,
        message: "Account deleted successfully"
    });
});