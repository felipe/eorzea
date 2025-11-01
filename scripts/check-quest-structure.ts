import { CSVParser } from '../src/parsers/csvParser.js';
import { join } from 'path';

const parser = new CSVParser(
  join(process.cwd(), 'data', 'game-schemas'),
  join(process.cwd(), 'data', 'game-csv'),
  { resolveForeignKeys: false }
);

const quests = parser.parseSheet('Quest');
const feastQuest = quests.get(65782);

console.log('\nAll Feast of Famine quest keys:');
console.log(Object.keys(feastQuest).join(', '));
