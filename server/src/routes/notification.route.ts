import { Router } from "express";
import { 
    getNotifications, 
    markNotificationsAsRead, 
    markAllNotificationsAsRead,
    getUnreadCount,
    deleteNotification 
} from "../controllers/notification.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { validate } from "../middlewares/validate.js";

const notificationRouter = Router();

// All routes require authentication only (no workspace membership needed)
notificationRouter.get('/', verifyAuth, getNotifications);
notificationRouter.post('/mark-read', verifyAuth, markNotificationsAsRead);
notificationRouter.post('/mark-all-read', verifyAuth, markAllNotificationsAsRead);
notificationRouter.get('/unread-count', verifyAuth, getUnreadCount);
notificationRouter.delete('/:notificationId', verifyAuth, deleteNotification);

export default notificationRouter;
