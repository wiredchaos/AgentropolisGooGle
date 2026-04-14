export type AppLayer = "hub" | "infrastructure" | "safety" | "education" | "social" | "intelligence" | "gtm-core" | "b2b" | "media" | "experience" | "incentive" | "chain";
export interface RegisteredApp {
    id: string;
    name: string;
    url: string;
    description: string;
    layer: AppLayer;
    tags: string[];
    active: boolean;
    /** GTM workflow categories this app participates in */
    gtmRoles: string[];
}
export declare const APP_REGISTRY: RegisteredApp[];
export declare function getAppById(id: string): RegisteredApp | undefined;
export declare function getAppsByLayer(layer: AppLayer): RegisteredApp[];
export declare function getAppsByGtmRole(role: string): RegisteredApp[];
export declare function getActiveApps(): RegisteredApp[];
//# sourceMappingURL=registry.d.ts.map