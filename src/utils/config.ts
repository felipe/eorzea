import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config as loadEnv } from 'dotenv';

export interface AppConfig {
  xivapi: {
    apiKey?: string;
    rateLimitMs: number;
  };
  character: {
    defaultName?: string;
    defaultServer?: string;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  xivapi: {
    rateLimitMs: 100, // 10 requests per second
  },
  character: {},
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour in seconds
  },
};

const CONFIG_DIR = path.join(os.homedir(), '.eorzea');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const ENV_FILE = path.join(process.cwd(), '.env');

export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  private loadConfig(): void {
    // Load from .env file if it exists
    if (fs.existsSync(ENV_FILE)) {
      loadEnv({ path: ENV_FILE });
    }

    // Load from environment variables
    if (process.env.XIVAPI_KEY) {
      this.config.xivapi.apiKey = process.env.XIVAPI_KEY;
    }

    if (process.env.DEFAULT_CHARACTER_NAME) {
      this.config.character.defaultName = process.env.DEFAULT_CHARACTER_NAME;
    }

    if (process.env.DEFAULT_SERVER) {
      this.config.character.defaultServer = process.env.DEFAULT_SERVER;
    }

    // Load from config file if it exists
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        this.config = this.mergeConfig(this.config, fileConfig);
      } catch (error) {
        console.warn(`Failed to load config from ${CONFIG_FILE}:`, error);
      }
    }
  }

  private mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    return {
      xivapi: {
        ...base.xivapi,
        ...override.xivapi,
      },
      character: {
        ...base.character,
        ...override.character,
      },
      cache: {
        ...base.cache,
        ...override.cache,
      },
    };
  }

  get(): AppConfig {
    return { ...this.config };
  }

  set(updates: Partial<AppConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }

  save(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save config to ${CONFIG_FILE}: ${error}`);
    }
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  }

  getConfigPath(): string {
    return CONFIG_FILE;
  }
}

// Export singleton instance
let configInstance: ConfigManager | null = null;

export function getConfig(): ConfigManager {
  if (!configInstance) {
    configInstance = new ConfigManager();
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}
