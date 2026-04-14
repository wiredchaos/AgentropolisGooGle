export type EventType = "workflow_triggered" | "app_visited" | "health_check" | "distribution_event" | "error";
export interface GTMEvent {
    id: string;
    type: EventType;
    appId?: string;
    workflowId?: string;
    payload?: Record<string, unknown>;
    timestamp: string;
    source: string;
}
export declare function trackEvent(type: EventType, source: string, data?: {
    appId?: string;
    workflowId?: string;
    payload?: Record<string, unknown>;
}): GTMEvent;
export declare function getRecentEvents(limit?: number): GTMEvent[];
export declare function getEventsByType(type: EventType, limit?: number): GTMEvent[];
export declare function getEventsByApp(appId: string, limit?: number): GTMEvent[];
export declare function getSummaryStats(): {
    total: number;
    byType: Record<string, number>;
    byApp: Record<string, number>;
    since: string;
};
//# sourceMappingURL=analytics.d.ts.map