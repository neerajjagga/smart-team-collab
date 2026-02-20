import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";
import type { GlobalRole, WorkspaceRole } from "../types/user.types.js";

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

    if (!user.isActive) {
        throw new AppError("Account is deactivated", 401);
    }

    req.user = user;

    return next();
});

export const requireRole = (roles: GlobalRole[]) => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        
        if (!user) {
            throw new AppError("Authentication required", 401);
        }

        if (!roles.includes(user.globalRole)) {
            throw new AppError("Insufficient permissions", 403);
        }

        next();
    });
};

export const requireMinimumRole = (minimumRole: GlobalRole) => {
    const roleHierarchy: Record<GlobalRole, number> = {
        'USER': 1,
        'ADMIN': 2,
        'SUPER_ADMIN': 3
    };

    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        
        if (!user) {
            throw new AppError("Authentication required", 401);
        }

        const userRoleLevel = roleHierarchy[user.globalRole];
        const requiredRoleLevel = roleHierarchy[minimumRole];

        if (userRoleLevel < requiredRoleLevel) {
            throw new AppError("Insufficient permissions", 403);
        }

        next();
    });
};

export const verifyWorkspaceMembership = (requiredRoles?: WorkspaceRole[]) => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        const workspaceId = req.params.workspaceId || req.body.workspaceId;
        
        if (!user) {
            throw new AppError("Authentication required", 401);
        }

        if (!workspaceId) {
            throw new AppError("Workspace ID is required", 400);
        }

        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: user.id,
                workspaceId
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        isArchived: true
                    }
                }
            }
        });

        if (!membership) {
            throw new AppError("Access denied: Not a member of this workspace", 403);
        }

        if (membership.workspace.isArchived) {
            throw new AppError("Access denied: Workspace is archived", 403);
        }

        if (requiredRoles && !requiredRoles.includes(membership.role)) {
            throw new AppError("Insufficient workspace permissions", 403);
        }

        (req as any).workspaceMembership = membership;

        next();
    });
};

export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let accessToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        accessToken = req.headers.authorization.split(' ')[1];
    }

    if (!accessToken) {
        return next();
    }

    try {
        const decoded = jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET as string
        ) as JwtPayload;

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

        if (user && user.isActive) {
            req.user = user;
        }
    } catch (error) {
        // Ignore token errors for optional auth
    }

    next();
});