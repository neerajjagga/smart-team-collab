import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";
import type { ArticleStatus } from "../types/user.types.js";

export const createApproval = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const { status, feedback } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
        throw new AppError("Valid approval status (APPROVED or REJECTED) is required", 400);
    }

    // Only REVIEWER, EDITOR, and OWNER can approve/reject
    if (!["REVIEWER", "EDITOR", "OWNER"].includes(membership.role)) {
        throw new AppError("Insufficient permissions to review articles", 403);
    }

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    
    if (!workspaceIdStr || !articleIdStr) {
        throw new AppError("Workspace ID and article ID are required", 400);
    }

    // Check if article exists and is in review
    const article = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false
        }
    });

    if (!article) throw new AppError("Article not found", 404);

    if (article.status !== "IN_REVIEW") {
        throw new AppError("Only articles in review can be approved or rejected", 400);
    }

    // Check if user already reviewed this article
    const existingApproval = await prisma.approval.findFirst({
        where: {
            articleId: articleIdStr,
            reviewerId: user.id
        }
    });

    if (existingApproval) {
        throw new AppError("You have already reviewed this article", 400);
    }

    const approval = await prisma.approval.create({
        data: {
            articleId: articleIdStr,
            reviewerId: user.id,
            status: status as "APPROVED" | "REJECTED",
            feedback: feedback || null,
            reviewedAt: new Date()
        },
        include: {
            reviewer: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            },
            article: {
                select: {
                    id: true,
                    title: true,
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    // Update article status based on approvals
    const allApprovals = await prisma.approval.findMany({
        where: { articleId: articleIdStr }
    });

    const hasRejection = allApprovals.some(a => a.status === "REJECTED");
    const allReviewersApproved = allApprovals.length > 0 && 
                              allApprovals.every(a => a.status === "APPROVED");

    let newArticleStatus: ArticleStatus = article.status;
    if (hasRejection) {
        newArticleStatus = "REJECTED";
    } else if (allReviewersApproved) {
        newArticleStatus = "APPROVED";
    }

    await prisma.article.update({
        where: { id: articleIdStr },
        data: { status: newArticleStatus }
    });

    // Create notification for article author
    if (article.authorId !== user.id) {
        await prisma.notification.create({
            data: {
                userId: article.authorId,
                type: "APPROVAL",
                referenceId: approval.id
            }
        });
    }

    res.status(201).json({
        success: true,
        message: `Article ${status.toLowerCase()} successfully`,
        approval
    });
});

export const getApprovals = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;
    const { page = 1, limit = 10, status, reviewerId } = req.query;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const skip = (Number(page) - 1) * Number(limit);
    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    
    if (!workspaceIdStr) {
        throw new AppError("Workspace ID is required", 400);
    }

    const where: any = {
        article: {
            workspaceId: workspaceIdStr
        }
    };

    if (status) {
        where.status = status as "PENDING" | "APPROVED" | "REJECTED";
    }

    if (reviewerId) {
        where.reviewerId = reviewerId as string;
    }

    const [approvals, total] = await Promise.all([
        prisma.approval.findMany({
            where,
            include: {
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                },
                article: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        status: true,
                        author: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
        }),
        prisma.approval.count({ where })
    ]);

    res.status(200).json({
        success: true,
        message: "Approvals retrieved successfully",
        data: approvals,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

export const getArticleApprovals = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    
    if (!workspaceIdStr || !articleIdStr) {
        throw new AppError("Workspace ID and article ID are required", 400);
    }

    // Check if article exists and user has access
    const article = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false
        }
    });

    if (!article) throw new AppError("Article not found", 404);

    const approvals = await prisma.approval.findMany({
        where: { articleId: articleIdStr },
        include: {
            reviewer: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        success: true,
        message: "Article approvals retrieved successfully",
        data: approvals
    });
});

export const updateApproval = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId, approvalId } = req.params;
    const { status, feedback } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
        throw new AppError("Valid approval status (APPROVED or REJECTED) is required", 400);
    }

    // Only OWNER and EDITOR can update approvals
    if (!["OWNER", "EDITOR"].includes(membership.role)) {
        throw new AppError("Insufficient permissions to update approvals", 403);
    }

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    const approvalIdStr = Array.isArray(approvalId) ? approvalId[0] : approvalId;
    
    if (!workspaceIdStr || !articleIdStr || !approvalIdStr) {
        throw new AppError("Workspace ID, article ID, and approval ID are required", 400);
    }

    const approval = await prisma.approval.findFirst({
        where: {
            id: approvalIdStr,
            article: {
                workspaceId: workspaceIdStr
            }
        },
        include: {
            article: true
        }
    });

    if (!approval) throw new AppError("Approval not found", 404);

    const updatedApproval = await prisma.approval.update({
        where: { id: approvalIdStr },
        data: {
            status: status as "APPROVED" | "REJECTED",
            feedback: feedback || null,
            reviewedAt: new Date()
        },
        include: {
            reviewer: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            },
            article: {
                select: {
                    id: true,
                    title: true,
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    // Recalculate article status
    const allApprovals = await prisma.approval.findMany({
        where: { articleId: articleIdStr }
    });

    const hasRejection = allApprovals.some(a => a.status === "REJECTED");
    const allReviewersApproved = allApprovals.length > 0 && 
                              allApprovals.every(a => a.status === "APPROVED");

    let newArticleStatus: ArticleStatus = approval.article.status;
    if (hasRejection) {
        newArticleStatus = "REJECTED";
    } else if (allReviewersApproved) {
        newArticleStatus = "APPROVED";
    }

    await prisma.article.update({
        where: { id: articleIdStr },
        data: { status: newArticleStatus }
    });

    res.status(200).json({
        success: true,
        message: "Approval updated successfully",
        approval: updatedApproval
    });
});
