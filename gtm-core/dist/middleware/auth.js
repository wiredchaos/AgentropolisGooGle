"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
/**
 * Optional API key auth middleware.
 * If GTM_API_KEY is set in env, all non-GET requests require
 * `Authorization: Bearer <key>` header.
 */
function apiKeyAuth(req, res, next) {
    const requiredKey = process.env.GTM_API_KEY;
    if (!requiredKey) {
        // No key configured — allow all traffic (dev mode)
        next();
        return;
    }
    // GET requests are public (read-only)
    if (req.method === "GET") {
        next();
        return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing Authorization header" });
        return;
    }
    const token = authHeader.slice(7);
    if (token !== requiredKey) {
        res.status(403).json({ error: "Invalid API key" });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map