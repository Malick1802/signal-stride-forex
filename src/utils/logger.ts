
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  level: LogLevel;
  enabledCategories: string[];
}

const config: LogConfig = {
  level: 'info',
  enabledCategories: ['signals', 'monitoring', 'chart', 'realtime']
};

const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  private static lastLog: Record<string, number> = {};
  private static debounceTime = 1000; // 1 second debounce

  static debug(category: string, message: string, ...args: any[]) {
    this.log('debug', category, message, ...args);
  }

  static info(category: string, message: string, ...args: any[]) {
    this.log('info', category, message, ...args);
  }

  static warn(category: string, message: string, ...args: any[]) {
    this.log('warn', category, message, ...args);
  }

  static error(category: string, message: string, ...args: any[]) {
    this.log('error', category, message, ...args);
  }

  private static log(level: LogLevel, category: string, message: string, ...args: any[]) {
    if (logLevels[level] < logLevels[config.level]) return;
    if (!config.enabledCategories.includes(category)) return;

    // Debounce identical messages
    const key = `${category}:${message}`;
    const now = Date.now();
    if (this.lastLog[key] && (now - this.lastLog[key]) < this.debounceTime) {
      return;
    }
    this.lastLog[key] = now;

    const emoji = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
    console.log(`${emoji} [${category.toUpperCase()}] ${message}`, ...args);
  }
}

export default Logger;
