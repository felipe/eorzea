import axios, { AxiosInstance, AxiosError } from 'axios';

const XIVAPI_BASE_URL = 'https://xivapi.com';
const DEFAULT_RATE_LIMIT_MS = 100; // 10 requests per second

export interface XIVAPIConfig {
  apiKey?: string;
  baseURL?: string;
  rateLimitMs?: number;
}

export interface XIVAPIQuest {
  ID: number;
  Name: string;
  Level: number;
  ClassJobLevel0: number;
  JournalGenre: {
    ID: number;
    Name: string;
  };
  PlaceName: {
    ID: number;
    Name: string;
  };
  IssuerLocation: {
    X: number;
    Y: number;
    Z: number;
  };
  TargetLocation?: {
    X: number;
    Y: number;
    Z: number;
  };
}

export interface XIVAPICharacter {
  Character: {
    ID: number;
    Name: string;
    Server: string;
    DC: string;
    ActiveClassJob: {
      Level: number;
      Name: string;
    };
  };
}

export interface XIVAPISearchResult<T> {
  Pagination: {
    Page: number;
    PageNext?: number;
    PagePrev?: number;
    PageTotal: number;
    Results: number;
    ResultsPerPage: number;
    ResultsTotal: number;
  };
  Results: T[];
}

export class XIVAPIClient {
  private client: AxiosInstance;
  private rateLimitMs: number;
  private lastRequestTime: number = 0;

  constructor(config: XIVAPIConfig = {}) {
    const { apiKey, baseURL = XIVAPI_BASE_URL, rateLimitMs = DEFAULT_RATE_LIMIT_MS } = config;

    this.client = axios.create({
      baseURL,
      params: apiKey ? { private_key: apiKey } : {},
      headers: {
        'Content-Type': 'application/json',
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
          `XIVAPI Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`
        );
      } else if (axiosError.request) {
        throw new Error('XIVAPI Error: No response received from server');
      }
    }
    throw new Error(`XIVAPI Error: ${error}`);
  }

  async searchCharacter(name: string, server?: string): Promise<XIVAPISearchResult<any>> {
    await this.rateLimit();

    try {
      const params: any = { name };
      if (server) {
        params.server = server;
      }

      const response = await this.client.get('/character/search', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCharacter(characterId: number): Promise<XIVAPICharacter> {
    await this.rateLimit();

    try {
      const response = await this.client.get(`/character/${characterId}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async searchQuests(query: string, page: number = 1): Promise<XIVAPISearchResult<XIVAPIQuest>> {
    await this.rateLimit();

    try {
      const response = await this.client.get('/search', {
        params: {
          indexes: 'quest',
          string: query,
          page,
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getQuest(questId: number): Promise<XIVAPIQuest> {
    await this.rateLimit();

    try {
      const response = await this.client.get(`/quest/${questId}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getQuestsByLevel(level: number, page: number = 1): Promise<XIVAPISearchResult<XIVAPIQuest>> {
    await this.rateLimit();

    try {
      const response = await this.client.get('/search', {
        params: {
          indexes: 'quest',
          filters: `ClassJobLevel0>=${level},ClassJobLevel0<=${level + 5}`,
          page,
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getQuestsByLocation(locationId: number): Promise<XIVAPISearchResult<XIVAPIQuest>> {
    await this.rateLimit();

    try {
      const response = await this.client.get('/search', {
        params: {
          indexes: 'quest',
          filters: `PlaceNameID=${locationId}`,
        },
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
