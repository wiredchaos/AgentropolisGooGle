export type HealthStatus = "up" | "down" | "unknown";
export interface AppHealthResult {
    id: string;
    name: string;
    url: string;
    status: HealthStatus;
    latencyMs: number | null;
    checkedAt: string;
    error?: string;
}
export declare function checkAllHealth(): Promise<AppHealthResult[]>;
export declare function checkAppHealth(id: string): Promise<AppHealthResult | null>;
//# sourceMappingURL=health.d.ts.map