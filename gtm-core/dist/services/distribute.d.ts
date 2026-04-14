export interface DistributionPayload {
    type: "content" | "lead" | "workflow" | "signal" | "broadcast";
    title: string;
    body: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    targetRoles?: string[];
    sourceAppId?: string;
}
export interface DistributionResult {
    appId: string;
    appName: string;
    url: string;
    success: boolean;
    statusCode?: number;
    error?: string;
}
/**
 * Fan-out a GTM distribution event to all apps that match the requested roles.
 * Apps receive a POST to `{app.url}/api/gtm/receive` — if they don't implement
 * this endpoint the call will fail gracefully and be logged.
 */
export declare function distribute(payload: DistributionPayload): Promise<DistributionResult[]>;
//# sourceMappingURL=distribute.d.ts.map