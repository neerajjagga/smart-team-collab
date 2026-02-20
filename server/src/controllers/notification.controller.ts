import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/appError.js";

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { page = 1, limit = 20, isRead, type } = req.query;

    if (!user) throw new AppError("Authentication required", 401);

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId: user.id };

    if (isRead !== undefined) {
        where.isRead = isRead === 'true';
    }

    if (type) {
        where.type = type as "COMMENT" | "APPROVAL" | "MENTION";
    }

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
        }),
        prisma.notification.count({ where })
    ]);

    res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        data: notifications,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

export const markNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { notificationIds } = req.body;

    if (!user) throw new AppError("Authentication required", 401);

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new AppError("Notification IDs array is required", 400);
    }

    // Verify all notifications belong to the user
    const notifications = await prisma.notification.findMany({
        where: {
            id: { in: notificationIds },
            userId: user.id
        }
    });

    if (notifications.length !== notificationIds.length) {
        throw new AppError("Some notifications not found or don't belong to you", 404);
    }

    await prisma.notification.updateMany({
        where: {
            id: { in: notificationIds },
            userId: user.id
        },
        data: { isRead: true }
    });

    res.status(200).json({
        success: true,
        message: "Notifications marked as read successfully"
    });
});

export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) throw new AppError("Authentication required", 401);

    await prisma.notification.updateMany({
        where: {
            userId: user.id,
            isRead: false
        },
        data: { isRead: true }
    });

    res.status(200).json({
        success: true,
        message: "All notifications marked as read successfully"
    });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) throw new AppError("Authentication required", 401);

    const unreadCount = await prisma.notification.count({
        where: {
            userId: user.id,
            isRead: false
        }
    });

    res.status(200).json({
        success: true,
        message: "Unread notifications count retrieved successfully",
        data: { unreadCount }
    });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { notificationId } = req.params;

    if (!user) throw new AppError("Authentication required", 401);

    const notificationIdStr = Array.isArray(notificationId) ? notificationId[0] : notificationId;
    
    if (!notificationIdStr) {
        throw new AppError("Notification ID is required", 400);
    }

    const notification = await prisma.notification.findFirst({
        where: {
            id: notificationIdStr,
            userId: user.id
        }
    });

    if (!notification) throw new AppError("Notification not found", 404);

    await prisma.notification.delete({
        where: { id: notificationIdStr }
    });

    res.status(200).json({
        success: true,
        message: "Notification deleted successfully"
    });
});
