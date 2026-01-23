/**
 * Simple logger for Blackbox
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

export class Logger {
  private readonly level: number;
  private readonly prefix: string;
  private readonly showTimestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    const envLevel = process.env.BLACKBOX_LOG_LEVEL as LogLevel | undefined;
    this.level = LOG_LEVELS[options.level || envLevel || "info"];
    this.prefix = options.prefix || "";
    this.showTimestamp = options.timestamp ?? true;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];

    if (this.showTimestamp) {
      parts.push(new Date().toISOString());
    }

    parts.push(`[${level.toUpperCase()}]`);

    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }

    parts.push(message);

    return parts.join(" ");
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message), ...args);
    }
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({
      level: Object.entries(LOG_LEVELS).find(([_, v]) => v === this.level)?.[0] as LogLevel,
      prefix: childPrefix,
      timestamp: this.showTimestamp,
    });
  }
}

// Default logger instance
export const logger = new Logger();

// Create logger for a specific component
export function createLogger(component: string): Logger {
  return new Logger({ prefix: component });
}
