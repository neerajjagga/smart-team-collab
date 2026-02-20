import type { Request, Response } from "express"
import { asyncHandler } from "../utils/asyncHandler.js"

import bcrypt from "bcrypt";
import { prisma } from "../prisma.js";

import { generateAccessToken, generateRefreshToken, setCookies, verifyRefreshToken, generateOpaqueToken, hashToken } from "../utils/user.utils.js"
import { AppError } from "../utils/appError.js";

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body

    const isUserAlreadyPresent = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
    });

    if (isUserAlreadyPresent) throw new AppError("Account already present with this email", 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
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
            updatedAt: true,
        }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    setCookies(refreshToken, res);

    res.status(201).json({
        success: true,
        message: "Account created successfully",
        token: accessToken,
        user
    });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body

    if (!email || !password) throw new AppError("email and password is required", 400);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
            email: true,
            password: true,
            avatar: true,
            globalRole: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
        }
    });

    if (!user) throw new AppError("Invalid credentials", 400);

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) throw new AppError("Invalid credentials", 400);

    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    setCookies(refreshToken, res);

    const { password: _password, ...publicUser } = user;

    res.status(200).json({
        success: true,
        message: "Logged in successfully",
        token: accessToken,
        user: publicUser
    });
});

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
})

export const logoutAllDevices = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Unauthorized", 400);

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
})

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Unauthorized", 400);

    res.status(200).json({
        success: true,
        message: "User profile retrieved",
        user,
    });
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) throw new AppError("No refresh token provided", 401);

    let payload: { userId: string };
    try {
        payload = verifyRefreshToken(refreshToken);
    } catch (e) {
        throw new AppError("Invalid or expired refresh token", 401);
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true }
    });

    if (!user) throw new AppError("User not found", 401);

    const newRefreshToken = generateRefreshToken(user.id);
    setCookies(newRefreshToken, res);

    const accessToken = generateAccessToken(user.id);

    res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        token: accessToken,
    });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        throw new AppError("Email is required", 400);
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true }
    });

    if (!user) {
        // Don't reveal that the user doesn't exist
        return res.status(200).json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent"
        });
    }

    // Generate reset token
    const resetToken = generateOpaqueToken();
    const hashedResetToken = hashToken(resetToken);
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save reset token to user record
    await prisma.user.update({
        where: { id: user.id },
        data: {
            // Note: You would need to add these fields to your User model
            // resetToken: hashedResetToken,
            // resetTokenExpiry: resetTokenExpiry
        }
    });

    // TODO: Send email with reset link
    // For now, we'll just return the token (in production, send via email)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent"
        // In development, you might return: { resetToken }
    });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        throw new AppError("Reset token and new password are required", 400);
    }

    const hashedToken = hashToken(token);

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
        where: {
            // Note: You would need to add these fields to your User model
            // resetToken: hashedToken,
            // resetTokenExpiry: {
            //     gt: new Date()
            // }
        }
    });

    if (!user) {
        throw new AppError("Invalid or expired reset token", 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            // resetToken: null,
            // resetTokenExpiry: null
        }
    });

    res.status(200).json({
        success: true,
        message: "Password reset successfully"
    });
});

export const verifyResetToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
        throw new AppError("Reset token is required", 400);
    }

    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
        where: {
            // Note: You would need to add these fields to your User model
            // resetToken: hashedToken,
            // resetTokenExpiry: {
            //     gt: new Date()
            // }
        },
        select: { id: true }
    });

    if (!user) {
        throw new AppError("Invalid or expired reset token", 400);
    }

    res.status(200).json({
        success: true,
        message: "Reset token is valid"
    });
});