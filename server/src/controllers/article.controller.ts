import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";
import type { ArticleStatus } from "../types/user.types.js";

export const createArticle = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;
    const { title, content, tags } = req.body as { title: string, content: string, tags?: string[] };
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    // Only OWNER and EDITOR can create articles
    if (!["OWNER", "EDITOR"].includes(membership.role)) {
        throw new AppError("Insufficient permissions to create articles", 403);
    }

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    if (!workspaceIdStr) throw new AppError("Workspace ID is required", 400);

    // Generate unique slug
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${Date.now()}`;

    const article = await prisma.article.create({
        data: {
            workspaceId: workspaceIdStr,
            authorId: user.id,
            title,
            slug,
            status: "DRAFT",
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
            articleTags: {
                include: {
                    tag: true
                }
            },
            _count: {
                select: {
                    versions: true,
                    comments: true,
                    approvals: true
                }
            }
        }
    });

    // Handle tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagConnections = await Promise.all(
            tags.map(async (tagName: string) => {
                let tag = await prisma.tag.findFirst({
                    where: {
                        name: { equals: tagName as string },
                        workspaceId: workspaceIdStr
                    }
                });

                if (!tag) {
                    tag = await prisma.tag.create({
                        data: {
                            name: tagName,
                            workspaceId: workspaceIdStr,
                            createdById: user.id
                        }
                    });
                }

                return {
                    articleId: article.id as string,
                    tagId: tag.id
                };
            })
        );

        await prisma.articleTag.createMany({
            data: tagConnections
        });

        // Refresh article with tags
        const articleWithTags = await prisma.article.findUnique({
            where: { id: article.id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                },
                articleTags: {
                    include: {
                        tag: true
                    }
                },
                _count: {
                    select: {
                        versions: true,
                        comments: true,
                        approvals: true
                    }
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Article created successfully",
            article: articleWithTags
        });
    }

    res.status(201).json({
        success: true,
        message: "Article created successfully",
        article
    });
});

export const getArticles = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId } = req.params;
    const { page = 1, limit = 10, search, status, authorId } = req.query;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    if (!workspaceIdStr) throw new AppError("Workspace ID is required", 400);

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
        workspaceId: workspaceIdStr,
        isArchived: false
    };

    if (search) {
        where.OR = [
            { title: { contains: search as string, mode: 'insensitive' as const } },
            { content: { contains: search as string, mode: 'insensitive' as const } }
        ];
    }

    if (status) {
        where.status = status as ArticleStatus;
    }

    if (authorId) {
        where.authorId = authorId as string;
    }

    const [articles, total] = await Promise.all([
        prisma.article.findMany({
            where,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                },
                articleTags: {
                    include: {
                        tag: true
                    }
                },
                lastEditedBy: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                },
                _count: {
                    select: {
                        versions: true,
                        comments: true,
                        approvals: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: Number(limit)
        }),
        prisma.article.count({ where })
    ]);

    res.status(200).json({
        success: true,
        message: "Articles retrieved successfully",
        data: articles,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

export const getArticle = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    if (!workspaceIdStr || !articleIdStr) throw new AppError("Workspace ID and article ID are required", 400);

    const article = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false
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
            articleTags: {
                include: {
                    tag: true
                }
            },
            lastEditedBy: {
                select: {
                    id: true,
                    name: true,
                    avatar: true
                }
            },
            versions: {
                orderBy: { versionNumber: 'desc' },
                take: 5,
                include: {
                    editedBy: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    }
                }
            },
            comments: {
                where: { isDeleted: false },
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    },
                    replies: {
                        where: { isDeleted: false },
                        include: {
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
            },
            approvals: {
                include: {
                    reviewer: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    versions: true,
                    comments: true,
                    approvals: true
                }
            }
        }
    });

    if (!article) throw new AppError("Article not found", 404);

    // Increment view count
    await prisma.article.update({
        where: { id: articleIdStr },
        data: { viewCount: { increment: 1 } }
    });

    res.status(200).json({
        success: true,
        message: "Article retrieved successfully",
        article
    });
});

export const updateArticle = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const { title, content, status, tags } = req.body;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    if (!workspaceIdStr || !articleIdStr) throw new AppError("Workspace ID and article ID are required", 400);

    // Check permissions
    const canEdit = ["OWNER", "EDITOR"].includes(membership.role) || 
                   (membership.role === "REVIEWER" && status === "IN_REVIEW");

    if (!canEdit) {
        throw new AppError("Insufficient permissions to update this article", 403);
    }

    const existingArticle = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false
        }
    });

    if (!existingArticle) throw new AppError("Article not found", 404);

    // Only author and editors can update content
    if (content && existingArticle.authorId !== user.id && !["OWNER", "EDITOR"].includes(membership.role)) {
        throw new AppError("Only article author and editors can update content", 403);
    }

    const updateData: any = {
        lastEditedAt: new Date(),
        lastEditedById: user.id
    };

    if (title) updateData.title = title;
    if (status) updateData.status = status;

    const updatedArticle = await prisma.article.update({
        where: { id: articleIdStr },
        data: updateData,
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            },
            articleTags: {
                include: {
                    tag: true
                }
            },
            lastEditedBy: {
                select: {
                    id: true,
                    name: true,
                    avatar: true
                }
            },
            _count: {
                select: {
                    versions: true,
                    comments: true,
                    approvals: true
                }
            }
        }
    });

    // Handle tags if provided
    if (tags !== undefined) {
        // Remove existing tag connections
        await prisma.articleTag.deleteMany({
            where: { articleId: articleIdStr }
        });

        // Add new tag connections
        if (Array.isArray(tags) && tags.length > 0) {
            const tagConnections = await Promise.all(
                tags.map(async (tagName: string) => {
                    let tag = await prisma.tag.findFirst({
                        where: {
                            name: tagName,
                            workspaceId: workspaceIdStr
                        }
                    });

                    if (!tag) {
                        tag = await prisma.tag.create({
                            data: {
                                name: tagName,
                                workspaceId: workspaceIdStr,
                                createdById: user.id
                            }
                        });
                    }

                    return {
                        articleId: articleIdStr,
                        tagId: tag.id
                    };
                })
            );

            await prisma.articleTag.createMany({
                data: tagConnections
            });
        }

        // Refresh article with tags
        const articleWithTags = await prisma.article.findUnique({
            where: { id: articleIdStr },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                },
                articleTags: {
                    include: {
                        tag: true
                    }
                },
                lastEditedBy: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                },
                _count: {
                    select: {
                        versions: true,
                        comments: true,
                        approvals: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: "Article updated successfully",
            article: articleWithTags
        });
    }

    res.status(200).json({
        success: true,
        message: "Article updated successfully",
        article: updatedArticle
    });
});

export const archiveArticle = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    if (!workspaceIdStr || !articleIdStr) throw new AppError("Workspace ID and article ID are required", 400);

    // Only OWNER and EDITOR can archive articles
    if (!["OWNER", "EDITOR"].includes(membership.role)) {
        throw new AppError("Insufficient permissions to archive articles", 403);
    }

    const article = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false
        }
    });

    if (!article) throw new AppError("Article not found", 404);

    await prisma.article.update({
        where: { id: articleIdStr },
        data: { isArchived: true }
    });

    res.status(200).json({
        success: true,
        message: "Article archived successfully"
    });
});

export const submitForReview = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { workspaceId, articleId } = req.params;
    const membership = req.workspaceMembership;

    if (!user) throw new AppError("Authentication required", 401);
    if (!membership) throw new AppError("Workspace access required", 403);

    const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
    const articleIdStr = Array.isArray(articleId) ? articleId[0] : articleId;
    if (!workspaceIdStr || !articleIdStr) throw new AppError("Workspace ID and article ID are required", 400);

    const article = await prisma.article.findFirst({
        where: {
            id: articleIdStr,
            workspaceId: workspaceIdStr,
            isArchived: false,
            authorId: user.id
        }
    });

    if (!article) throw new AppError("Article not found or you're not the author", 404);

    if (article.status !== "DRAFT") {
        throw new AppError("Only draft articles can be submitted for review", 400);
    }

    const updatedArticle = await prisma.article.update({
        where: { id: articleIdStr },
        data: { status: "IN_REVIEW" },
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
    });

    res.status(200).json({
        success: true,
        message: "Article submitted for review",
        article: updatedArticle
    });
});
