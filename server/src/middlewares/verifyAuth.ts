import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";

export const verifyAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let accessToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        accessToken = req.headers.authorization.split(' ')[1];
    }

    if (!accessToken) {
        throw new AppError("Authentication required", 401)
    }

    let decoded: JwtPayload;
    try {
        decoded = jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET as string
        ) as JwtPayload;
    } catch (error) {
        throw new AppError("Access token expired or invalid", 401);
    }

    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            globalRole: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    if (!user) {
        throw new AppError("User no longer exists", 401);
    }

    req.user = user;

    return next();
});