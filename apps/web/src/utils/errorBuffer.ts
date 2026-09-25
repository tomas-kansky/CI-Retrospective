/**
 * Globální buffer pro zachycení posledních chyb z JavaScriptové konzole
 * Automaticky přikládán k hlášením chyb (Bug reports)
 */

export interface ErrorLogItem {
  time: string;
  message: string;
  source?: string;
  stack?: string;
}

const MAX_ERRORS = 10;
const errorBuffer: ErrorLogItem[] = [];

let isInitialized = false;

export function initErrorBuffer() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  window.addEventListener("error", (event) => {
    const item: ErrorLogItem = {
      time: new Date().toISOString(),
      message: event.message || "Unknown error",
      source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      stack: event.error?.stack ? String(event.error.stack).slice(0, 500) : undefined,
    };

    errorBuffer.push(item);
    if (errorBuffer.length > MAX_ERRORS) {
      errorBuffer.shift();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const item: ErrorLogItem = {
      time: new Date().toISOString(),
      message: reason?.message || String(reason) || "Unhandled Promise rejection",
      stack: reason?.stack ? String(reason.stack).slice(0, 500) : undefined,
    };

    errorBuffer.push(item);
    if (errorBuffer.length > MAX_ERRORS) {
      errorBuffer.shift();
    }
  });
}

export function getRecentErrors(): ErrorLogItem[] {
  return [...errorBuffer];
}

export function clearRecentErrors() {
  errorBuffer.length = 0;
}
