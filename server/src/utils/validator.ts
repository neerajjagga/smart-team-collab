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

export const todoSchema = Joi.object({
  content: Joi.string()
    .required()
    .messages({
      "string.base": "Content must be a string",
      "string.empty": "Content is required",
      "string.any": "Content is required",
    })
})