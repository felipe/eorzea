/**
 * Super Basic Web Server for Eorzea Data
 * Mobile-optimized views for fish and quest tracking
 */

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FishTrackerService } from './services/fishTracker.js';
import { QuestTrackerService } from './services/questTracker.js';
import { ItemService } from './services/itemService.js';
import { GatheringNodeService } from './services/gatheringNodeService.js';
import { CraftingService } from './services/craftingService.js';
import { CollectiblesService } from './services/collectiblesService.js';
import {
  getEorzeanTime,
  isInTimeWindow,
  getNextWindowStart,
  getCurrentWindowEnd,
  formatTimeWindow,
} from './utils/eorzeanTime.js';
import { getPreviousWeatherPeriodStart, calculateWeather } from './utils/weatherForecast.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;

// Load OpenAPI spec
const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
const openapiSpec = yaml.load(fs.readFileSync(openapiPath, 'utf8')) as any;

const fishTracker = new FishTrackerService();
const questTracker = new QuestTrackerService();
const itemService = new ItemService();
const gatheringNodeService = new GatheringNodeService();
const craftingService = new CraftingService();
const collectiblesService = new CollectiblesService();

// Swagger UI for API documentation at /openapi
app.use(
  '/openapi',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'Eorzea API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

// Serve OpenAPI spec as JSON
app.get('/openapi.json', (_req, res) => {
  res.json(openapiSpec);
});

// Serve OpenAPI spec as YAML
app.get('/openapi.yaml', (_req, res) => {
  res.type('text/yaml');
  res.send(fs.readFileSync(openapiPath, 'utf8'));
});

// Serve static CSS
app.get('/style.css', (_req, res) => {
  res.type('text/css');
  res.send(`
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a2e;
      color: #eee;
      padding: 16px;
      padding-bottom: 60px;
      line-height: 1.6;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #4ecca3; margin-bottom: 20px; font-size: 1.8em; }
    h2 { color: #4ecca3; margin: 20px 0 10px; font-size: 1.2em; }
    a { color: #4ecca3; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .card {
      background: #16213e;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      border-left: 4px solid #4ecca3;
    }
    .card:hover {
      background: #1c2a4a;
    }
    .info-row { 
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #0f3460;
    }
    .info-row:last-child { border-bottom: none; }
    .label { color: #aaa; font-size: 0.9em; }
    .value { color: #fff; font-weight: 500; }
    .badge {
      display: inline-block;
      background: #0f3460;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      margin: 2px;
    }
    .big-fish { background: #ff6b6b; color: #fff; }
    .folklore { background: #9b59b6; color: #fff; }
    .search {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 2px solid #4ecca3;
      border-radius: 8px;
      background: #16213e;
      color: #fff;
      margin-bottom: 20px;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 16px;
      padding: 8px 16px;
      background: #0f3460;
      border-radius: 6px;
    }
    .time-widget {
      position: fixed;
      top: 16px;
      right: 16px;
      background: #ff6b6b;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.9em;
      font-weight: bold;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .objective {
      padding: 12px 0;
      border-bottom: 1px solid #0f3460;
    }
    .objective:last-child { border-bottom: none; }
    .objective-title {
      font-weight: bold;
      margin-bottom: 4px;
      font-size: 1.05em;
    }
    .objective-details {
      font-size: 0.9em;
      color: #aaa;
      margin-left: 20px;
      line-height: 1.8;
    }
    .quick-links {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }
    .quick-link {
      padding: 12px;
      background: #0f3460;
      border-radius: 6px;
      text-align: center;
      display: block;
    }
    .quick-link:hover {
      background: #16405e;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #aaa;
    }
  `);
});

// Serve Eorzean Time Clock JavaScript
app.get('/clock.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`
    // Eorzean Time Clock
    const EORZEA_MULTIPLIER = 3600 / 175; // 20.571428571...
    
    function updateEorzeanClock() {
      const now = new Date();
      const epochTime = now.getTime();
      const eorzeanMillis = epochTime * EORZEA_MULTIPLIER;
      
      const totalSeconds = Math.floor(eorzeanMillis / 1000);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      const timeString = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
      
      const clock = document.getElementById('et-clock');
      if (clock) {
        clock.textContent = '⏰ ET ' + timeString;
      }
    }
    
    // Start clock when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        updateEorzeanClock();
        setInterval(updateEorzeanClock, 1000);
      });
    } else {
      updateEorzeanClock();
      setInterval(updateEorzeanClock, 1000);
    }
  `);
});

// Home Page
app.get('/', (_req, res) => {
  const et = getEorzeanTime(new Date());
  const totalFish = fishTracker.getTotalCount();
  const bigFish = fishTracker.getBigFishCount();
  const totalQuests = questTracker.getTotalCount();

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <title>Eorzea Tracker</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
      <div class="container">
        <h1>🎮 Eorzea Tracker</h1>

        <div class="card">
          <h2>🎣 Fish Database</h2>
          <p style="color: #aaa; margin-bottom: 12px;">
            ${totalFish.toLocaleString()} total fish • ${bigFish.toLocaleString()} big fish
          </p>
          <input type="text" class="search" id="fishSearch" placeholder="Search fish by ID...">
          <div class="quick-links">
            <a href="/fish" class="quick-link">📋 Browse All</a>
            <a href="/fish?big=1" class="quick-link">⭐ Big Fish</a>
            <a href="/fish/available" class="quick-link">🕐 Available Now</a>
            <a href="/fish?folklore=1" class="quick-link">📚 Folklore</a>
          </div>
        </div>

        <div class="card">
          <h2>📜 Quest Database</h2>
          <p style="color: #aaa; margin-bottom: 12px;">
            ${totalQuests.toLocaleString()} total quests
          </p>
          <input type="text" class="search" id="questSearch" placeholder="Search quests by name...">
          <div class="quick-links">
            <a href="/quests" class="quick-link">📋 Browse All</a>
            <a href="/quests?level=50" class="quick-link">Level 50</a>
            <a href="/quests?level=60" class="quick-link">Level 60</a>
            <a href="/quests?level=70" class="quick-link">Level 70</a>
          </div>
        </div>

        <div class="card">
          <h2>📦 Items Database</h2>
          <p style="color: #aaa; margin-bottom: 12px;">
            Browse items, sources, and uses
          </p>
          <input type="text" class="search" id="itemSearch" placeholder="Search items by name...">
          <div class="quick-links">
            <a href="/items" class="quick-link">📋 Browse Items</a>
          </div>
        </div>

        <div class="card">
          <h2>⛏️ Gathering</h2>
          <p style="color: #aaa; margin-bottom: 12px;">
            Mining, Botany, and gathering nodes
          </p>
          <div class="quick-links">
            <a href="/gathering" class="quick-link">📋 Browse Nodes</a>
            <a href="/gathering?type=Mining" class="quick-link">⛏️ Mining</a>
            <a href="/gathering?type=Logging" class="quick-link">🪓 Logging</a>
            <a href="/gathering?type=Harvesting" class="quick-link">🌿 Harvesting</a>
          </div>
        </div>

        <div class="card">
          <h2>🔨 Crafting</h2>
          <p style="color: #aaa; margin-bottom: 12px;">
            Recipes for all crafting classes
          </p>
          <input type="text" class="search" id="recipeSearch" placeholder="Search recipes by name...">
          <div class="quick-links">
            <a href="/crafting" class="quick-link">📋 Browse Recipes</a>
            <a href="/crafting?craft_type=Carpenter" class="quick-link">🪚 CRP</a>
            <a href="/crafting?craft_type=Blacksmith" class="quick-link">⚒️ BSM</a>
            <a href="/crafting?craft_type=Culinarian" class="quick-link">🍳 CUL</a>
          </div>
        </div>

        <div class="card">
          <h2>🎨 Collectibles</h2>
          <p style="color: #aaa; margin-bottom: 12px;">
            Mounts, minions, and orchestrion rolls
          </p>
          <div class="quick-links">
            <a href="/mounts" class="quick-link">🐴 Mounts</a>
            <a href="/companions" class="quick-link">🐾 Minions</a>
            <a href="/orchestrion" class="quick-link">🎵 Orchestrion</a>
            <a href="/collection" class="quick-link">📊 Collection Stats</a>
          </div>
        </div>

        <div class="card">
          <h2>ℹ️ About</h2>
          <p style="color: #aaa; font-size: 0.9em;">
            Offline-first FFXIV tracker. All data stored locally on your device.
          </p>
        </div>
      </div>

      <script src="/clock.js"></script>
      <script>
        // Page-specific search handlers
        document.getElementById('fishSearch').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const val = e.target.value.trim();
            if (!isNaN(val) && val !== '') {
              window.location = '/fish/' + val;
            } else {
              window.location = '/fish';
            }
          }
        });
        document.getElementById('questSearch').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            window.location = '/quests?search=' + encodeURIComponent(e.target.value);
          }
        });
        document.getElementById('itemSearch').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            window.location = '/items?name=' + encodeURIComponent(e.target.value);
          }
        });
        document.getElementById('recipeSearch').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            window.location = '/crafting?item=' + encodeURIComponent(e.target.value);
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Fish List
app.get('/fish', (req, res) => {
  try {
    const bigOnly = req.query.big === '1';
    const folkloreOnly = req.query.folklore === '1';
    const patch = req.query.patch;

    // Call service directly (same as JSON API)
    const options: any = {
      bigFishOnly: bigOnly,
      requiresFolklore: folkloreOnly,
      patch: patch ? parseFloat(patch as string) : undefined,
      limit: 100,
      offset: 0,
    };

    const fish = fishTracker.searchFish(options);
    const et = getEorzeanTime(new Date());

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Fish - Eorzea Tracker</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
      <div class="container">
        <a href="/" class="back-link">← Home</a>
        <h1>🎣 Fish ${bigOnly ? '(Big Fish)' : folkloreOnly ? '(Folklore)' : ''}</h1>
        
        <p style="color: #aaa; margin-bottom: 16px;">
          Showing ${fish.length} fish
        </p>

        ${
          fish.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 3em; margin-bottom: 16px;">🐟</div>
            <p>No fish found</p>
          </div>
        `
            : ''
        }
        
        ${fish
          .map(
            (f) => `
          <div class="card">
            <a href="/fish/${f._id}" style="font-size: 1.1em; font-weight: bold;">
              ${f.name || `Fish ID ${f._id}`}
            </a>
            <div style="margin-top: 8px;">
              ${f.bigFish ? '<span class="badge big-fish">⭐ BIG FISH</span>' : ''}
              ${f.folklore ? '<span class="badge folklore">📚 Folklore</span>' : ''}
              ${f.fishEyes ? '<span class="badge">👁️ Fish Eyes</span>' : ''}
              <span class="badge">📦 Patch ${f.patch}</span>
            </div>
            <div style="margin-top: 8px; font-size: 0.9em; color: #aaa;">
              ⏰ ${f.startHour}:00 - ${f.endHour}:00 ET
              ${f.hookset ? `• ${f.hookset}` : ''}
              ${f.tug ? `• ${f.tug === 'heavy' ? '!!!' : f.tug === 'medium' ? '!!' : '!'}` : ''}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      <script src="/clock.js"></script>
    </body>
    </html>
  `);
  } catch (error) {
    res.status(500).send(`
      <html><body><h1>Error loading fish data</h1><p>${String(error)}</p></body></html>
    `);
  }
});

