/**
 * Tests for GatheringTrackerService
 */

import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { GatheringTrackerService } from '../../src/services/gatheringTracker';
import { join } from 'path';
import { existsSync } from 'fs';

describe('GatheringTrackerService', () => {
  let service: GatheringTrackerService;
  const testDbPath = join(process.cwd(), 'data', 'gathering.db');

  beforeAll(() => {
    // Ensure test database exists
    if (!existsSync(testDbPath)) {
      console.log('Test database not found. Run `npm run seed:gathering` first.');
      return;
    }
    service = new GatheringTrackerService(testDbPath);
  });

  afterAll(() => {
    if (service) {
      service.close();
    }
  });

  describe('getNodeById', () => {
    test('should return node by ID', () => {
      const node = service.getNodeById(1);
      expect(node).toBeTruthy();
      expect(node?._id).toBe(1);
      expect(node?.type).toBe('mining');
      expect(node?.level).toBe(1);
    });

    test('should return null for non-existent ID', () => {
      const node = service.getNodeById(99999);
      expect(node).toBeNull();
    });
  });

  describe('getNodeItems', () => {
    test('should return items for a node', () => {
      const items = service.getNodeItems(1);
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].nodeId).toBe(1);
      expect(items[0].slot).toBeDefined();
    });

    test('should return empty array for node without items', () => {
      const items = service.getNodeItems(99999);
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(0);
    });
  });

  describe('searchNodes', () => {
    test('should return all nodes with no filters', () => {
      const nodes = service.searchNodes();
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThan(0);
    });

    test('should filter by type', () => {
      const miningNodes = service.searchNodes({ type: 'mining' });
      expect(miningNodes.every((n) => n.type === 'mining')).toBe(true);

      const loggingNodes = service.searchNodes({ type: 'logging' });
      expect(loggingNodes.every((n) => n.type === 'logging')).toBe(true);
    });

    test('should filter by multiple types', () => {
      const nodes = service.searchNodes({ type: ['mining', 'logging'] });
      expect(nodes.every((n) => n.type === 'mining' || n.type === 'logging')).toBe(true);
    });

    test('should filter by level range', () => {
      const nodes = service.searchNodes({ minLevel: 10, maxLevel: 20 });
      expect(nodes.every((n) => n.level >= 10 && n.level <= 20)).toBe(true);
    });

    test('should filter by legendary status', () => {
      const legendaryNodes = service.searchNodes({ legendary: true });
      expect(legendaryNodes.every((n) => n.legendary === true)).toBe(true);
    });

    test('should filter by ephemeral status', () => {
      const ephemeralNodes = service.searchNodes({ ephemeral: true });
      expect(ephemeralNodes.every((n) => n.ephemeral === true)).toBe(true);
    });

    test('should apply limit', () => {
      const nodes = service.searchNodes({ limit: 5 });
      expect(nodes.length).toBeLessThanOrEqual(5);
    });

    test('should apply offset with limit', () => {
      const allNodes = service.searchNodes();
      const offsetNodes = service.searchNodes({ limit: 5, offset: 2 });
      if (allNodes.length > 2) {
        expect(offsetNodes[0]._id).toBe(allNodes[2]._id);
      }
    });
  });

  describe('getTimedNodes', () => {
    test('should return only timed nodes', () => {
      const timedNodes = service.getTimedNodes();
      expect(timedNodes.every((n) => n.startHour < 24)).toBe(true);
    });

    test('should filter timed nodes by type', () => {
      const timedMiningNodes = service.getTimedNodes('mining');
      expect(timedMiningNodes.every((n) => n.type === 'mining' && n.startHour < 24)).toBe(true);
    });
  });

  describe('getLegendaryNodes', () => {
    test('should return only legendary nodes', () => {
      const legendaryNodes = service.getLegendaryNodes();
      expect(legendaryNodes.every((n) => n.legendary === true)).toBe(true);
    });

    test('should filter legendary nodes by type', () => {
      const legendaryMiningNodes = service.getLegendaryNodes('mining');
      expect(legendaryMiningNodes.every((n) => n.type === 'mining' && n.legendary === true)).toBe(
        true
      );
    });
  });

  describe('getEphemeralNodes', () => {
    test('should return only ephemeral nodes', () => {
      const ephemeralNodes = service.getEphemeralNodes();
      expect(ephemeralNodes.every((n) => n.ephemeral === true)).toBe(true);
    });

    test('should filter ephemeral nodes by type', () => {
      const ephemeralMiningNodes = service.getEphemeralNodes('mining');
      expect(ephemeralMiningNodes.every((n) => n.type === 'mining' && n.ephemeral === true)).toBe(
        true
      );
    });
  });

  describe('getNodeWindow', () => {
    test('should return window information for always available node', () => {
      const node = service.getNodeById(1); // Always available node
      if (!node) throw new Error('Node not found');

      const window = service.getNodeWindow(node);
      expect(window.node).toBe(node);
      expect(window.isAvailableNow).toBe(true);
      expect(window.nextWindowStart).toBeUndefined();
      expect(window.nextWindowEnd).toBeUndefined();
    });

    test('should calculate window for timed node', () => {
      const node = service.getNodeById(8); // Timed node (1:00-3:00)
      if (!node) throw new Error('Node not found');

      const window = service.getNodeWindow(node);
      expect(window.node).toBe(node);
      // Window availability depends on current Eorzean time
      if (!window.isAvailableNow) {
        expect(window.nextWindowStart).toBeDefined();
        expect(window.minutesUntilAvailable).toBeDefined();
        expect(window.minutesUntilAvailable).toBeGreaterThan(0);
      }
    });
  });

  describe('getStats', () => {
    test('should return gathering statistics', () => {
      const stats = service.getStats();
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.nodesByType.mining).toBeGreaterThanOrEqual(0);
      expect(stats.nodesByType.logging).toBeGreaterThanOrEqual(0);
      expect(stats.legendaryNodes).toBeGreaterThanOrEqual(0);
      expect(stats.ephemeralNodes).toBeGreaterThanOrEqual(0);
      expect(stats.timedNodes).toBeGreaterThanOrEqual(0);
      expect(stats.alwaysAvailable).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getZoneName', () => {
    test('should return zone name', () => {
      const name = service.getZoneName(1);
      expect(name).toBe('Central Thanalan');
    });

    test('should return null for non-existent zone', () => {
      const name = service.getZoneName(99999);
      expect(name).toBeNull();
    });
  });

  describe('getItemName', () => {
    test('should return item name', () => {
      const name = service.getItemName(5104);
      expect(name).toBe('Copper Ore');
    });

    test('should return null for non-existent item', () => {
      const name = service.getItemName(99999);
      expect(name).toBeNull();
    });
  });
});
