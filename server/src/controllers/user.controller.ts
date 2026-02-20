import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";
import bcrypt from "bcrypt";

export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Unauthorized", 401);

    const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
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
            _count: {
                select: {
                    workspaces: true,
                    createdWorkspaces: true,
                    articles: true,
                    comments: true
                }
            }
        }
    });

    if (!userProfile) {
        throw new AppError("User not found", 404);
    }

    res.status(200).json({
        success: true,
        message: "User profile retrieved successfully",
        user: userProfile
    });
});

export const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { name, avatar } = req.body;

    if (!user) throw new AppError("Unauthorized", 401);

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            ...(name && { name }),
            ...(avatar !== undefined && { avatar })
        },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            globalRole: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true
        }
    });

    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
    });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!user) throw new AppError("Unauthorized", 401);

    if (!currentPassword || !newPassword) {
        throw new AppError("Current password and new password are required", 400);
    }

    const userWithPassword = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true }
    });

    if (!userWithPassword) {
        throw new AppError("User not found", 404);
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!isCurrentPasswordValid) {
        throw new AppError("Current password is incorrect", 400);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword }
    });

    res.status(200).json({
        success: true,
        message: "Password changed successfully"
    });
});

export const getUserWorkspaces = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) throw new AppError("Unauthorized", 401);

    const workspaces = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: {
            workspace: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    isArchived: true,
                    createdAt: true,
                    _count: {
                        select: {
                            members: true,
                            articles: true
                        }
                    }
                }
            }
        },
        orderBy: { joinedAt: 'desc' }
    });

    res.status(200).json({
        success: true,
        message: "User workspaces retrieved successfully",
        workspaces: workspaces.map(membership => ({
            role: membership.role,
            joinedAt: membership.joinedAt,
            workspace: membership.workspace
        }))
    });
});

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