export type GlobalRole = "SUPER_ADMIN" | "ADMIN" | "USER";

export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER" | "REVIEWER";

export type ArticleStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type NotificationType = "COMMENT" | "APPROVAL" | "MENTION";

export interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    avatar?: string | null;
    globalRole: GlobalRole;
    isActive: boolean;
    lastLogin?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type PublicUser = Omit<User, "password">;

export interface Workspace {
    id: string;
    name: string;
    description?: string | null;
    createdById: string;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    joinedAt: Date;
}

export interface Article {
    id: string;
    workspaceId: string;
    authorId: string;
    title: string;
    slug: string;
    currentVersion: number;
    status: ArticleStatus;
    isArchived: boolean;
    viewCount: number;
    lastEditedAt?: Date | null;
    lastEditedById?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ArticleVersion {
    id: string;
    articleId: string;
    versionNumber: number;
    title: string;
    content: string;
    editedById: string;
    changeSummary?: string | null;
    createdAt: Date;
}

export interface Comment {
    id: string;
    articleId: string;
    authorId: string;
    content: string;
    parentCommentId?: string | null;
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Tag {
    id: string;
    name: string;
    workspaceId: string;
    createdById: string;
    createdAt: Date;
}

export interface ArticleTag {
    id: string;
    articleId: string;
    tagId: string;
}

export interface Approval {
    id: string;
    articleId: string;
    reviewerId: string;
    status: ApprovalStatus;
    feedback?: string | null;
    reviewedAt?: Date | null;
    createdAt: Date;
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    referenceId?: string | null;
    isRead: boolean;
    createdAt: Date;
}