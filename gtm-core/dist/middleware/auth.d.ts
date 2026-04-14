import { Request, Response, NextFunction } from "express";
/**
 * Optional API key auth middleware.
 * If GTM_API_KEY is set in env, all non-GET requests require
 * `Authorization: Bearer <key>` header.
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map