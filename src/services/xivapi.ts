import axios, { AxiosInstance, AxiosError } from 'axios';

const XIVAPI_V2_BASE_URL = 'https://v2.xivapi.com';
const DEFAULT_RATE_LIMIT_MS = 100; // 10 requests per second

export interface XIVAPIConfig {
  apiKey?: string;
  baseURL?: string;
  rateLimitMs?: number;
}

// XIVAPI V2 Quest data structure
export interface XIVAPIQuest {
  row_id: number;
  fields: {
    Name: string;
    ClassJobLevel0: number;
    JournalGenre?: {
      row_id: number;
      fields: {
        Name: string;
      };
    };
    PlaceName?: {
      row_id: number;
      fields: {
        Name: string;
      };
    };
    IssuerLocation?: {
      row_id: number;
      fields: {
        X: number;
        Y: number;
        Z: number;
      };
    };
  };
}

// V2 API sheet response structure
export interface XIVAPISheetResponse<T> {
  row_id: number;
  fields: T;
}

// V2 API search/list response structure
export interface XIVAPIListResponse<T> {
  results: XIVAPISheetResponse<T>[];
  count: number;
  page: number;
  pages: number;
}

export class XIVAPIClient {
  private client: AxiosInstance;
  private rateLimitMs: number;
  private lastRequestTime: number = 0;

  constructor(config: XIVAPIConfig = {}) {
    const { baseURL = XIVAPI_V2_BASE_URL, rateLimitMs = DEFAULT_RATE_LIMIT_MS } = config;

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Eorzea Quest Assistant / 0.1.0',
      },
    });

    this.rateLimitMs = rateLimitMs;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitMs - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new Error(
          `XIVAPI V2 Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`
        );
      } else if (axiosError.request) {
        throw new Error('XIVAPI V2 Error: No response received from server');
      }
    }
    throw new Error(`XIVAPI V2 Error: ${error}`);
  }

  // V2 API: Get quest by ID
  async getQuest(questId: number): Promise<XIVAPIQuest> {
    await this.rateLimit();

    try {
      const response = await this.client.get(`/api/sheet/Quest/${questId}`, {
        params: {
          fields: 'Name,ClassJobLevel0,JournalGenre.Name,PlaceName.Name,IssuerLocation.X,IssuerLocation.Y,IssuerLocation.Z'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // V2 API: List quests with optional filtering
  async getQuests(page: number = 1, limit: number = 100): Promise<XIVAPIListResponse<any>> {
    await this.rateLimit();

    try {
      const response = await this.client.get('/api/sheet/Quest', {
        params: {
          page,
          limit,
          fields: 'Name,ClassJobLevel0,JournalGenre.Name,PlaceName.Name'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // V2 API: Get quests by level range
  async getQuestsByLevel(minLevel: number, maxLevel?: number): Promise<XIVAPIListResponse<any>> {
    await this.rateLimit();

    try {
      const actualMaxLevel = maxLevel || minLevel + 5;
      const response = await this.client.get('/api/sheet/Quest', {
        params: {
          'filter[ClassJobLevel0][gte]': minLevel,
          'filter[ClassJobLevel0][lte]': actualMaxLevel,
          fields: 'Name,ClassJobLevel0,JournalGenre.Name,PlaceName.Name'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // V2 API: Search quests by name (simple text search)
  async searchQuests(query: string): Promise<XIVAPIListResponse<any>> {
    await this.rateLimit();

    try {
      const response = await this.client.get('/api/sheet/Quest', {
        params: {
          'filter[Name][contains]': query,
          fields: 'Name,ClassJobLevel0,JournalGenre.Name,PlaceName.Name'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

// Export singleton instance
let apiClientInstance: XIVAPIClient | null = null;

export function getXIVAPIClient(config?: XIVAPIConfig): XIVAPIClient {
  if (!apiClientInstance) {
    apiClientInstance = new XIVAPIClient(config);
  }
  return apiClientInstance;
}

export function resetXIVAPIClient(): void {
  apiClientInstance = null;
}
