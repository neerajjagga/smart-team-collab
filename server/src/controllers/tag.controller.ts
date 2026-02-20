import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";

export const createTag = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;
    const { name } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    if (!name) throw new AppError("Tag name is required", 400);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    
    if (!workspaceIdStr) {
        throw new AppError("Workspace ID is required", 400);
    }

    // Check if tag already exists in this workspace
    const existingTag = await prisma.tag.findFirst({
        where: {
            name: name.trim(),
            workspaceId: workspaceIdStr
        }
    });

    if (existingTag) {
        throw new AppError("Tag with this name already exists in the workspace", 400);
    }

    const tag = await prisma.tag.create({
        data: {
            name: name.trim(),
            workspaceId: workspaceIdStr,
            createdById: user.id
        },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            },
            _count: {
                select: {
                    articleTags: true
                }
            }
        }
    });

    res.status(201).json({
        success: true,
        message: "Tag created successfully",
        tag
    });
});

export const getTags = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const skip = (Number(page) - 1) * Number(limit);
    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    
    if (!workspaceIdStr) {
        throw new AppError("Workspace ID is required", 400);
    }

    const where: any = { workspaceId: workspaceIdStr };

    if (search) {
        where.name = {
            contains: search as string,
            mode: 'insensitive' as const
        };
    }

    const [tags, total] = await Promise.all([
        prisma.tag.findMany({
            where,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                },
                _count: {
                    select: {
                        articleTags: true
                    }
                }
            },
            orderBy: { name: 'asc' },
            skip,
            take: Number(limit)
        }),
        prisma.tag.count({ where })
    ]);

    res.status(200).json({
        success: true,
        message: "Tags retrieved successfully",
        data: tags,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

export const getTag = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, tagId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const tagIdStr = Array.isArray(tagId) ? tagId[0] : tagId;
    
    if (!workspaceIdStr || !tagIdStr) {
        throw new AppError("Workspace ID and tag ID are required", 400);
    }

    const tag = await prisma.tag.findFirst({
        where: {
            id: tagIdStr,
            workspaceId: workspaceIdStr
        },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            },
            articleTags: {
                include: {
                    article: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            status: true,
                            createdAt: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    articleTags: true
                }
            }
        }
    });

    if (!tag) throw new AppError("Tag not found", 404);

    res.status(200).json({
        success: true,
        message: "Tag retrieved successfully",
        tag
    });
});

export const updateTag = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, tagId } = req.params;
    const { name } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    if (!name) throw new AppError("Tag name is required", 400);

    // Only OWNER and EDITOR can update tags
    if (!["OWNER", "EDITOR"].includes(membership.role)) {
        throw new AppError("Insufficient permissions to update tags", 403);
    }

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const tagIdStr = Array.isArray(tagId) ? tagId[0] : tagId;
    
    if (!workspaceIdStr || !tagIdStr) {
        throw new AppError("Workspace ID and tag ID are required", 400);
    }

    // Check if tag exists
    const existingTag = await prisma.tag.findFirst({
        where: {
            id: tagIdStr,
            workspaceId: workspaceIdStr
        }
    });

    if (!existingTag) throw new AppError("Tag not found", 404);

    // Check if new name conflicts with existing tag
    const conflictingTag = await prisma.tag.findFirst({
        where: {
            name: name.trim(),
            workspaceId: workspaceIdStr,
            id: { not: tagIdStr }
        }
    });

    if (conflictingTag) {
        throw new AppError("Tag with this name already exists in the workspace", 400);
    }

    const updatedTag = await prisma.tag.update({
        where: { id: tagIdStr },
        data: { name: name.trim() },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            },
            _count: {
                select: {
                    articleTags: true
                }
            }
        }
    });

    res.status(200).json({
        success: true,
        message: "Tag updated successfully",
        tag: updatedTag
    });
});

export const deleteTag = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, tagId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    // Only OWNER and EDITOR can delete tags
    if (!["OWNER", "EDITOR"].includes(membership.role)) {
        throw new AppError("Insufficient permissions to delete tags", 403);
    }

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const tagIdStr = Array.isArray(tagId) ? tagId[0] : tagId;
    
    if (!workspaceIdStr || !tagIdStr) {
        throw new AppError("Workspace ID and tag ID are required", 400);
    }

    const tag = await prisma.tag.findFirst({
        where: {
            id: tagIdStr,
            workspaceId: workspaceIdStr
        },
        include: {
            _count: {
                select: {
                    articleTags: true
                }
            }
        }
    });

    if (!tag) throw new AppError("Tag not found", 404);

    // Check if tag is being used by articles
    if (tag._count.articleTags > 0) {
        throw new AppError("Cannot delete tag that is being used by articles", 400);
    }

    await prisma.tag.delete({
        where: { id: tagIdStr }
    });

    res.status(200).json({
        success: true,
        message: "Tag deleted successfully"
    });
});
