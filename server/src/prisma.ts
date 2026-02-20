import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("DB connected successfully");

    } catch (error: any) {
        console.error("Error while connecting to DB", error.message);
        throw error;
    }
}

export { prisma, connectDB };