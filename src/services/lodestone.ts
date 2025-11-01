import { Character, CharacterSearch, ClassJob } from '@xivapi/nodestone';

export interface LodestoneCharacter {
  id: string;
  name: string;
  server: string;
  avatar?: string;
  title?: string;
  level?: number;
  job?: string;
  freeCompany?: string;
  dataCenter?: string;
  // Additional fields from nodestone
  [key: string]: any;
}

export interface LodestoneSearchResult {
  characters: LodestoneCharacter[];
  totalResults?: number;
  page?: number;
}

export class LodestoneClient {
  private characterParser: Character;
  private characterSearchParser: CharacterSearch;
  private classJobParser: ClassJob;

  constructor() {
    this.characterParser = new Character();
    this.characterSearchParser = new CharacterSearch();
    this.classJobParser = new ClassJob();
  }

  async searchCharacter(name: string, server?: string): Promise<LodestoneSearchResult> {
    try {
      // Create a mock Express request object
      // Note: nodestone expects 'name' and 'server' not 'q' and 'worldname'
      const mockReq: any = {
        query: {
          name: name,
        },
        params: {},
      };

      if (server) {
        mockReq.query.server = server;
      }

      const searchResults = await this.characterSearchParser.parse(mockReq) as any;

      // Transform nodestone results to our format
      const characters: LodestoneCharacter[] = [];

      if (searchResults && searchResults.List) {
        for (const result of searchResults.List) {
          characters.push({
            id: result.ID?.toString() || '',
            name: result.Name || '',
            server: result.World || '', // nodestone uses "World" not "Server"
            avatar: result.Avatar || '',
            dataCenter: result.DC || undefined,
          });
        }
      }

      return {
        characters,
        totalResults: searchResults?.Pagination?.PageTotal,
        page: searchResults?.Pagination?.Page,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Lodestone search failed: ${error.message}`);
      }
      throw new Error(`Lodestone search failed: ${error}`);
    }
  }

  async getCharacter(characterId: string): Promise<LodestoneCharacter | null> {
    try {
      // Create a mock Express request object with character ID
      const mockReq: any = {
        params: {
          characterId,
        },
        query: {},
      };

      const character = await this.characterParser.parse(mockReq) as any;

      if (!character) {
        return null;
      }

      // Transform nodestone character data to our format
      return {
        id: characterId,
        name: character.Name || '',
        server: character.World || '', // nodestone uses "World" not "Server"
        avatar: character.Avatar || '',
        title: character.Title || undefined,
        level: character.Level || undefined,
        job: character.Mainhand?.ClassList || undefined, // Active job from equipped mainhand
        freeCompany: character.FreeCompany?.Name || undefined,
        dataCenter: character.DC || undefined,
        // Include all other fields from nodestone
        ...character,
      };
    } catch (error) {
      if (error instanceof Error) {
        // Check for 404 errors
        if (error.message.includes('404')) {
          return null;
        }
        throw new Error(`Lodestone character fetch failed: ${error.message}`);
      }
      throw new Error(`Lodestone character fetch failed: ${error}`);
    }
  }

  async getCharacterClassJobs(characterId: string): Promise<any> {
    try {
      // Create a mock Express request object with character ID
      const mockReq: any = {
        params: {
          characterId,
        },
        query: {},
      };

      const classJobs = await this.classJobParser.parse(mockReq) as any;
      return classJobs;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Lodestone class/job fetch failed: ${error.message}`);
      }
      throw new Error(`Lodestone class/job fetch failed: ${error}`);
    }
  }
}

// Export singleton instance
let lodestoneClientInstance: LodestoneClient | null = null;

export function getLodestoneClient(): LodestoneClient {
  if (!lodestoneClientInstance) {
    lodestoneClientInstance = new LodestoneClient();
  }
  return lodestoneClientInstance;
}

export function resetLodestoneClient(): void {
  lodestoneClientInstance = null;
}
