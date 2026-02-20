import type { Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from "crypto";

interface ICookieOptions {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax";
    path: string
}

export const generateAccessToken = (userId: string) =>
    jwt.sign({ userId }, (process.env.ACCESS_TOKEN_SECRET as string), {
        expiresIn: "15m"
    })

export const generateRefreshToken = (userId: string) =>
    jwt.sign({ userId }, (process.env.REFRESH_TOKEN_SECRET as string), {
        expiresIn: "7d"
    })

export const verifyRefreshToken = (token: string) =>
    jwt.verify(token, (process.env.REFRESH_TOKEN_SECRET as string)) as { userId: string }

export const generateOpaqueToken = () =>
    crypto.randomBytes(64).toString("hex");

export const hashToken = (token: string) =>
    crypto.createHash("sha256").update(token).digest("hex");

export const setCookies = (refreshToken: string, res: Response) => {
    const isProd = process.env.NODE_ENV === "production"

    const cookieOptions: ICookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: '/'
    }

    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 100
    });
}