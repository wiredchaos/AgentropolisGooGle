"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = trackEvent;
exports.getRecentEvents = getRecentEvents;
exports.getEventsByType = getEventsByType;
exports.getEventsByApp = getEventsByApp;
exports.getSummaryStats = getSummaryStats;
const uuid_1 = require("uuid");
/** In-memory ring buffer — last 500 events */
const EVENT_STORE = [];
const MAX_EVENTS = 500;
function trackEvent(type, source, data) {
    const event = {
        id: (0, uuid_1.v4)(),
        type,
        timestamp: new Date().toISOString(),
        source,
        ...data,
    };
    EVENT_STORE.push(event);
    if (EVENT_STORE.length > MAX_EVENTS)
        EVENT_STORE.shift();
    return event;
}
function getRecentEvents(limit = 50) {
    return [...EVENT_STORE].reverse().slice(0, limit);
}
function getEventsByType(type, limit = 50) {
    return [...EVENT_STORE]
        .filter((e) => e.type === type)
        .reverse()
        .slice(0, limit);
}
function getEventsByApp(appId, limit = 50) {
    return [...EVENT_STORE]
        .filter((e) => e.appId === appId)
        .reverse()
        .slice(0, limit);
}
function getSummaryStats() {
    const counts = {};
    for (const e of EVENT_STORE) {
        counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    const appCounts = {};
    for (const e of EVENT_STORE) {
        if (e.appId)
            appCounts[e.appId] = (appCounts[e.appId] ?? 0) + 1;
    }
    return {
        total: EVENT_STORE.length,
        byType: counts,
        byApp: appCounts,
        since: EVENT_STORE[0]?.timestamp ?? null,
    };
}
//# sourceMappingURL=analytics.js.map