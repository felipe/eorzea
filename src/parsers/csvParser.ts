/**
 * CSV Parser with Schema Support
 *
 * Parses CSV files using JSON schema definitions to map columns to field names
 * and resolve foreign key relationships (links to other sheets).
 *
 * This is a proof of concept that will be validated against existing fish data.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface SchemaDefinition {
  sheet: string;
  defaultColumn?: string;
  definitions: ColumnDefinition[];
}

export interface ColumnDefinition {
  index?: number;
  name: string;
  type?: 'str' | 'int32' | 'uint32' | 'int16' | 'uint16' | 'byte' | 'bool' | 'single';
  converter?: {
    type: 'link' | 'color' | 'icon' | 'multiref';
    target?: string; // For 'link' type: target sheet name
  };
  count?: number; // For repeat columns
  definition?: ColumnDefinition; // For nested definitions
}

export interface CSVParserOptions {
  resolveForeignKeys?: boolean; // Default: true
}

export class CSVParser {
  private schemas: Map<string, SchemaDefinition>;
  private cache: Map<string, Map<number, any>>;
  private schemaDir: string;
  private csvDir: string;
  private options: CSVParserOptions;

  constructor(schemaDir: string, csvDir: string, options: CSVParserOptions = {}) {
    this.schemas = new Map();
    this.cache = new Map();
    this.schemaDir = schemaDir;
    this.csvDir = csvDir;
    this.options = {
      resolveForeignKeys: options.resolveForeignKeys ?? true,
    };
  }

  /**
   * Parse a sheet by name
   * @param sheetName - Name of the sheet (e.g., "Quest")
   * @returns Map of row_id to parsed object
   */
  parseSheet(sheetName: string): Map<number, any> {
    // Check cache first
    if (this.cache.has(sheetName)) {
      return this.cache.get(sheetName)!;
    }

    // 1. Load schema
    const schema = this.loadSchema(sheetName);

    // 2. Load CSV
    const rows = this.loadCSV(sheetName);

    // 3. Parse each row
    const result = new Map<number, any>();
    for (const [key, row] of rows) {
      const parsed = this.parseRow(row, schema, key);
      result.set(key, parsed);
    }

    // Cache result
    this.cache.set(sheetName, result);
    return result;
  }

  private parseRow(row: string[], schema: SchemaDefinition, rowId: number): any {
    const obj: any = { id: rowId };

    for (const def of schema.definitions) {
      const value = this.parseColumn(row, def);
      obj[def.name] = value;
    }

    return obj;
  }

  private parseColumn(row: string[], def: ColumnDefinition): any {
    // Schema index maps to row[index + 1] because row[0] is the key
    const index = (def.index ?? 0) + 1;
    const rawValue = row[index] || '';

    // Handle foreign keys (links to other sheets)
    if (def.converter?.type === 'link') {
      const targetId = parseInt(rawValue);
      if (targetId === 0 || isNaN(targetId)) return null;

      // If foreign key resolution is disabled, just return the ID
      if (!this.options.resolveForeignKeys) {
        return targetId;
      }

      // Try to recursively parse linked sheet
      // If schema/csv doesn't exist, just return the raw ID
      try {
        const targetSheet = this.parseSheet(def.converter.target!);
        return targetSheet.get(targetId) || null;
      } catch (error) {
        // Schema or CSV not found, return raw ID instead
        return targetId;
      }
    }

    // Handle type conversion
    return this.convertType(rawValue, def.type);
  }

  private convertType(value: string, type?: string): any {
    if (!value || value === '') return null;

    switch (type) {
      case 'int32':
      case 'uint32':
      case 'int16':
      case 'uint16':
      case 'byte':
        return parseInt(value);
      case 'bool':
        return value === 'True' || value === 'true';
      case 'single':
        return parseFloat(value);
      case 'str':
      default:
        return value;
    }
  }

  private loadSchema(sheetName: string): SchemaDefinition {
    const schemaPath = join(this.schemaDir, `${sheetName}.json`);
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent) as SchemaDefinition;
    this.schemas.set(sheetName, schema);
    return schema;
  }

  private loadCSV(sheetName: string): Map<number, string[]> {
    const csvPath = join(this.csvDir, `${sheetName}.csv`);
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');

    const result = new Map<number, string[]>();

    // Skip header row (first row is column types/names)
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length === 0) continue;

      const key = parseInt(row[0]);
      if (isNaN(key)) continue;

      result.set(key, row);
    }

    return result;
  }

  /**
   * Parse a CSV line, handling quoted strings with commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }
}
