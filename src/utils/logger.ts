
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  level: LogLevel;
  enabledCategories: string[];
}

const config: LogConfig = {
  level: 'info',
  enabledCategories: ['signals', 'monitoring', 'chart', 'realtime', 'api', 'market', 'fallback', 'testing']
};

const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  private static lastLog: Record<string, number> = {};
  private static debounceTime = 2000;

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

  // Enhanced API logging
  static api(message: string, ...args: any[]) {
    this.log('info', 'api', message, ...args);
  }

  // Market data logging
  static market(message: string, ...args: any[]) {
    this.log('info', 'market', message, ...args);
  }

  // Fallback system logging
  static fallback(message: string, ...args: any[]) {
    this.log('info', 'fallback', message, ...args);
  }

  // Testing mode logging
  static testing(message: string, ...args: any[]) {
    this.log('info', 'testing', message, ...args);
  }

  private static log(level: LogLevel, category: string, message: string, ...args: any[]) {
    if (logLevels[level] < logLevels[config.level]) return;
    if (!config.enabledCategories.includes(category)) return;

    // Enhanced debounce for repetitive messages
    const key = `${category}:${message}`;
    const now = Date.now();
    if (this.lastLog[key] && (now - this.lastLog[key]) < this.debounceTime) {
      return;
    }
    this.lastLog[key] = now;

    const emoji = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
    const timestamp = new Date().toLocaleTimeString();
    
    // Enhanced logging format with timestamp
    console.log(`${emoji} [${timestamp}] [${category.toUpperCase()}] ${message}`, ...args);
  }

  // Method to temporarily enable debug logging
  static enableDebug() {
    config.level = 'debug';
    console.log('🔧 Debug logging enabled');
  }

  // Method to add new categories
  static addCategory(category: string) {
    if (!config.enabledCategories.includes(category)) {
      config.enabledCategories.push(category);
      console.log(`📝 Added logging category: ${category}`);
    }
  }

  // Method to enable testing mode logging
  static enableTestingMode() {
    this.addCategory('testing');
    this.addCategory('fallback');
    console.log('🧪 Testing mode logging enabled');
  }
}

export default Logger;
