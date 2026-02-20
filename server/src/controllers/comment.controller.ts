import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";

export const createComment = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const { content, parentCommentId } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    if (!content) throw new AppError("Comment content is required", 400);

    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

    // Check if article exists and user has access
    const article = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false
        }
    });

    if (!article) throw new AppError("Article not found", 404);

    // If it's a reply, check if parent comment exists
    if (parentCommentId) {
        const parentComment = await prisma.comment.findFirst({
            where: {
                id: parentCommentId,
                articleId: articleIdStr,
                isDeleted: false
            }
        });

        if (!parentComment) throw new AppError("Parent comment not found", 404);
    }

    const comment = await prisma.comment.create({
        data: {
            articleId: articleIdStr,
            authorId: user.id,
            content,
            parentCommentId: parentCommentId || null
        },
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            },
            parentComment: {
                select: {
                    id: true,
                    content: true,
                    author: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    }
                }
            }
        }
    });

    // Create notification for article author if it's not their own comment
    if (article.authorId !== user.id) {
        await prisma.notification.create({
            data: {
                userId: article.authorId,
                type: "COMMENT",
                referenceId: comment.id
            }
        });
    }

    res.status(201).json({
        success: true,
        message: "Comment created successfully",
        comment
    });
});

export const getComments = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const skip = (Number(page) - 1) * Number(limit);
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

    // Check if article exists and user has access
    const article = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false
        }
    });

    if (!article) throw new AppError("Article not found", 404);

    const [comments, total] = await Promise.all([
        prisma.comment.findMany({
            where: {
                articleId: articleIdStr,
                parentCommentId: null, // Only get top-level comments
                isDeleted: false
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                },
                replies: {
                    where: { isDeleted: false },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        author: {
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
                        replies: {
                            where: { isDeleted: false }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
        }),
        prisma.comment.count({
            where: {
                articleId: articleIdStr,
                parentCommentId: null,
                isDeleted: false
            }
        })
    ]);

    res.status(200).json({
        success: true,
        message: "Comments retrieved successfully",
        data: comments,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

export const updateComment = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId, commentId } = req.params;
    const { content } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    if (!content) throw new AppError("Comment content is required", 400);

    const commentIdStr = Array.isArray(commentId) ? commentId[0] : commentId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

    const comment = await prisma.comment.findFirst({
        where: {
            id: commentIdStr,
            articleId: articleIdStr,
            isDeleted: false
        },
        include: {
            article: {
                select: {
                    workspaceId: true
                }
            }
        }
    });

    if (!comment) throw new AppError("Comment not found", 404);

    // Check if user is the comment author or has editor/owner permissions
    const canEdit = comment.authorId === user.id || 
                   ["OWNER", "EDITOR"].includes(membership.role);

    if (!canEdit) {
        throw new AppError("Insufficient permissions to update this comment", 403);
    }

    const updatedComment = await prisma.comment.update({
        where: { id: commentIdStr },
        data: {
            content,
            isEdited: true
        },
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            },
            parentComment: {
                select: {
                    id: true,
                    content: true,
                    author: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    }
                }
            }
        }
    });

    res.status(200).json({
        success: true,
        message: "Comment updated successfully",
        comment: updatedComment
    });
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId, commentId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const commentIdStr = Array.isArray(commentId) ? commentId[0] : commentId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

    const comment = await prisma.comment.findFirst({
        where: {
            id: commentIdStr,
            articleId: articleIdStr,
            isDeleted: false
        },
        include: {
            article: {
                select: {
                    workspaceId: true
                }
            }
        }
    });

    if (!comment) throw new AppError("Comment not found", 404);

    // Check if user is the comment author or has editor/owner permissions
    const canDelete = comment.authorId === user.id || 
                    ["OWNER", "EDITOR"].includes(membership.role);

    if (!canDelete) {
        throw new AppError("Insufficient permissions to delete this comment", 403);
    }

    // Soft delete the comment
    await prisma.comment.update({
        where: { id: commentIdStr },
        data: { isDeleted: true }
    });

    res.status(200).json({
        success: true,
        message: "Comment deleted successfully"
    });
});
