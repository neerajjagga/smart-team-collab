import type { Request, Response, NextFunction } from "express";
import type { ObjectSchema } from "joi";

export const validate =
    (schema: ObjectSchema) =>
        (req: Request, res: Response, next: NextFunction) => {
            const { error, value } = schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
            });

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.details[0]?.message,
                });
            }

            req.body = value;
            next();
        };
