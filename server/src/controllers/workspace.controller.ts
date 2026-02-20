import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";
import type { WorkspaceRole } from "../types/user.types.js";

export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { name, description } = req.body;

    if (!user) throw new AppError("Authentication required", 401);
    if (!name) throw new AppError("Workspace name is required", 400);

    const workspace = await prisma.workspace.create({
        data: {
            name,
            description,
            createdById: user.id,
        },
        include: {
            members: {
                where: { userId: user.id },
                select: {
                    id: true,
                    role: true,
                    joinedAt: true
                }
            }
        }
    });

    // Add creator as owner
    await prisma.workspaceMember.create({
        data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "OWNER"
        }
    });

    res.status(201).json({
        success: true,
        message: "Workspace created successfully",
        workspace
    });
});

export const getWorkspaces = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { page = 1, limit = 10, search } = req.query;

    if (!user) throw new AppError("Authentication required", 401);

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
        members: {
            some: { userId: user.id }
        }
    };

    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' as const } },
            { description: { contains: search as string, mode: 'insensitive' as const } }
        ];
    }

    const [workspaces, total] = await Promise.all([
        prisma.workspace.findMany({
            where,
            include: {
                members: {
                    where: { userId: user.id },
                    select: {
                        id: true,
                        role: true,
                        joinedAt: true
                    }
                },
                _count: {
                    select: {
                        members: true,
                        articles: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
        }),
        prisma.workspace.count({ where })
    ]);

    res.status(200).json({
        success: true,
        message: "Workspaces retrieved successfully",
        data: workspaces,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

export const getWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    
    if (!user) throw new AppError("Authentication required", 401);
    if (!workspaceIdStr) throw new AppError("Workspace ID is required", 400);

    const workspace = await prisma.workspace.findFirst({
        where: {
            id: workspaceIdStr,
            members: {
                some: { userId: user.id }
            }
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    members: true,
                    articles: true
                }
            }
        }
    });

    if (!workspace) throw new AppError("Workspace not found", 404);

    res.status(200).json({
        success: true,
        message: "Workspace retrieved successfully",
        workspace
    });
});

export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;
    const { name, description } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    if (!workspaceIdStr) throw new AppError("Workspace ID is required", 400);

    // Only OWNER and EDITOR can update workspace
    if (!["OWNER", "EDITOR"].includes(membership.role)) {
        throw new AppError("Insufficient permissions", 403);
    }

    const updateData: any = {};
    if (name) updateData.name = name as string;
    if (description !== undefined) updateData.description = description as string | null;

    const updatedWorkspace = await prisma.workspace.update({
        where: { id: workspaceIdStr },
        data: updateData,
        include: {
            members: {
                where: { userId: user.id },
                select: {
                    id: true,
                    role: true,
                    joinedAt: true
                }
            }
        }
    });

    res.status(200).json({
        success: true,
        message: "Workspace updated successfully",
        workspace: updatedWorkspace
    });
});

export const archiveWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    if (!workspaceIdStr) throw new AppError("Workspace ID is required", 400);

    // Only OWNER can archive workspace
    if (membership.role !== "OWNER") {
        throw new AppError("Only workspace owners can archive workspace", 403);
    }

    await prisma.workspace.update({
        where: { id: workspaceIdStr },
        data: { isArchived: true }
    });

    res.status(200).json({
        success: true,
        message: "Workspace archived successfully"
    });
});

export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;
    const { email, role } = req.body as { email: string, role: WorkspaceRole };
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    if (!workspaceIdStr) throw new AppError("Workspace ID is required", 400);

    // Only OWNER and EDITOR can invite members
    if (!["OWNER", "EDITOR"].includes(membership.role)) {
        throw new AppError("Insufficient permissions", 403);
    }

    const invitedUser = await prisma.user.findUnique({
        where: { email }
    });

    if (!invitedUser) {
        throw new AppError("User with this email does not exist", 404);
    }

    const existingMember = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId: workspaceIdStr,
            userId: invitedUser.id
        }
    });

    if (existingMember) {
        throw new AppError("User is already a member of this workspace", 400);
    }

    const newMember = await prisma.workspaceMember.create({
        data: {
            workspaceId: workspaceIdStr,
            userId: invitedUser.id,
            role: role as WorkspaceRole
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            }
        }
    });

    res.status(201).json({
        success: true,
        message: "Member invited successfully",
        member: newMember
    });
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, memberId } = req.params;
    const { role } = req.body as { role: WorkspaceRole };
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const memberIdStr = Array.isArray(memberId) ? memberId[0] : memberId;
    if (!workspaceIdStr || !memberIdStr) throw new AppError("Workspace ID and member ID are required", 400);

    // Only OWNER can update member roles
    if (membership.role !== "OWNER") {
        throw new AppError("Only workspace owners can update member roles", 403);
    }

    const targetMember = await prisma.workspaceMember.findFirst({
        where: {
            id: memberIdStr,
            workspaceId: workspaceIdStr
        }
    });

    if (!targetMember) {
        throw new AppError("Member not found", 404);
    }

    // Cannot change role of workspace owner
    if (targetMember.role === "OWNER") {
        throw new AppError("Cannot change role of workspace owner", 400);
    }

    const updatedMember = await prisma.workspaceMember.update({
        where: { id: memberIdStr },
        data: { role: role as WorkspaceRole },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            }
        }
    });

    res.status(200).json({
        success: true,
        message: "Member role updated successfully",
        member: updatedMember
    });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, memberId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const memberIdStr = Array.isArray(memberId) ? memberId[0] : memberId;
    if (!workspaceIdStr || !memberIdStr) throw new AppError("Workspace ID and member ID are required", 400);

    // Only OWNER can remove members
    if (membership.role !== "OWNER") {
        throw new AppError("Only workspace owners can remove members", 403);
    }

    const targetMember = await prisma.workspaceMember.findFirst({
        where: {
            id: memberIdStr,
            workspaceId: workspaceIdStr
        }
    });

    if (!targetMember) {
        throw new AppError("Member not found", 404);
    }

    // Cannot remove workspace owner
    if (targetMember.role === "OWNER") {
        throw new AppError("Cannot remove workspace owner", 400);
    }

    await prisma.workspaceMember.delete({
        where: { id: memberIdStr }
    });

    res.status(200).json({
        success: true,
        message: "Member removed successfully"
    });
});
