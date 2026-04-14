/**
 * Simple level-based logger.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = process.env.NODE_ENV === "production" ? "warn" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function getLogArgs(context: string, message: string, data?: unknown): [string] | [string, unknown] {
  if (data === undefined) {
    return [`[${context}] ${message}`];
  }

  return [`[${context}] ${message}`, data];
}

export const logger = {
  debug: (context: string, message: string, data?: unknown) => {
    if (!shouldLog("debug")) return;
    console.log(...getLogArgs(context, message, data));
  },
  info: (context: string, message: string, data?: unknown) => {
    if (!shouldLog("info")) return;
    console.info(...getLogArgs(context, message, data));
  },
  warn: (context: string, message: string, data?: unknown) => {
    if (!shouldLog("warn")) return;
    console.warn(...getLogArgs(context, message, data));
  },
  error: (context: string, message: string, data?: unknown) => {
    if (!shouldLog("error")) return;
    console.error(...getLogArgs(context, message, data));
  },
};
