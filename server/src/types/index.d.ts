import type { PublicUser } from "./user.types.ts"

declare global {
    namespace Express {
        interface Request {
            user ?: PublicUser
        }
    }
}