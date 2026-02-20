import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";

export const getArticleVersions = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const skip = (Number(page) - 1) * Number(limit);
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    
    if (!articleIdStr) {
        throw new AppError("Article ID is required", 400);
    }

    const [versions, total] = await Promise.all([
        prisma.articleVersion.findMany({
            where: { articleId: articleIdStr },
            include: {
                editedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                }
            },
            orderBy: { versionNumber: 'desc' },
            skip,
            take: Number(limit)
        }),
        prisma.articleVersion.count({ where: { articleId: articleIdStr } })
    ]);

    res.status(200).json({
        success: true,
        message: "Article versions retrieved successfully",
        data: versions,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

export const getArticleVersion = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId, versionNumber } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    const versionNumberStr = Array.isArray(versionNumber) ? versionNumber[0] : versionNumber;
    
    if (!articleIdStr || !versionNumberStr) {
        throw new AppError("Article ID and version number are required", 400);
    }

    const version = await prisma.articleVersion.findFirst({
        where: {
            articleId: articleIdStr,
            versionNumber: Number(versionNumberStr)
        },
        include: {
            article: {
                select: {
                    id: true,
                    title: true,
                    slug: true
                }
            },
            editedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            }
        }
    });

    if (!version) throw new AppError("Article version not found", 404);

    res.status(200).json({
        success: true,
        message: "Article version retrieved successfully",
        version
    });
});

export const createArticleVersion = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const { title, content, changeSummary } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    // Only OWNER and EDITOR can create versions, or article author
    const canCreate = ["OWNER", "EDITOR"].includes(membership.role);
    if (!canCreate) {
        throw new AppError("Insufficient permissions to create article versions", 403);
    }

    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    
    if (!articleIdStr || !workspaceIdStr) {
        throw new AppError("Article ID and workspace ID are required", 400);
    }

    const article = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false
        }
    });

    if (!article) throw new AppError("Article not found", 404);

    const latestVersion = await prisma.articleVersion.findFirst({
        where: { articleId: articleIdStr },
        orderBy: { versionNumber: 'desc' }
    });

    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const version = await prisma.articleVersion.create({
        data: {
            articleId: articleIdStr,
            editedById: user.id,
            versionNumber: newVersionNumber,
            title: title || article.title,
            content: content || '',
            changeSummary: changeSummary || null
        },
        include: {
            editedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            }
        }
    });

    // Update article current version
    await prisma.article.update({
        where: { id: articleIdStr },
        data: { 
            currentVersion: newVersionNumber,
            lastEditedAt: new Date(),
            lastEditedById: user.id
        }
    });

    res.status(201).json({
        success: true,
        message: "Article version created successfully",
        version
    });
});
