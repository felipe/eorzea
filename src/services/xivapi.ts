// @ts-ignore - Using v2-upgrade branch from GitHub with source imports
import XIVAPI from '@xivapi/js/dist/index.js';

export interface XIVAPIConfig {
  version?: string;
  language?: 'en' | 'de' | 'fr' | 'ja';
  verbose?: boolean;
}

// Quest data structure from XIVAPI v2
export interface XIVAPIQuest {
  row_id: number;
  fields: {
    Name?: string;
    Icon?: {
      id: number;
      path: string;
      path_hr1?: string;
    };
    ClassJobLevel0?: number;
    JournalGenre?: {
      row_id: number;
      fields?: {
        Name?: string;
      };
    };
    PlaceName?: {
      row_id: number;
      fields?: {
        Name?: string;
      };
    };
    [key: string]: any;
  };
  sheet: string;
  score?: number;
}

export interface XIVAPISearchResult {
  results: XIVAPIQuest[];
  schema: string;
  next?: string | null;
}

export class XIVAPIClient {
  private client: XIVAPI;

  constructor(config: XIVAPIConfig = {}) {
    const { version = 'latest', language = 'en', verbose = false } = config;

    this.client = new XIVAPI({
      version,
      language,
      verbose,
    });
  }

  // Get quest by ID using the new v2 API
  async getQuest(questId: number): Promise<XIVAPIQuest> {
    try {
      // Use the data.sheets API to get a specific quest
      // Request all text fields by not specifying a fields filter
      const quest = await this.client.data.sheets().get('Quest', questId.toString());

      return {
        row_id: quest.row_id,
        fields: quest.fields,
        sheet: 'Quest', // Use the sheet name directly since response has 'schema' not 'sheet'
      } as XIVAPIQuest;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`XIVAPI Error: ${error.message}`);
      }
      throw new Error(`XIVAPI Error: ${error}`);
    }
  }

  // Search quests by name using v2 search API
  async searchQuests(query: string, limit: number = 10): Promise<XIVAPISearchResult> {
    try {
      // V2 uses a query language: Name~"searchterm"
      const searchResults = await this.client.search({
        query: `Name~"${query}"`,
        sheets: 'Quest',
        limit,
      });

      return {
        results: searchResults.results as XIVAPIQuest[],
        schema: searchResults.schema,
        next: searchResults.next,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`XIVAPI Error: ${error.message}`);
      }
      throw new Error(`XIVAPI Error: ${error}`);
    }
  }

  // Get quests by level range using v2 search with filters
  async getQuestsByLevel(minLevel: number, maxLevel?: number): Promise<XIVAPISearchResult> {
    try {
      const actualMaxLevel = maxLevel || minLevel + 5;

      // V2 uses query syntax for filtering
      const searchResults = await this.client.search({
        query: `ClassJobLevel0>=${minLevel} ClassJobLevel0<=${actualMaxLevel}`,
        sheets: 'Quest',
        limit: 100,
      });

      return {
        results: searchResults.results as XIVAPIQuest[],
        schema: searchResults.schema,
        next: searchResults.next,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`XIVAPI Error: ${error.message}`);
      }
      throw new Error(`XIVAPI Error: ${error}`);
    }
  }

  // Get list of quests (paginated)
  async getQuests(limit: number = 100): Promise<any> {
    try {
      const quests = await this.client.data.sheets().list('Quest', {
        limit,
      });
      return quests;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`XIVAPI Error: ${error.message}`);
      }
      throw new Error(`XIVAPI Error: ${error}`);
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
