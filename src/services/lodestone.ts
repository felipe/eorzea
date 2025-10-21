import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

const LODESTONE_BASE_URL = 'https://na.finalfantasyxiv.com/lodestone';
const DEFAULT_RATE_LIMIT_MS = 1000; // 1 request per second to be respectful

export interface LodestoneCharacter {
  id: string;
  name: string;
  server: string;
  avatar: string;
  title?: string;
  level?: number;
  job?: string;
  freeCompany?: string;
  dataCenter?: string;
}

export interface LodestoneSearchResult {
  characters: LodestoneCharacter[];
  totalResults?: number;
  page?: number;
}

export class LodestoneClient {
  private client: AxiosInstance;
  private rateLimitMs: number;
  private lastRequestTime: number = 0;

  constructor(rateLimitMs: number = DEFAULT_RATE_LIMIT_MS) {
    this.client = axios.create({
      baseURL: LODESTONE_BASE_URL,
      headers: {
        'User-Agent': 'Eorzea Quest Assistant / 0.1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000,
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

  async searchCharacter(name: string, server?: string): Promise<LodestoneSearchResult> {
    await this.rateLimit();

    try {
      const params: any = { q: name };
      if (server) {
        params.worldname = server;
      }

      const response = await this.client.get('/character/', { params });
      return this.parseCharacterSearchResults(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Lodestone search failed: ${error.message}`);
      }
      throw new Error(`Lodestone search failed: ${error}`);
    }
  }

  async getCharacter(characterId: string): Promise<LodestoneCharacter | null> {
    await this.rateLimit();

    try {
      const response = await this.client.get(`/character/${characterId}/`);
      return this.parseCharacterProfile(response.data, characterId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        }
        throw new Error(`Lodestone character fetch failed: ${error.message}`);
      }
      throw new Error(`Lodestone character fetch failed: ${error}`);
    }
  }

  private parseCharacterSearchResults(html: string): LodestoneSearchResult {
    const $ = cheerio.load(html);
    const characters: LodestoneCharacter[] = [];

    $('.ldst__window .entry').each((_, element) => {
      const $entry = $(element);

      // Extract character ID from profile link
      const profileLink = $entry.find('.entry__link').attr('href');
      const idMatch = profileLink?.match(/\/character\/(\d+)\//);
      if (!idMatch) return;

      const id = idMatch[1];
      const name = $entry.find('.entry__name').text().trim();
      const avatar = $entry.find('.entry__chara__face img').attr('src') || '';

      // Extract server info
      const serverInfo = $entry.find('.entry__world').text().trim();
      const serverMatch = serverInfo.match(/^([^(]+)(?:\(([^)]+)\))?/);
      const server = serverMatch?.[1]?.trim() || '';
      const dataCenter = serverMatch?.[2]?.trim();

      characters.push({
        id,
        name,
        server,
        avatar,
        dataCenter,
      });
    });

    return { characters };
  }

  private parseCharacterProfile(html: string, characterId: string): LodestoneCharacter {
    const $ = cheerio.load(html);

    const name = $('.frame__chara__name').text().trim();
    const title = $('.frame__chara__title').text().trim();
    const avatar = $('.frame__chara__face img').attr('src') || '';

    // Extract server info
    const serverInfo = $('.frame__chara__world').text().trim();
    const serverMatch = serverInfo.match(/^([^(]+)(?:\(([^)]+)\))?/);
    const server = serverMatch?.[1]?.trim() || '';
    const dataCenter = serverMatch?.[2]?.trim();

    // Extract job and level info
    const jobInfo = $('.character__class__data');
    let level: number | undefined;
    let job: string | undefined;

    if (jobInfo.length > 0) {
      const levelText = jobInfo.find('.character__class__lv').text().trim();
      const jobText = jobInfo.find('.character__class__name').text().trim();

      level = parseInt(levelText) || undefined;
      job = jobText || undefined;
    }

    // Extract Free Company
    const freeCompany = $('.character__freecompany__name a').text().trim() || undefined;

    return {
      id: characterId,
      name,
      server,
      avatar,
      title: title || undefined,
      level,
      job,
      freeCompany,
      dataCenter,
    };
  }
}

// Export singleton instance
let lodestoneClientInstance: LodestoneClient | null = null;

export function getLodestoneClient(rateLimitMs?: number): LodestoneClient {
  if (!lodestoneClientInstance) {
    lodestoneClientInstance = new LodestoneClient(rateLimitMs);
  }
  return lodestoneClientInstance;
}

export function resetLodestoneClient(): void {
  lodestoneClientInstance = null;
}