// Available Fish
app.get('/fish/available', (_req, res) => {
  try {
    // Call service directly (same as JSON API)
    const now = new Date();
    const et = getEorzeanTime(now);
    const fish = fishTracker.getAvailableFish(now);

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Available Fish - Eorzea Tracker</title>
      <link rel="stylesheet" href="/style.css">
      <meta http-equiv="refresh" content="60">
    </head>
    <body>
      <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
      <div class="container">
        <a href="/" class="back-link">← Home</a>
        <h1>🕐 Available Now</h1>
        
        <p style="color: #aaa; margin-bottom: 16px;">
          ${fish.length} fish available at current Eorzean time
          <br><small>Page auto-refreshes every minute</small>
        </p>

        ${
          fish.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 3em; margin-bottom: 16px;">😴</div>
            <p>No fish available right now</p>
          </div>
        `
            : ''
        }
        
        ${fish
          .slice(0, 50)
          .map(
            (f) => `
          <div class="card">
            <a href="/fish/${f._id}" style="font-size: 1.1em; font-weight: bold;">
              ${f.name || `Fish ID ${f._id}`}
            </a>
            <div style="margin-top: 8px;">
              ${f.bigFish ? '<span class="badge big-fish">⭐ BIG FISH</span>' : ''}
              ${f.folklore ? '<span class="badge folklore">📚 Folklore</span>' : ''}
              <span class="badge">📦 Patch ${f.patch}</span>
            </div>
            <div style="margin-top: 8px; font-size: 0.9em; color: #aaa;">
              ⏰ ${f.startHour}:00 - ${f.endHour}:00 ET
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      <script src="/clock.js"></script>
    </body>
    </html>
  `);
  } catch (error) {
    res.status(500).send(`
      <html><body><h1>Error loading available fish</h1><p>${String(error)}</p></body></html>
    `);
  }
});

// Fish Detail
app.get('/fish/:id', (req, res) => {
  try {
    const fishId = parseInt(req.params.id);
    // Call service directly (same as JSON API)
    const fish = fishTracker.getFishById(fishId);
    const quests = questTracker.getQuestsRequiringFish(fishId);

    // Calculate availability (considering time AND weather)
    const now = new Date();
    const et = getEorzeanTime(now);

    // Check if time window matches
    const timeMatches = isInTimeWindow(et.hours, fish?.startHour || 0, fish?.endHour || 0);

    // Check if weather matches (if fish has weather requirements)
    let weatherMatches = true;
    let currentWeather: number | null = null;
    let previousWeather: number | null = null;

    if (fish && (fish.weatherSet.length > 0 || fish.previousWeatherSet.length > 0)) {
      currentWeather = fishTracker.getCurrentWeather(fish);

      // Check current weather requirement
      if (fish.weatherSet.length > 0 && currentWeather !== null) {
        weatherMatches = fish.weatherSet.includes(currentWeather);
      }

      // Check previous weather requirement
      if (weatherMatches && fish.previousWeatherSet.length > 0 && fish.location) {
        const weatherRates = fishTracker.getWeatherRatesForSpot(fish.location);
        if (weatherRates) {
          const prevPeriodStart = getPreviousWeatherPeriodStart(now);
          previousWeather = calculateWeather(prevPeriodStart, weatherRates);
          if (previousWeather !== null) {
            weatherMatches = weatherMatches && fish.previousWeatherSet.includes(previousWeather);
          } else {
            weatherMatches = false;
          }
        }
      }
    }

    const isAvailable = timeMatches && weatherMatches;

    // Get next available time (considering weather)
    const nextStart = fish ? fishTracker.getNextAvailableWindow(fish, now) : null;
    const currentEnd =
      fish && isAvailable ? getCurrentWindowEnd(fish.startHour, fish.endHour, now) : null;

    if (!fish) {
      return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Fish Not Found - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="container">
          <a href="/fish" class="back-link">← Back to Fish</a>
          <div class="empty-state">
            <div style="font-size: 3em; margin-bottom: 16px;">🐟</div>
            <h1>Fish Not Found</h1>
            <p>Fish ID ${fishId} doesn't exist</p>
          </div>
        </div>
        <script src="/clock.js"></script>
      </body>
      </html>
    `);
    }

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${fish.name || `Fish ${fish._id}`} - Eorzea Tracker</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
      <div class="container">
        <a href="/fish" class="back-link">← Back to Fish</a>
        <h1>🎣 ${fish.name || `Fish ${fish._id}`}</h1>
        
        <div class="card">
          <div>
            ${fish.bigFish ? '<span class="badge big-fish">⭐ BIG FISH</span>' : ''}
            ${fish.folklore ? '<span class="badge folklore">📚 Folklore</span>' : ''}
            ${fish.fishEyes ? '<span class="badge">👁️ Fish Eyes</span>' : ''}
            ${fish.snagging ? '<span class="badge">🎣 Snagging</span>' : ''}
            ${fish.collectable ? '<span class="badge">💎 Collectable</span>' : ''}
            <span class="badge">📦 Patch ${fish.patch}</span>
          </div>
        </div>

        <div class="card" style="border-left-color: ${isAvailable ? '#4ecca3' : '#ff6b6b'}">
          <h2 style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.5em;">${isAvailable ? '✓' : '⏰'}</span>
            ${isAvailable ? 'Available Now' : 'Not Available'}
          </h2>
          <div style="margin-top: 12px; font-size: 0.95em;">
            <div style="color: #aaa; margin-bottom: 4px;">Time Window: ${fish.startHour}:00 - ${fish.endHour}:00 ET</div>
            ${
              currentWeather !== null
                ? `<div style="color: #aaa; margin-bottom: 4px;">Current Weather: ${fishTracker.getWeatherName(currentWeather)}</div>`
                : ''
            }
            ${
              isAvailable && currentEnd
                ? `<div style="color: #4ecca3; font-weight: 500;">Window closes at ${currentEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (real time)</div>`
                : ''
            }
            ${
              !isAvailable && nextStart
                ? `<div style="color: #ff6b6b; font-weight: 500;">Next available at ${nextStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (real time)</div>`
                : ''
            }
          </div>
        </div>

        <div class="card">
          <h2>Catch Details</h2>
          ${
            fish.hookset
              ? `
          <div class="info-row">
            <span class="label">🪝 Hookset</span>
            <span class="value">${fish.hookset}</span>
          </div>
          `
              : ''
          }
          ${
            fish.tug
              ? `
          <div class="info-row">
            <span class="label">💪 Tug</span>
            <span class="value">${fish.tug === 'heavy' ? '!!! (Heavy)' : fish.tug === 'medium' ? '!! (Medium)' : '! (Light)'}</span>
          </div>
          `
              : ''
          }
          ${
            fish.weatherSet && fish.weatherSet.length > 0
              ? `
          <div class="info-row">
            <span class="label">🌤️ Weather</span>
            <span class="value">${fish.weatherSet.map((w) => fishTracker.getWeatherName(w) || `Weather ${w}`).join(', ')}</span>
          </div>
          `
              : ''
          }
          ${
            fish.previousWeatherSet && fish.previousWeatherSet.length > 0
              ? `
          <div class="info-row">
            <span class="label">🌥️ Previous Weather</span>
            <span class="value">${fish.previousWeatherSet.map((w) => fishTracker.getWeatherName(w) || `Weather ${w}`).join(', ')}</span>
          </div>
          `
              : ''
          }
          ${
            fish.bestCatchPath && fish.bestCatchPath.length > 0
              ? `
          <div class="info-row">
            <span class="label">🎣 Bait Chain</span>
            <span class="value">${fish.bestCatchPath.map((b) => fishTracker.getItemName(b) || `Bait ${b}`).join(' → ')}</span>
          </div>
          `
              : ''
          }
          ${
            fish.intuitionLength
              ? `
          <div class="info-row">
            <span class="label">💡 Intuition Length</span>
            <span class="value">${fish.intuitionLength} seconds</span>
          </div>
          `
              : ''
          }
        </div>

        ${
          fish.predators && fish.predators.length > 0
            ? `
        <div class="card">
          <h2>Predators</h2>
          <p style="color: #aaa;">
            Required for intuition: ${fish.predators.join(', ')}
          </p>
        </div>
        `
            : ''
        }

        ${
          fish.aquarium
            ? `
        <div class="card">
          <h2>🐠 Aquarium</h2>
          <div class="info-row">
            <span class="label">Water Type</span>
            <span class="value">${fish.aquarium.water}</span>
          </div>
          <div class="info-row">
            <span class="label">Size</span>
            <span class="value">${fish.aquarium.size}</span>
          </div>
         </div>
         `
            : ''
        }

         ${
           quests.length > 0
             ? `
         <div class="card">
           <h2>📜 Used in Quests</h2>
           <p style="color: #aaa; margin-bottom: 12px;">
             This fish is required for ${quests.length} quest${quests.length > 1 ? 's' : ''}
           </p>
           ${quests
             .map(
               (q) => `
             <div style="padding: 8px 0; border-bottom: 1px solid #0f3460;">
               <a href="/quest/${q.id}" style="font-weight: bold; color: #4ecca3;">
                 ${q.name}
               </a>
               <div style="font-size: 0.9em; color: #aaa; margin-top: 4px;">
                 Level ${q.level}${q.isRepeatable ? ' • Repeatable' : ''}
               </div>
             </div>
           `
             )
             .join('')}
         </div>
         `
             : ''
         }
       </div>
       <script src="/clock.js"></script>
     </body>
     </html>
   `);
  } catch (error) {
    res.status(500).send(`
      <html><body><h1>Error loading fish details</h1><p>${String(error)}</p></body></html>
    `);
  }
});

// Quest List
app.get('/quests', (req, res) => {
  try {
    const search = req.query.search as string;
    const level = req.query.level ? parseInt(req.query.level as string) : undefined;

    // Call service directly (same as JSON API)
    const options: any = {
      name: search,
      minLevel: level ? level - 2 : undefined,
      maxLevel: level ? level + 2 : undefined,
      limit: 100,
      offset: 0,
    };

    const quests = questTracker.searchQuests(options);
    const et = getEorzeanTime(new Date());

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Quests - Eorzea Tracker</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
      <div class="container">
        <a href="/" class="back-link">← Home</a>
        <h1>📜 Quests ${search ? `"${search}"` : level ? `(Level ${level})` : ''}</h1>
        
        <p style="color: #aaa; margin-bottom: 16px;">
          Showing ${quests.length} quests
        </p>

        ${
          quests.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 3em; margin-bottom: 16px;">📜</div>
            <p>No quests found</p>
          </div>
        `
            : ''
        }
        
        ${quests
          .map(
            (q) => `
          <div class="card">
            <a href="/quest/${q.id}" style="font-size: 1.1em; font-weight: bold;">
              ${q.name}
            </a>
            <div style="margin-top: 4px; color: #aaa; font-size: 0.9em;">
              Level ${q.level + (q.levelOffset || 0)}
              ${q.objectives && q.objectives.length > 0 ? ` • ${q.objectives.length} objectives` : ''}
              ${q.isRepeatable ? ' • 🔄 Repeatable' : ''}
            </div>
            ${
              q.gilReward
                ? `
              <div style="margin-top: 4px; color: #ffd700; font-size: 0.9em;">
                💰 ${q.gilReward.toLocaleString()} gil
              </div>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
      <script src="/clock.js"></script>
    </body>
    </html>
  `);
  } catch (error) {
    res.status(500).send(`
      <html><body><h1>Error loading quests</h1><p>${String(error)}</p></body></html>
    `);
  }
});

// Quest Detail
app.get('/quest/:id', (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    // Call service directly (same as JSON API)
    const quest = questTracker.getQuestById(questId);

    if (!quest) {
      return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Quest Not Found - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="container">
          <a href="/quests" class="back-link">← Back to Quests</a>
          <div class="empty-state">
            <div style="font-size: 3em; margin-bottom: 16px;">📜</div>
            <h1>Quest Not Found</h1>
            <p>Quest ID ${questId} doesn't exist</p>
          </div>
        </div>
        <script src="/clock.js"></script>
      </body>
      </html>
    `);
    }

    const et = getEorzeanTime(new Date());

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${quest.name} - Eorzea Tracker</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
      <div class="container">
        <a href="/quests" class="back-link">← Back to Quests</a>
        <h1>📜 ${quest.name}</h1>
        
        <div class="card">
          <h2>Info</h2>
          <div class="info-row">
            <span class="label">Level</span>
            <span class="value">${quest.level + (quest.levelOffset || 0)}</span>
          </div>
          ${
            quest.gilReward
              ? `
          <div class="info-row">
            <span class="label">💰 Gil Reward</span>
            <span class="value">${quest.gilReward.toLocaleString()}</span>
          </div>
          `
              : ''
          }
          ${
            quest.expFactor
              ? `
          <div class="info-row">
            <span class="label">✨ Exp Factor</span>
            <span class="value">${quest.expFactor}</span>
          </div>
          `
              : ''
          }
          <div class="info-row">
            <span class="label">Repeatable</span>
            <span class="value">${quest.isRepeatable ? '✅ Yes' : '❌ No'}</span>
          </div>
          <div class="info-row">
            <span class="label">Can Cancel</span>
            <span class="value">${quest.canCancel ? '✅ Yes' : '❌ No'}</span>
          </div>
          ${
            quest.journalGenreId
              ? `
          <div class="info-row">
            <span class="label">Type ID</span>
            <span class="value">${quest.journalGenreId}</span>
          </div>
          `
              : ''
          }
        </div>

        ${
          quest.previousQuests && quest.previousQuests.length > 0
            ? `
        <div class="card">
          <h2>Prerequisites</h2>
          ${quest.previousQuests
            .map((prereqId) => {
              const prereq = questTracker.getQuestById(prereqId);
              return `
              <div style="padding: 8px 0;">
                ${
                  prereq
                    ? `
                  <a href="/quest/${prereqId}">${prereq.name}</a>
                `
                    : `Quest ${prereqId}`
                }
              </div>
            `;
            })
            .join('')}
        </div>
        `
            : ''
        }

        ${
          quest.objectives && quest.objectives.length > 0
            ? `
        <div class="card">
          <h2>Objectives</h2>
          ${quest.objectives
            .map(
              (obj) => `
            <div class="objective">
              <div class="objective-title">
                ${obj.index}. ${obj.type === 'fish' ? '🎣' : obj.type === 'npc' ? '💬' : obj.type === 'enemy' ? '⚔️' : obj.type === 'item' ? '📦' : '🔍'} 
                ${obj.targetName}
                ${obj.quantity > 1 ? ` (x${obj.quantity})` : ''}
              </div>
              ${
                obj.details?.fish
                  ? `
                <div class="objective-details">
                  📍 ${obj.details.fish.locationName}<br>
                  ⏰ ${obj.details.fish.timeWindow}<br>
                  ${obj.details.fish.weather && obj.details.fish.weather.length > 0 ? `🌤️ ${obj.details.fish.weather.join(', ')}<br>` : ''}
                  ${obj.details.fish.previousWeather && obj.details.fish.previousWeather.length > 0 ? `🌥️ Previous: ${obj.details.fish.previousWeather.join(', ')}<br>` : ''}
                  ${obj.details.fish.baitChain && obj.details.fish.baitChain.length > 0 ? `🎣 ${obj.details.fish.baitChain.join(' → ')}<br>` : ''}
                  🪝 ${obj.details.fish.hookset} • ${obj.details.fish.tug === 'heavy' ? '!!!' : obj.details.fish.tug === 'medium' ? '!!' : '!'}<br>
                  <a href="/fish/${obj.targetId}">→ View Full Fish Details</a>
                </div>
              `
                  : ''
              }
              ${
                obj.details?.npc
                  ? `
                <div class="objective-details">
                  NPC ID: ${obj.details.npc.npcId}
                </div>
              `
                  : ''
              }
              ${
                obj.details?.enemy
                  ? `
                <div class="objective-details">
                  Enemy ID: ${obj.details.enemy.enemyId}
                </div>
              `
                  : ''
              }
              ${
                obj.details?.item
                  ? `
                <div class="objective-details">
                  Item ID: ${obj.details.item.itemId}
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
        `
            : ''
        }
      </div>
      <script src="/clock.js"></script>
    </body>
    </html>
  `);
  } catch (error) {
    res.status(500).send(`
      <html><body><h1>Error loading quest details</h1><p>${String(error)}</p></body></html>
    `);
  }
});

// ============================================================================
// API ROUTES - Fish
// ============================================================================

/**
 * @openapi
 * /api/fish:
 *   get:
 *     summary: Search and filter fish
 *     description: Returns a paginated list of fish with optional filters for big fish, folklore, and patch
 *     tags:
 *       - Fish
 *     parameters:
 *       - in: query
 *         name: big
 *         schema:
 *           type: string
 *           enum: ['1', 'true']
 *         description: Filter for big fish only
 *       - in: query
 *         name: folklore
 *         schema:
 *           type: string
 *           enum: ['1', 'true']
 *         description: Filter for folklore fish only
 *       - in: query
 *         name: patch
 *         schema:
 *           type: number
 *         description: Filter by patch number (e.g., 6.0, 6.5)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip for pagination
 *     responses:
 *       200:
 *         description: List of fish matching the criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       500:
 *         description: Server error
 */
app.get('/api/fish', (req, res) => {
  try {
    const options: any = {
      bigFishOnly: req.query.big === '1' || req.query.big === 'true',
      requiresFolklore: req.query.folklore === '1' || req.query.folklore === 'true',
      patch: req.query.patch ? parseFloat(req.query.patch as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = fishTracker.searchFish(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search fish', message: String(error) });
  }
});

/**
 * @openapi
 * /api/fish/available:
 *   get:
 *     summary: Get currently available fish
 *     description: Returns fish that are available to catch at the current Eorzean time, considering time windows and weather conditions
 *     tags:
 *       - Fish
 *     responses:
 *       200:
 *         description: List of currently available fish
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eorzeanTime:
 *                   type: object
 *                   properties:
 *                     hours:
 *                       type: integer
 *                     minutes:
 *                       type: integer
 *                 availableFish:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
app.get('/api/fish/available', (req, res) => {
  try {
    const now = new Date();
    const et = getEorzeanTime(now);
    const availableFish = fishTracker.getAvailableFish(now);

    res.json({
      eorzeanTime: {
        hours: et.hours,
        minutes: et.minutes,
      },
      availableFish,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get available fish', message: String(error) });
  }
});

/**
 * @openapi
 * /api/fish/{id}:
 *   get:
 *     summary: Get fish by ID
 *     description: Returns detailed information about a specific fish
 *     tags:
 *       - Fish
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Fish ID
 *     responses:
 *       200:
 *         description: Fish details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 patch:
 *                   type: number
 *                 location:
 *                   type: object
 *                 startHour:
 *                   type: integer
 *                 endHour:
 *                   type: integer
 *                 weatherSet:
 *                   type: array
 *                 bigFish:
 *                   type: boolean
 *                 folklore:
 *                   type: boolean
 *       404:
 *         description: Fish not found
 *       500:
 *         description: Server error
 */
app.get('/api/fish/:id', (req, res) => {
  try {
    const fishId = parseInt(req.params.id);
    const fish = fishTracker.getFishById(fishId);

    if (!fish) {
      return res.status(404).json({ error: 'Fish not found' });
    }

    res.json(fish);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get fish', message: String(error) });
  }
});

// ============================================================================
// API ROUTES - Quests
// ============================================================================

/**
 * @openapi
 * /api/quests:
 *   get:
 *     summary: Search quests
 *     description: Search and filter quests by name, level, expansion, and other criteria
 *     tags:
 *       - Quests
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by quest name (partial match)
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *         description: Filter by exact level
 *       - in: query
 *         name: minLevel
 *         schema:
 *           type: integer
 *         description: Minimum quest level
 *       - in: query
 *         name: maxLevel
 *         schema:
 *           type: integer
 *         description: Maximum quest level
 *       - in: query
 *         name: expansionId
 *         schema:
 *           type: integer
 *         description: Filter by expansion ID
 *       - in: query
 *         name: isRepeatable
 *         schema:
 *           type: boolean
 *         description: Filter for repeatable quests
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: List of quests matching criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
app.get('/api/quests', (req, res) => {
  try {
    const options: any = {
      name: req.query.name as string,
      level: req.query.level ? parseInt(req.query.level as string) : undefined,
      minLevel: req.query.minLevel ? parseInt(req.query.minLevel as string) : undefined,
      maxLevel: req.query.maxLevel ? parseInt(req.query.maxLevel as string) : undefined,
      expansionId: req.query.expansionId ? parseInt(req.query.expansionId as string) : undefined,
      isRepeatable:
        req.query.isRepeatable === 'true'
          ? true
          : req.query.isRepeatable === 'false'
            ? false
            : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const quests = questTracker.searchQuests(options);
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search quests', message: String(error) });
  }
});

/**
 * @openapi
 * /api/quests/{id}:
 *   get:
 *     summary: Get quest by ID
 *     description: Returns detailed information about a specific quest including embedded objectives
 *     tags:
 *       - Quests
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Quest ID
 *     responses:
 *       200:
 *         description: Quest details with objectives
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 level:
 *                   type: integer
 *                 objectives:
 *                   type: array
 *                 gilReward:
 *                   type: integer
 *                 isRepeatable:
 *                   type: boolean
 *       404:
 *         description: Quest not found
 *       500:
 *         description: Server error
 */
app.get('/api/quests/:id', (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const quest = questTracker.getQuestById(questId);

    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    res.json(quest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get quest', message: String(error) });
  }
});

// ============================================================================
// API ROUTES - Items
// ============================================================================

/**
 * @openapi
 * /api/items:
 *   get:
 *     summary: Search items
 *     description: Search and filter items by name, level, rarity, and category with pagination
 *     tags:
 *       - Items
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by item name (partial match)
 *       - in: query
 *         name: level_min
 *         schema:
 *           type: integer
 *         description: Minimum item level
 *       - in: query
 *         name: level_max
 *         schema:
 *           type: integer
 *         description: Maximum item level
 *       - in: query
 *         name: rarity
 *         schema:
 *           type: integer
 *         description: Item rarity (1-7)
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Item UI category ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Search results with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       500:
 *         description: Server error
 */
app.get('/api/items', (req, res) => {
  try {
    const options = {
      name: req.query.name as string,
      level_min: req.query.level_min ? parseInt(req.query.level_min as string) : undefined,
      level_max: req.query.level_max ? parseInt(req.query.level_max as string) : undefined,
      rarity: req.query.rarity ? parseInt(req.query.rarity as string) : undefined,
      category: req.query.category ? parseInt(req.query.category as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = itemService.searchItems(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search items', message: String(error) });
  }
});

/**
 * @openapi
 * /api/items/{id}:
 *   get:
 *     summary: Get item by ID
 *     description: Returns detailed information about a specific item
 *     tags:
 *       - Items
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
app.get('/api/items/:id', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const item = itemService.getItemById(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get item', message: String(error) });
  }
});

/**
 * @openapi
 * /api/items/{id}/guide:
 *   get:
 *     summary: Get item hunting/obtaining guide
 *     description: Returns comprehensive guide on how to obtain an item including all sources
 *     tags:
 *       - Items
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item guide with obtaining methods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
app.get('/api/items/:id/guide', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const guide = itemService.getItemGuide(itemId);

    if (!guide) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(guide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get item guide', message: String(error) });
  }
});

/**
 * @openapi
 * /api/items/{id}/sources:
 *   get:
 *     summary: Get item sources
 *     description: Returns all ways to obtain an item (crafting, gathering, vendors, etc.)
 *     tags:
 *       - Items
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       200:
 *         description: List of item sources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
app.get('/api/items/:id/sources', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const sources = itemService.getItemSources(itemId);
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get item sources', message: String(error) });
  }
});

/**
 * @openapi
 * /api/items/{id}/uses:
 *   get:
 *     summary: Get item uses
 *     description: Returns all uses for an item (recipes, quests, etc.)
 *     tags:
 *       - Items
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       200:
 *         description: List of item uses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
app.get('/api/items/:id/uses', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const uses = itemService.getItemUses(itemId);
    res.json(uses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get item uses', message: String(error) });
  }
});

/**
 * @openapi
 * /api/items/categories:
 *   get:
 *     summary: Get all item categories
 *     description: Returns list of all item UI categories for filtering
 *     tags:
 *       - Items
 *     responses:
 *       200:
 *         description: List of item categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
app.get('/api/items/categories', (_req, res) => {
  try {
    const categories = itemService.getItemCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get item categories', message: String(error) });
  }
});

// ============================================================================
// API ROUTES - Gathering
// ============================================================================

/**
 * @openapi
 * /api/gathering/points:
 *   get:
 *     summary: Search gathering points
 *     description: Search and filter gathering points (mining/botany nodes) by type, level, location, and item
 *     tags:
 *       - Gathering
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Gathering type (Mining, Botany, etc.)
 *       - in: query
 *         name: level_min
 *         schema:
 *           type: integer
 *         description: Minimum gathering level
 *       - in: query
 *         name: level_max
 *         schema:
 *           type: integer
 *         description: Maximum gathering level
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location/place name
 *       - in: query
 *         name: item
 *         schema:
 *           type: string
 *         description: Item name available at the node
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Search results with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       500:
 *         description: Server error
 */
app.get('/api/gathering/points', (req, res) => {
  try {
    const nodes = gatheringNodeService.searchNodes({
      type: req.query.type as string,
      minLevel: req.query.level_min ? parseInt(req.query.level_min as string) : undefined,
      maxLevel: req.query.level_max ? parseInt(req.query.level_max as string) : undefined,
      location: req.query.location as string,
      itemName: req.query.item as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    });

    res.json({ nodes, total: nodes.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search gathering nodes', message: String(error) });
  }
});

/**
 * @openapi
 * /api/gathering/points/{id}:
 *   get:
 *     summary: Get gathering point by ID
 *     description: Returns detailed information about a specific gathering point including available items
 *     tags:
 *       - Gathering
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gathering point ID
 *     responses:
 *       200:
 *         description: Gathering point details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Gathering point not found
 *       500:
 *         description: Server error
 */
app.get('/api/gathering/points/:id', (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = gatheringNodeService.getNodeById(nodeId);

    if (!node) {
      return res.status(404).json({ error: 'Gathering node not found' });
    }

    const items = gatheringNodeService.getItemsAtNode(nodeId);
    res.json({ ...node, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get gathering node', message: String(error) });
  }
});

/**
 * @openapi
 * /api/gathering/available:
 *   get:
 *     summary: Get currently available timed nodes
 *     description: Returns gathering nodes that are currently available based on Eorzean time (ephemeral/timed nodes)
 *     tags:
 *       - Gathering
 *     responses:
 *       200:
 *         description: List of currently available timed gathering nodes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
app.get('/api/gathering/available', (_req, res) => {
  try {
    const nodes = gatheringNodeService.getAvailableNodes(new Date());
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get available nodes', message: String(error) });
  }
});

/**
 * @openapi
 * /api/gathering/types:
 *   get:
 *     summary: Get all gathering types
 *     description: Returns list of all gathering types (Mining, Botany, etc.) for filtering
 *     tags:
 *       - Gathering
 *     responses:
 *       200:
 *         description: List of gathering types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
app.get('/api/gathering/types', (_req, res) => {
  try {
    const stats = gatheringNodeService.getStats();
    const types = Object.keys(stats.by_type).map((type) => ({
      name: type,
      count: stats.by_type[type],
    }));
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get gathering types', message: String(error) });
  }
});

// ============================================================================
// API ROUTES - Crafting
// ============================================================================

/**
 * @openapi
 * /api/recipes:
 *   get:
 *     summary: Search recipes
 *     description: Search and filter crafting recipes by craft type, result item, ingredients, and level
 *     tags:
 *       - Crafting
 *     parameters:
 *       - in: query
 *         name: craft_type
 *         schema:
 *           type: string
 *         description: Craft type (CRP, BSM, ARM, GSM, LTW, WVR, ALC, CUL)
 *       - in: query
 *         name: result_item
 *         schema:
 *           type: string
 *         description: Name of the item being crafted
 *       - in: query
 *         name: ingredient
 *         schema:
 *           type: string
 *         description: Name of required ingredient
 *       - in: query
 *         name: level_min
 *         schema:
 *           type: integer
 *         description: Minimum recipe level
 *       - in: query
 *         name: level_max
 *         schema:
 *           type: integer
 *         description: Maximum recipe level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Search results with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       500:
 *         description: Server error
 */
app.get('/api/recipes', (req, res) => {
  try {
    const options: any = {
      craft_type: req.query.craft_type as string,
      result_item_name: req.query.result_item as string,
      ingredient_item_name: req.query.ingredient as string,
      level_min: req.query.level_min ? parseInt(req.query.level_min as string) : undefined,
      level_max: req.query.level_max ? parseInt(req.query.level_max as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = craftingService.searchRecipes(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search recipes', message: String(error) });
  }
});

/**
 * @openapi
 * /api/recipes/{id}:
 *   get:
 *     summary: Get recipe by ID
 *     description: Returns detailed information about a specific crafting recipe including ingredients
 *     tags:
 *       - Crafting
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Recipe details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
app.get('/api/recipes/:id', (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const recipe = craftingService.getRecipeById(recipeId);

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recipe', message: String(error) });
  }
});

/**
 * @openapi
 * /api/recipes/{id}/guide:
 *   get:
 *     summary: Get crafting guide for recipe
 *     description: Returns step-by-step guide for crafting an item including requirements and tips
 *     tags:
 *       - Crafting
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Crafting guide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
app.get('/api/recipes/:id/guide', (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const guide = craftingService.getCraftingGuide(recipeId);

    if (!guide) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(guide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get crafting guide', message: String(error) });
  }
});

/**
 * @openapi
 * /api/recipes/{id}/materials:
 *   get:
 *     summary: Get full material tree for recipe
 *     description: Returns recursive material breakdown showing all raw materials needed (including sub-crafts)
 *     tags:
 *       - Crafting
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Material tree with all required materials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
app.get('/api/recipes/:id/materials', (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const materialTree = craftingService.getMaterialTree(recipeId);
    res.json(materialTree);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get material tree', message: String(error) });
  }
});

/**
 * @openapi
 * /api/craft-types:
 *   get:
 *     summary: Get all craft types
 *     description: Returns list of all crafting classes (CRP, BSM, ARM, GSM, LTW, WVR, ALC, CUL)
 *     tags:
 *       - Crafting
 *     responses:
 *       200:
 *         description: List of craft types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
app.get('/api/craft-types', (_req, res) => {
  try {
    const craftTypes = craftingService.getCraftTypes();
    res.json(craftTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get craft types', message: String(error) });
  }
});

// ============================================================================
// API ROUTES - Collectibles
// ============================================================================

/**
 * @openapi
 * /api/mounts:
 *   get:
 *     summary: Search mounts
 *     description: Search and filter mounts by name, flying capability, and aquatic capability
 *     tags:
 *       - Collectibles
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by mount name (partial match)
 *       - in: query
 *         name: is_flying
 *         schema:
 *           type: boolean
 *         description: Filter by flying capability
 *       - in: query
 *         name: is_aquatic
 *         schema:
 *           type: boolean
 *         description: Filter by aquatic capability
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Search results with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       500:
 *         description: Server error
 */
app.get('/api/mounts', (req, res) => {
  try {
    const options = {
      name: req.query.name as string,
      is_flying:
        req.query.is_flying === 'true' ? true : req.query.is_flying === 'false' ? false : undefined,
      is_aquatic:
        req.query.is_aquatic === 'true'
          ? true
          : req.query.is_aquatic === 'false'
            ? false
            : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = collectiblesService.searchMounts(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search mounts', message: String(error) });
  }
});

/**
 * @openapi
 * /api/mounts/{id}:
 *   get:
 *     summary: Get mount by ID
 *     description: Returns detailed information about a specific mount
 *     tags:
 *       - Collectibles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mount ID
 *     responses:
 *       200:
 *         description: Mount details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Mount not found
 *       500:
 *         description: Server error
 */
app.get('/api/mounts/:id', (req, res) => {
  try {
    const mountId = parseInt(req.params.id);
    const mount = collectiblesService.getMountById(mountId);

    if (!mount) {
      return res.status(404).json({ error: 'Mount not found' });
    }

    res.json(mount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get mount', message: String(error) });
  }
});

/**
 * @openapi
 * /api/companions:
 *   get:
 *     summary: Search companions (minions)
 *     description: Search and filter minions/companions by name and battle capability
 *     tags:
 *       - Collectibles
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by companion name (partial match)
 *       - in: query
 *         name: is_battle
 *         schema:
 *           type: boolean
 *         description: Filter by battle companion capability
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Search results with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       500:
 *         description: Server error
 */
app.get('/api/companions', (req, res) => {
  try {
    const options = {
      name: req.query.name as string,
      is_battle:
        req.query.is_battle === 'true' ? true : req.query.is_battle === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = collectiblesService.searchCompanions(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search companions', message: String(error) });
  }
});

/**
 * @openapi
 * /api/companions/{id}:
 *   get:
 *     summary: Get companion by ID
 *     description: Returns detailed information about a specific minion/companion
 *     tags:
 *       - Collectibles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Companion ID
 *     responses:
 *       200:
 *         description: Companion details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Companion not found
 *       500:
 *         description: Server error
 */
app.get('/api/companions/:id', (req, res) => {
  try {
    const companionId = parseInt(req.params.id);
    const companion = collectiblesService.getCompanionById(companionId);

    if (!companion) {
      return res.status(404).json({ error: 'Companion not found' });
    }

    res.json(companion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get companion', message: String(error) });
  }
});

/**
 * @openapi
 * /api/orchestrion:
 *   get:
 *     summary: Search orchestrion rolls
 *     description: Search and filter orchestrion rolls (music) by name and category
 *     tags:
 *       - Collectibles
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by orchestrion roll name (partial match)
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filter by orchestrion category ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Search results with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       500:
 *         description: Server error
 */
app.get('/api/orchestrion', (req, res) => {
  try {
    const options = {
      name: req.query.name as string,
      category_id: req.query.category ? parseInt(req.query.category as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = collectiblesService.searchOrchestrion(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search orchestrion rolls', message: String(error) });
  }
});

/**
 * @openapi
 * /api/orchestrion/{id}:
 *   get:
 *     summary: Get orchestrion roll by ID
 *     description: Returns detailed information about a specific orchestrion roll (music)
 *     tags:
 *       - Collectibles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Orchestrion roll ID
 *     responses:
 *       200:
 *         description: Orchestrion roll details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Orchestrion roll not found
 *       500:
 *         description: Server error
 */
app.get('/api/orchestrion/:id', (req, res) => {
  try {
    const orchestrionId = parseInt(req.params.id);
    const orchestrion = collectiblesService.getOrchestrionById(orchestrionId);

    if (!orchestrion) {
      return res.status(404).json({ error: 'Orchestrion roll not found' });
    }

    res.json(orchestrion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get orchestrion roll', message: String(error) });
  }
});

/**
 * @openapi
 * /api/collection/stats:
 *   get:
 *     summary: Get collection statistics
 *     description: Returns collection progress statistics for a character (mounts, minions, orchestrion)
 *     tags:
 *       - Collectibles
 *     parameters:
 *       - in: query
 *         name: character_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Character ID
 *     responses:
 *       200:
 *         description: Collection statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mounts:
 *                   type: object
 *                   properties:
 *                     collected:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 companions:
 *                   type: object
 *                   properties:
 *                     collected:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 orchestrion:
 *                   type: object
 *                   properties:
 *                     collected:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Missing required character_id parameter
 *       500:
 *         description: Server error
 */
app.get('/api/collection/stats', (req, res) => {
  try {
    const characterId = req.query.character_id
      ? parseInt(req.query.character_id as string)
      : undefined;

    if (!characterId) {
      return res.status(400).json({ error: 'character_id parameter is required' });
    }

    const stats = collectiblesService.getCollectionStats(characterId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get collection stats', message: String(error) });
  }
});

// ============================================================================
// WEB UI ROUTES - Items
// ============================================================================

// Browse items page
app.get('/items', (req, res) => {
  try {
    const name = req.query.name as string;
    const category = req.query.category ? parseInt(req.query.category as string) : undefined;

    const result = itemService.searchItems({
      name,
      category,
      limit: 100,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Items - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/" class="back-link">← Home</a>
          <h1>📦 Items</h1>

          <input type="text" class="search" id="itemSearch" placeholder="Search items by name..." value="${name || ''}">

          <p style="color: #aaa; margin-bottom: 16px;">
            Showing ${result.items.length} of ${result.total} items
          </p>

          ${
            result.items.length === 0
              ? `
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">📦</div>
              <p>No items found</p>
            </div>
          `
              : ''
          }

          ${result.items
            .map(
              (item) => `
            <div class="card">
              <a href="/item/${item.id}" style="font-size: 1.1em; font-weight: bold;">
                ${item.name}
              </a>
              <div style="margin-top: 8px;">
                <span class="badge">Level ${item.level_item}</span>
                ${item.rarity ? `<span class="badge">Rarity ${item.rarity}</span>` : ''}
                ${item.can_be_hq ? '<span class="badge">HQ</span>' : ''}
                ${item.is_collectible ? '<span class="badge">Collectible</span>' : ''}
              </div>
              ${
                item.ui_category_name
                  ? `<div style="margin-top: 4px; color: #aaa; font-size: 0.9em;">${item.ui_category_name}</div>`
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
        <script src="/clock.js"></script>
        <script>
          document.getElementById('itemSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              window.location = '/items?name=' + encodeURIComponent(e.target.value);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading items');
  }
});

