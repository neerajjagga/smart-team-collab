import dotenv from 'dotenv'
dotenv.config();

import app from "./app.js";
import { prisma } from "./prisma.js";

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

const port = process.env.PORT || 3000;

await prisma.$connect().catch((err: any) => {
    console.error('DATABASE ERROR! Shutting down...');
    console.error(err?.name, err?.message);
    process.exit(1);
})

const server = app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

process.on('unhandledRejection', (err: Error) => {
    console.error('UNCAUGHT REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    })
});