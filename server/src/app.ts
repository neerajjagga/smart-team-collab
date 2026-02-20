import express from 'express'
import type { Application, NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';

import helmet from 'helmet';
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.route.js';
import userRouter from './routes/user.route.js';

const app: Application = express()

app.use(express.json({ limit: "5MB" }))
app.use(cookieParser())
app.use(helmet())
app.use(morgan('combined'))

app.use(cors())

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later."
})
app.use(limiter);

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

app.get('/health', (req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        message: 'Server is up and running from CICD'
    });
});

app.all(/.*/, (req: Request, res: Response) => {
    return res.status(404).json({
        success: false,
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {

    console.log(err.stack);

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    console.error("Error ", err);
    return res.status(500).json({
        success: false,
        message: "Something went wrong",
    });
});

export default app;