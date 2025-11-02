/**
 * Super Basic Web Server for Eorzea Data
 * Mobile-optimized views for fish and quest tracking
 */

import express from 'express';
import { FishTrackerService } from './services/fishTracker.js';
import { QuestTrackerService } from './services/questTracker.js';
import { getEorzeanTime } from './utils/eorzeanTime.js';

const app = express();
const PORT = process.env.PORT || 3000;

const fishTracker = new FishTrackerService();
const questTracker = new QuestTrackerService();

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
      <div class="time-widget">⏰ ET ${String(et.hours).padStart(2, '0')}:${String(et.minutes).padStart(2, '0')}</div>
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
          <h2>ℹ️ About</h2>
          <p style="color: #aaa; font-size: 0.9em;">
            Offline-first FFXIV fish and quest tracker. All data stored locally on your device.
          </p>
        </div>
      </div>

      <script>
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
      </script>
    </body>
    </html>
  `);
});

// Fish List
app.get('/fish', (req, res) => {
  const bigOnly = req.query.big === '1';
  const folkloreOnly = req.query.folklore === '1';
  const patch = req.query.patch ? parseFloat(req.query.patch as string) : undefined;

  const fish = fishTracker.searchFish({
    bigFishOnly: bigOnly,
    requiresFolklore: folkloreOnly,
    patch: patch,
    limit: 100,
  });

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
      <div class="time-widget">⏰ ET ${String(et.hours).padStart(2, '0')}:${String(et.minutes).padStart(2, '0')}</div>
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
              Fish ID ${f._id}
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
    </body>
    </html>
  `);
});

// Available Fish
app.get('/fish/available', (_req, res) => {
  const now = new Date();
  const fish = fishTracker.getAvailableFish(now);
  const et = getEorzeanTime(now);

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
      <div class="time-widget">⏰ ET ${String(et.hours).padStart(2, '0')}:${String(et.minutes).padStart(2, '0')}</div>
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
              Fish ID ${f._id}
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
    </body>
    </html>
  `);
});

// Fish Detail
app.get('/fish/:id', (req, res) => {
  const fishId = parseInt(req.params.id);
  const fish = fishTracker.getFishById(fishId);

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
      <title>Fish ${fish._id} - Eorzea Tracker</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="time-widget">⏰ ET ${String(et.hours).padStart(2, '0')}:${String(et.minutes).padStart(2, '0')}</div>
      <div class="container">
        <a href="/fish" class="back-link">← Back to Fish</a>
        <h1>🎣 Fish ${fish._id}</h1>
        
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

        <div class="card">
          <h2>Catch Details</h2>
          <div class="info-row">
            <span class="label">⏰ Time Window</span>
            <span class="value">${fish.startHour}:00 - ${fish.endHour}:00 ET</span>
          </div>
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
            <span class="value">${fish.weatherSet.map((w) => `Weather ${w}`).join(', ')}</span>
          </div>
          `
              : ''
          }
          ${
            fish.previousWeatherSet && fish.previousWeatherSet.length > 0
              ? `
          <div class="info-row">
            <span class="label">🌥️ Previous Weather</span>
            <span class="value">${fish.previousWeatherSet.map((w) => `Weather ${w}`).join(', ')}</span>
          </div>
          `
              : ''
          }
          ${
            fish.bestCatchPath && fish.bestCatchPath.length > 0
              ? `
          <div class="info-row">
            <span class="label">🎣 Bait Chain</span>
            <span class="value">${fish.bestCatchPath.map((b) => `Bait ${b}`).join(' → ')}</span>
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
      </div>
    </body>
    </html>
  `);
});

// Quest List
app.get('/quests', (req, res) => {
  const search = req.query.search as string;
  const level = req.query.level ? parseInt(req.query.level as string) : undefined;

  let quests;
  if (search) {
    quests = questTracker.searchByName(search, 100);
  } else if (level) {
    quests = questTracker.getQuestsByLevelRange(level - 2, level + 2);
  } else {
    quests = questTracker.searchQuests({ limit: 100 });
  }

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
      <div class="time-widget">⏰ ET ${String(et.hours).padStart(2, '0')}:${String(et.minutes).padStart(2, '0')}</div>
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
    </body>
    </html>
  `);
});

// Quest Detail
app.get('/quest/:id', (req, res) => {
  const questId = parseInt(req.params.id);
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
      <div class="time-widget">⏰ ET ${String(et.hours).padStart(2, '0')}:${String(et.minutes).padStart(2, '0')}</div>
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
    </body>
    </html>
  `);
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
  process.exit(0);
});
