import type { PublicUser, WorkspaceMember, Workspace } from "./user.types.ts"

declare global {
    namespace Express {
        interface Request {
            user ?: PublicUser
            workspaceMembership?: (WorkspaceMember & { workspace: Workspace })
        }
    }
}