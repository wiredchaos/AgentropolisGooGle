import { v4 as uuidv4 } from "uuid";

export type EventType =
  | "workflow_triggered"
  | "app_visited"
  | "health_check"
  | "distribution_event"
  | "error";

export interface GTMEvent {
  id: string;
  type: EventType;
  appId?: string;
  workflowId?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
  source: string;
}

/** In-memory ring buffer — last 500 events */
const EVENT_STORE: GTMEvent[] = [];
const MAX_EVENTS = 500;

export function trackEvent(
  type: EventType,
  source: string,
  data?: { appId?: string; workflowId?: string; payload?: Record<string, unknown> }
): GTMEvent {
  const event: GTMEvent = {
    id: uuidv4(),
    type,
    timestamp: new Date().toISOString(),
    source,
    ...data,
  };

  EVENT_STORE.push(event);
  if (EVENT_STORE.length > MAX_EVENTS) EVENT_STORE.shift();

  return event;
}

export function getRecentEvents(limit = 50): GTMEvent[] {
  return [...EVENT_STORE].reverse().slice(0, limit);
}

export function getEventsByType(type: EventType, limit = 50): GTMEvent[] {
  return [...EVENT_STORE]
    .filter((e) => e.type === type)
    .reverse()
    .slice(0, limit);
}

export function getEventsByApp(appId: string, limit = 50): GTMEvent[] {
  return [...EVENT_STORE]
    .filter((e) => e.appId === appId)
    .reverse()
    .slice(0, limit);
}

export function getSummaryStats() {
  const counts: Record<string, number> = {};
  for (const e of EVENT_STORE) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }

  const appCounts: Record<string, number> = {};
  for (const e of EVENT_STORE) {
    if (e.appId) appCounts[e.appId] = (appCounts[e.appId] ?? 0) + 1;
  }

  return {
    total: EVENT_STORE.length,
    byType: counts,
    byApp: appCounts,
    since: EVENT_STORE[0]?.timestamp ?? null,
  };
}