// Item details page
app.get('/item/:id', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const item = itemService.getItemById(itemId);

    if (!item) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Item Not Found - Eorzea Tracker</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <div class="container">
            <a href="/items" class="back-link">← Back to Items</a>
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">📦</div>
              <h1>Item Not Found</h1>
              <p>Item ID ${itemId} doesn't exist</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${item.name} - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/items" class="back-link">← Back to Items</a>
          <h1>📦 ${item.name}</h1>

          <div class="card">
            <h2>Item Info</h2>
            <div class="info-row">
              <span class="label">Level</span>
              <span class="value">${item.level_item}</span>
            </div>
            <div class="info-row">
              <span class="label">Rarity</span>
              <span class="value">${item.rarity}</span>
            </div>
            ${
              item.ui_category_name
                ? `
            <div class="info-row">
              <span class="label">Category</span>
              <span class="value">${item.ui_category_name}</span>
            </div>
            `
                : ''
            }
            ${
              item.description
                ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #0f3460; color: #aaa;">
              ${item.description}
            </div>
            `
                : ''
            }
          </div>

          ${
            item.sources && item.sources.length > 0
              ? `
          <div class="card">
            <h2>How to Obtain</h2>
            ${item.sources
              .map(
                (source) => `
              <div style="padding: 8px 0; border-bottom: 1px solid #0f3460;">
                <div style="font-weight: bold;">${source.source_type}</div>
                ${source.source_name ? `<div style="color: #aaa; font-size: 0.9em;">${source.source_name}</div>` : ''}
              </div>
            `
              )
              .join('')}
          </div>
          `
              : ''
          }

          ${
            item.uses && item.uses.length > 0
              ? `
          <div class="card">
            <h2>Used For</h2>
            ${item.uses
              .map(
                (use) => `
              <div style="padding: 8px 0; border-bottom: 1px solid #0f3460;">
                <div style="font-weight: bold;">${use.use_type}</div>
                ${use.use_name ? `<div style="color: #aaa; font-size: 0.9em;">${use.use_name}</div>` : ''}
                ${use.quantity_required && use.quantity_required > 1 ? `<div style="color: #aaa; font-size: 0.9em;">Quantity: ${use.quantity_required}</div>` : ''}
              </div>
            `
              )
              .join('')}
          </div>
          `
              : ''
          }
        </div>
        <script src="/clock.js"></script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading item details');
  }
});

// ============================================================================
// WEB UI ROUTES - Gathering
// ============================================================================

// Browse gathering nodes page
app.get('/gathering', (req, res) => {
  try {
    const type = req.query.type as string;
    const location = req.query.location as string;
    const available = req.query.available === '1';

    const now = new Date();
    const et = getEorzeanTime(now);

    let nodes;
    let total;

    if (available) {
      const availableNodes = gatheringNodeService.getAvailableNodes(now, type?.toLowerCase());
      nodes = availableNodes.slice(0, 100);
      total = availableNodes.length;
    } else {
      nodes = gatheringNodeService.searchNodes({
        type: type?.toLowerCase(),
        location,
        limit: 100,
      });
      total = nodes.length;
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Gathering - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/" class="back-link">← Home</a>
          <h1>⛏️ Gathering Nodes</h1>

          <input type="text" class="search" id="locationSearch" placeholder="Search by location..." value="${location || ''}">

          <div class="quick-links">
            <a href="/gathering?type=Mining" class="quick-link">⛏️ Mining</a>
            <a href="/gathering?type=Quarrying" class="quick-link">🪨 Quarrying</a>
            <a href="/gathering?type=Logging" class="quick-link">🪓 Logging</a>
            <a href="/gathering?type=Harvesting" class="quick-link">🌿 Harvesting</a>
          </div>

          <p style="color: #aaa; margin-bottom: 16px;">
            ${available ? `Current ET: ${et.hours.toString().padStart(2, '0')}:${et.minutes.toString().padStart(2, '0')} • ` : ''}Showing ${nodes.length} of ${total} gathering nodes
          </p>

          ${
            nodes.length === 0
              ? `
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">⛏️</div>
              <p>No gathering nodes found</p>
            </div>
          `
              : ''
          }

          ${nodes
            .map(
              (node: any) => `
            <div class="card">
              <a href="/gathering/${node.id}" style="font-size: 1.1em; font-weight: bold;">
                ${node.name || node.location_name || 'Unnamed Node'}
              </a>
              <div style="margin-top: 8px;">
                <span class="badge">${node.type}</span>
                <span class="badge">Level ${node.level}</span>
                ${node.start_hour !== 0 || node.end_hour !== 24 ? `<span class="badge" style="background: #ff6b6b;">⏰ ${node.time_window_display || formatTimeWindow(node.start_hour, node.end_hour)}</span>` : ''}
                ${node.is_available ? '<span class="badge" style="background: #4ecca3;">✓ Available NOW</span>' : ''}
                ${node.folklore ? '<span class="badge" style="background: #9b59b6;">📚 Folklore</span>' : ''}
              </div>
              <div style="margin-top: 8px; color: #aaa; font-size: 0.9em;">
                📍 ${node.location_name || 'Unknown Location'}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
        <script src="/clock.js"></script>
        <script>
          document.getElementById('locationSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              window.location = '/gathering?location=' + encodeURIComponent(e.target.value);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading gathering points');
  }
});

