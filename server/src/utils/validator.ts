import Joi from "joi";

export const registerUserSchema = Joi.object({
  name: Joi.string()
    .max(100)
    .trim()
    .required()
    .messages({
      "string.base": "Name must be a string",
      "string.empty": "Name is required",
      "string.max": "Name must be a maximum of 100 characters",
      "any.required": "Name is required",
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.base": "Email must be a string",
      "string.email": "Invalid email format",
      "string.empty": "Email is required",
      "any.required": "Email is required",
    }),

  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      "string.base": "Password must be a string",
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password must be a maximum of 100 characters",
      "any.required": "Password is required",
    }),
});

export const loginUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.base": "Email must be a string",
      "string.email": "Invalid email",
      "string.empty": "Email is required",
      "any.required": "Email is required",
    }),

  password: Joi.string()
    .required()
    .messages({
      "string.base": "Password must be a string",
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .max(100)
    .trim()
    .optional()
    .messages({
      "string.base": "Name must be a string",
      "string.max": "Name must be a maximum of 100 characters",
    }),

  avatar: Joi.string()
    .uri()
    .allow(null)
    .optional()
    .messages({
      "string.base": "Avatar must be a string",
      "string.uri": "Avatar must be a valid URL",
    }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      "string.base": "Current password must be a string",
      "string.empty": "Current password is required",
      "any.required": "Current password is required",
    }),

  newPassword: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      "string.base": "New password must be a string",
      "string.empty": "New password is required",
      "string.min": "New password must be at least 8 characters long",
      "string.max": "New password must be a maximum of 100 characters",
      "any.required": "New password is required",
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.base": "Email must be a string",
      "string.email": "Invalid email format",
      "string.empty": "Email is required",
      "any.required": "Email is required",
    }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      "string.base": "Token must be a string",
      "string.empty": "Token is required",
      "any.required": "Token is required",
    }),

  newPassword: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      "string.base": "New password must be a string",
      "string.empty": "New password is required",
      "string.min": "New password must be at least 8 characters long",
      "string.max": "New password must be a maximum of 100 characters",
      "any.required": "New password is required",
    }),
});

export const verifyResetTokenSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      "string.base": "Token must be a string",
      "string.empty": "Token is required",
      "any.required": "Token is required",
    }),
});

export const createWorkspaceSchema = Joi.object({
  name: Joi.string()
    .max(100)
    .trim()
    .required()
    .messages({
      "string.base": "Workspace name must be a string",
      "string.empty": "Workspace name is required",
      "string.max": "Workspace name must be a maximum of 100 characters",
      "any.required": "Workspace name is required",
    }),

  description: Joi.string()
    .max(500)
    .allow(null, "")
    .optional()
    .messages({
      "string.base": "Description must be a string",
      "string.max": "Description must be a maximum of 500 characters",
    }),
});

export const updateWorkspaceSchema = Joi.object({
  name: Joi.string()
    .max(100)
    .trim()
    .optional()
    .messages({
      "string.base": "Workspace name must be a string",
      "string.max": "Workspace name must be a maximum of 100 characters",
    }),

  description: Joi.string()
    .max(500)
    .allow(null, "")
    .optional()
    .messages({
      "string.base": "Description must be a string",
      "string.max": "Description must be a maximum of 500 characters",
    }),
});

export const inviteMemberSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.base": "Email must be a string",
      "string.email": "Invalid email format",
      "string.empty": "Email is required",
      "any.required": "Email is required",
    }),

  role: Joi.string()
    .valid("OWNER", "EDITOR", "VIEWER", "REVIEWER")
    .required()
    .messages({
      "string.base": "Role must be a string",
      "any.only": "Role must be one of: OWNER, EDITOR, VIEWER, REVIEWER",
      "any.required": "Role is required",
    }),
});

export const updateMemberRoleSchema = Joi.object({
  role: Joi.string()
    .valid("OWNER", "EDITOR", "VIEWER", "REVIEWER")
    .required()
    .messages({
      "string.base": "Role must be a string",
      "any.only": "Role must be one of: OWNER, EDITOR, VIEWER, REVIEWER",
      "any.required": "Role is required",
    }),
});

export const createArticleSchema = Joi.object({
  title: Joi.string()
    .max(200)
    .trim()
    .required()
    .messages({
      "string.base": "Title must be a string",
      "string.empty": "Title is required",
      "string.max": "Title must be a maximum of 200 characters",
      "any.required": "Title is required",
    }),

  content: Joi.string()
    .required()
    .messages({
      "string.base": "Content must be a string",
      "string.empty": "Content is required",
      "any.required": "Content is required",
    }),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .optional()
    .messages({
      "array.base": "Tags must be an array",
      "string.base": "Each tag must be a string",
      "string.max": "Each tag must be a maximum of 50 characters",
    }),
});

export const updateArticleSchema = Joi.object({
  title: Joi.string()
    .max(200)
    .trim()
    .optional()
    .messages({
      "string.base": "Title must be a string",
      "string.max": "Title must be a maximum of 200 characters",
    }),

  content: Joi.string()
    .optional()
    .messages({
      "string.base": "Content must be a string",
    }),

  status: Joi.string()
    .valid("DRAFT", "IN_REVIEW", "APPROVED", "REJECTED")
    .optional()
    .messages({
      "string.base": "Status must be a string",
      "any.only": "Status must be one of: DRAFT, IN_REVIEW, APPROVED, REJECTED",
    }),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .optional()
    .messages({
      "array.base": "Tags must be an array",
      "string.base": "Each tag must be a string",
      "string.max": "Each tag must be a maximum of 50 characters",
    }),
});

export const todoSchema = Joi.object({
  content: Joi.string()
    .required()
    .messages({
      "string.base": "Content must be a string",
      "string.empty": "Content is required",
      "string.any": "Content is required",
    })
})