// Gathering node details page
app.get('/gathering/:id', (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = gatheringNodeService.getNodeById(nodeId);

    if (!node) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Gathering Node Not Found - Eorzea Tracker</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <div class="container">
            <a href="/gathering" class="back-link">← Back to Gathering</a>
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">⛏️</div>
              <h1>Gathering Node Not Found</h1>
              <p>Gathering node ID ${nodeId} doesn't exist</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    const now = new Date();
    const et = getEorzeanTime(now);
    const timeWindow = formatTimeWindow(node.start_hour, node.end_hour);
    const isAvailable = isInTimeWindow(et.hours, node.start_hour, node.end_hour);
    const items = gatheringNodeService.getItemsAtNode(nodeId);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${node.name || node.location_name || 'Gathering Node'} - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/gathering" class="back-link">← Back to Gathering</a>
          <h1>⛏️ ${node.name || node.location_name || 'Gathering Node'}</h1>

          <div class="card" style="border-left-color: ${isAvailable ? '#4ecca3' : '#ff6b6b'}">
            <h2 style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.5em;">${isAvailable ? '✓' : '⏰'}</span>
              ${isAvailable ? 'Available Now' : 'Not Available'}
            </h2>
            <div class="info-row">
              <span class="label">Time Window</span>
              <span class="value">${timeWindow}</span>
            </div>
            <div class="info-row">
              <span class="label">Current ET</span>
              <span class="value">${et.hours.toString().padStart(2, '0')}:${et.minutes.toString().padStart(2, '0')}</span>
            </div>
          </div>

          <div class="card">
            <h2>Node Info</h2>
            <div class="info-row">
              <span class="label">Type</span>
              <span class="value">${node.type}</span>
            </div>
            <div class="info-row">
              <span class="label">Level</span>
              <span class="value">${node.level}</span>
            </div>
            <div class="info-row">
              <span class="label">Location</span>
              <span class="value">${node.location_name || 'Unknown'}</span>
            </div>
            ${
              node.x && node.y
                ? `
            <div class="info-row">
              <span class="label">Coordinates</span>
              <span class="value">(${node.x.toFixed(1)}, ${node.y.toFixed(1)})</span>
            </div>
            `
                : ''
            }
            ${
              node.folklore
                ? `
            <div class="info-row">
              <span class="label">Folklore</span>
              <span class="value" style="color: #9b59b6;">📚 Required</span>
            </div>
            `
                : ''
            }
            ${
              node.ephemeral
                ? `
            <div class="info-row">
              <span class="label">Type</span>
              <span class="value" style="color: #ff6b6b;">Ephemeral Node</span>
            </div>
            `
                : ''
            }
            ${
              node.legendary
                ? `
            <div class="info-row">
              <span class="label">Type</span>
              <span class="value" style="color: #ffd700;">⭐ Legendary Node</span>
            </div>
            `
                : ''
            }
            ${
              node.patch
                ? `
            <div class="info-row">
              <span class="label">Patch</span>
              <span class="value">${node.patch}</span>
            </div>
            `
                : ''
            }
          </div>

          ${
            items.length > 0
              ? `
          <div class="card">
            <h2>Available Items</h2>
            ${items
              .map(
                (item: any) => `
              <div style="padding: 12px 0; border-bottom: 1px solid #0f3460;">
                <div style="font-weight: bold;">
                  ${item.item_name || `Item #${item.item_id}`}
                </div>
                <div style="margin-top: 4px;">
                  <span class="badge">Slot ${item.slot}</span>
                  ${item.hidden ? '<span class="badge" style="background: #9b59b6;">Hidden</span>' : ''}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          `
              : ''
          }
        </div>
        <script src="/clock.js"></script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading gathering node details');
  }
});

// ============================================================================
// WEB UI ROUTES - Crafting
// ============================================================================

// Browse recipes page
app.get('/crafting', (req, res) => {
  try {
    const craftType = req.query.craft_type as string;
    const item = req.query.item as string;

    const result = craftingService.searchRecipes({
      craft_type: craftType as any,
      result_item_name: item,
      limit: 100,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Crafting - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/" class="back-link">← Home</a>
          <h1>🔨 Crafting Recipes</h1>

          <input type="text" class="search" id="recipeSearch" placeholder="Search recipes by item name..." value="${item || ''}">

          <div class="quick-links">
            <a href="/crafting?craft_type=Carpenter" class="quick-link">🪚 CRP</a>
            <a href="/crafting?craft_type=Blacksmith" class="quick-link">⚒️ BSM</a>
            <a href="/crafting?craft_type=Armorer" class="quick-link">🛡️ ARM</a>
            <a href="/crafting?craft_type=Goldsmith" class="quick-link">💍 GSM</a>
            <a href="/crafting?craft_type=Leatherworker" class="quick-link">🧵 LTW</a>
            <a href="/crafting?craft_type=Weaver" class="quick-link">🪡 WVR</a>
            <a href="/crafting?craft_type=Alchemist" class="quick-link">⚗️ ALC</a>
            <a href="/crafting?craft_type=Culinarian" class="quick-link">🍳 CUL</a>
          </div>

          <p style="color: #aaa; margin-bottom: 16px;">
            Showing ${result.recipes.length} of ${result.total} recipes
          </p>

          ${
            result.recipes.length === 0
              ? `
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">🔨</div>
              <p>No recipes found</p>
            </div>
          `
              : ''
          }

          ${result.recipes
            .map(
              (recipe) => `
            <div class="card">
              <a href="/recipe/${recipe.id}" style="font-size: 1.1em; font-weight: bold;">
                ${recipe.result_item_name}
              </a>
              <div style="margin-top: 8px;">
                <span class="badge">${recipe.craft_type_name}</span>
                <span class="badge">Level ${recipe.class_job_level}</span>
                ${recipe.stars ? `<span class="badge" style="background: #ffd700; color: #000;">${'⭐'.repeat(recipe.stars)}</span>` : ''}
                ${recipe.can_hq ? '<span class="badge">HQ</span>' : ''}
                ${recipe.is_specialist ? '<span class="badge" style="background: #9b59b6;">Specialist</span>' : ''}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
        <script src="/clock.js"></script>
        <script>
          document.getElementById('recipeSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              window.location = '/crafting?item=' + encodeURIComponent(e.target.value);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading recipes');
  }
});

// Recipe details page
app.get('/recipe/:id', (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const recipe = craftingService.getRecipeById(recipeId);

    if (!recipe) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Recipe Not Found - Eorzea Tracker</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <div class="container">
            <a href="/crafting" class="back-link">← Back to Crafting</a>
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">🔨</div>
              <h1>Recipe Not Found</h1>
              <p>Recipe ID ${recipeId} doesn't exist</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${recipe.result_item_name} - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/crafting" class="back-link">← Back to Crafting</a>
          <h1>🔨 ${recipe.result_item_name}</h1>

          <div class="card">
            <h2>Recipe Info</h2>
            <div class="info-row">
              <span class="label">Craft Type</span>
              <span class="value">${recipe.craft_type_name}</span>
            </div>
            <div class="info-row">
              <span class="label">Level</span>
              <span class="value">${recipe.class_job_level}${recipe.stars ? ` ${'⭐'.repeat(recipe.stars)}` : ''}</span>
            </div>
            ${
              recipe.difficulty
                ? `
            <div class="info-row">
              <span class="label">Difficulty</span>
              <span class="value">${recipe.difficulty}</span>
            </div>
            `
                : ''
            }
            ${
              recipe.durability
                ? `
            <div class="info-row">
              <span class="label">Durability</span>
              <span class="value">${recipe.durability}</span>
            </div>
            `
                : ''
            }
            ${
              recipe.quality
                ? `
            <div class="info-row">
              <span class="label">Quality</span>
              <span class="value">${recipe.quality}</span>
            </div>
            `
                : ''
            }
            ${
              recipe.suggested_craftsmanship
                ? `
            <div class="info-row">
              <span class="label">Craftsmanship</span>
              <span class="value">${recipe.suggested_craftsmanship}</span>
            </div>
            `
                : ''
            }
            ${
              recipe.suggested_control
                ? `
            <div class="info-row">
              <span class="label">Control</span>
              <span class="value">${recipe.suggested_control}</span>
            </div>
            `
                : ''
            }
          </div>

          ${
            recipe.ingredients && recipe.ingredients.length > 0
              ? `
          <div class="card">
            <h2>Ingredients</h2>
            ${recipe.ingredients
              .map(
                (ingredient) => `
              <div style="padding: 12px 0; border-bottom: 1px solid #0f3460;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: bold;">
                      <a href="/item/${ingredient.item_id}">${ingredient.item_name}</a>
                    </div>
                    ${
                      ingredient.sources && ingredient.sources.length > 0
                        ? `
                      <div style="margin-top: 4px; color: #aaa; font-size: 0.9em;">
                        ${ingredient.sources.map((s) => s.type).join(', ')}
                      </div>
                    `
                        : ''
                    }
                  </div>
                  <div style="font-size: 1.2em; font-weight: bold; color: #4ecca3;">
                    x${ingredient.quantity}
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          `
              : ''
          }
        </div>
        <script src="/clock.js"></script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading recipe details');
  }
});

// ============================================================================
// WEB UI ROUTES - Collectibles
// ============================================================================

// Browse mounts page
app.get('/mounts', (req, res) => {
  try {
    const name = req.query.name as string;
    const flying = req.query.flying;

    const result = collectiblesService.searchMounts({
      name,
      is_flying: flying === 'true' ? true : flying === 'false' ? false : undefined,
      limit: 100,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Mounts - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/" class="back-link">← Home</a>
          <h1>🐴 Mounts</h1>

          <input type="text" class="search" id="mountSearch" placeholder="Search mounts..." value="${name || ''}">

          <div class="quick-links">
            <a href="/mounts" class="quick-link">All Mounts</a>
            <a href="/mounts?flying=true" class="quick-link">✈️ Flying</a>
          </div>

          <p style="color: #aaa; margin-bottom: 16px;">
            Showing ${result.mounts.length} of ${result.total} mounts
          </p>

          ${
            result.mounts.length === 0
              ? `
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">🐴</div>
              <p>No mounts found</p>
            </div>
          `
              : ''
          }

          ${result.mounts
            .map(
              (mount) => `
            <div class="card">
              <div style="font-size: 1.1em; font-weight: bold;">
                ${mount.singular || mount.name}
              </div>
              <div style="margin-top: 8px;">
                ${mount.is_flying ? '<span class="badge">✈️ Flying</span>' : ''}
                ${mount.is_aquatic ? '<span class="badge">🌊 Aquatic</span>' : ''}
                ${mount.is_seats > 1 ? `<span class="badge">👥 ${mount.is_seats} Seats</span>` : ''}
              </div>
              ${
                mount.sources && mount.sources.length > 0
                  ? `
                <div style="margin-top: 8px; color: #aaa; font-size: 0.9em;">
                  ${mount.sources.map((s) => s.source_type).join(', ')}
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
        <script src="/clock.js"></script>
        <script>
          document.getElementById('mountSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              window.location = '/mounts?name=' + encodeURIComponent(e.target.value);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading mounts');
  }
});

// Browse companions page
app.get('/companions', (req, res) => {
  try {
    const name = req.query.name as string;

    const result = collectiblesService.searchCompanions({
      name,
      limit: 100,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Companions - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/" class="back-link">← Home</a>
          <h1>🐾 Companions (Minions)</h1>

          <input type="text" class="search" id="companionSearch" placeholder="Search companions..." value="${name || ''}">

          <p style="color: #aaa; margin-bottom: 16px;">
            Showing ${result.companions.length} of ${result.total} companions
          </p>

          ${
            result.companions.length === 0
              ? `
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">🐾</div>
              <p>No companions found</p>
            </div>
          `
              : ''
          }

          ${result.companions
            .map(
              (companion) => `
            <div class="card">
              <div style="font-size: 1.1em; font-weight: bold;">
                ${companion.singular || companion.name}
              </div>
              <div style="margin-top: 8px;">
                ${companion.is_battle ? '<span class="badge">⚔️ Battle</span>' : ''}
              </div>
              ${
                companion.sources && companion.sources.length > 0
                  ? `
                <div style="margin-top: 8px; color: #aaa; font-size: 0.9em;">
                  ${companion.sources.map((s) => s.source_type).join(', ')}
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
        <script src="/clock.js"></script>
        <script>
          document.getElementById('companionSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              window.location = '/companions?name=' + encodeURIComponent(e.target.value);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading companions');
  }
});

// Browse orchestrion page
app.get('/orchestrion', (req, res) => {
  try {
    const name = req.query.name as string;

    const result = collectiblesService.searchOrchestrion({
      name,
      limit: 100,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Orchestrion - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/" class="back-link">← Home</a>
          <h1>🎵 Orchestrion Rolls</h1>

          <input type="text" class="search" id="orchestrionSearch" placeholder="Search orchestrion rolls..." value="${name || ''}">

          <p style="color: #aaa; margin-bottom: 16px;">
            Showing ${result.orchestrion_rolls.length} of ${result.total} orchestrion rolls
          </p>

          ${
            result.orchestrion_rolls.length === 0
              ? `
            <div class="empty-state">
              <div style="font-size: 3em; margin-bottom: 16px;">🎵</div>
              <p>No orchestrion rolls found</p>
            </div>
          `
              : ''
          }

          ${result.orchestrion_rolls
            .map(
              (roll) => `
            <div class="card">
              <div style="font-size: 1.1em; font-weight: bold;">
                ${roll.name}
              </div>
              ${
                roll.category_name
                  ? `
                <div style="margin-top: 4px; color: #aaa; font-size: 0.9em;">
                  ${roll.category_name}
                </div>
              `
                  : ''
              }
              ${
                roll.sources && roll.sources.length > 0
                  ? `
                <div style="margin-top: 8px; color: #aaa; font-size: 0.9em;">
                  ${roll.sources.map((s) => s.source_type).join(', ')}
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
        <script src="/clock.js"></script>
        <script>
          document.getElementById('orchestrionSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              window.location = '/orchestrion?name=' + encodeURIComponent(e.target.value);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading orchestrion rolls');
  }
});

// Collection stats page
app.get('/collection', (req, res) => {
  try {
    const characterId = req.query.character_id ? parseInt(req.query.character_id as string) : 1;

    const stats = collectiblesService.getCollectionStats(characterId);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Collection Stats - Eorzea Tracker</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="time-widget" id="et-clock">⏰ ET 00:00:00</div>
        <div class="container">
          <a href="/" class="back-link">← Home</a>
          <h1>📊 Collection Statistics</h1>

          <div class="card">
            <h2>🐴 Mounts</h2>
            <div class="info-row">
              <span class="label">Obtained</span>
              <span class="value">${stats.mounts.obtained} / ${stats.mounts.total}</span>
            </div>
            <div class="info-row">
              <span class="label">Progress</span>
              <span class="value">${stats.mounts.progress_percentage.toFixed(1)}%</span>
            </div>
            <div class="info-row">
              <span class="label">Flying Mounts</span>
              <span class="value">${stats.mounts.flying}</span>
            </div>
            <div class="info-row">
              <span class="label">Multi-Seat Mounts</span>
              <span class="value">${stats.mounts.multi_seat}</span>
            </div>
          </div>

          <div class="card">
            <h2>🐾 Companions</h2>
            <div class="info-row">
              <span class="label">Obtained</span>
              <span class="value">${stats.companions.obtained} / ${stats.companions.total}</span>
            </div>
            <div class="info-row">
              <span class="label">Progress</span>
              <span class="value">${stats.companions.progress_percentage.toFixed(1)}%</span>
            </div>
            <div class="info-row">
              <span class="label">Battle Companions</span>
              <span class="value">${stats.companions.battle}</span>
            </div>
          </div>

          <div class="card">
            <h2>🎵 Orchestrion Rolls</h2>
            <div class="info-row">
              <span class="label">Obtained</span>
              <span class="value">${stats.orchestrion.obtained} / ${stats.orchestrion.total}</span>
            </div>
            <div class="info-row">
              <span class="label">Progress</span>
              <span class="value">${stats.orchestrion.progress_percentage.toFixed(1)}%</span>
            </div>
          </div>

          <div style="margin-top: 20px;">
            <a href="/mounts" class="quick-link" style="display: block; margin-bottom: 8px;">Browse Mounts</a>
            <a href="/companions" class="quick-link" style="display: block; margin-bottom: 8px;">Browse Companions</a>
            <a href="/orchestrion" class="quick-link" style="display: block;">Browse Orchestrion</a>
          </div>
        </div>
        <script src="/clock.js"></script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading collection stats');
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🌐 Eorzea Web Server Started!');
  console.log('═'.repeat(50));
  console.log(`📱 Local:    http://localhost:${PORT}`);
  console.log(`🌍 Network:  Find your IP and visit http://YOUR_IP:${PORT}`);
  console.log('═'.repeat(50));
  console.log('\n💡 Tip: To find your IP address:');
  console.log('   Mac/Linux: ifconfig | grep "inet "');
  console.log('   Windows:   ipconfig');
  console.log("\n📲 Add to your phone's home screen for app-like experience!\n");
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  fishTracker.close();
  questTracker.close();
  itemService.close();
  gatheringNodeService.close();
  craftingService.close();
  collectiblesService.close();
  process.exit(0);
});
