# Web View Guide

Mobile-optimized web interface for Eorzea fish and quest tracker.

## Quick Start

### Start the Web Server

```bash
# Start the server
yarn web

# Or with auto-reload during development
yarn web:dev
```

The server will start at `http://localhost:3000`

### Access from Your Phone

1. **Find your computer's IP address:**

   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```

2. **On your phone's browser, visit:**

   ```
   http://YOUR_COMPUTER_IP:3000
   ```

   Example: `http://192.168.1.100:3000`

3. **Add to Home Screen (iOS):**
   - Tap the Share button
   - Scroll down and tap "Add to Home Screen"
   - Now you have an app-like icon!

4. **Add to Home Screen (Android):**
   - Tap the menu (three dots)
   - Tap "Add to Home screen"

## Features

### Home Page

- **Search** - Quick search for fish by ID or quests by name
- **Browse Categories** - Quick links to browse all fish, big fish, folklore fish
- **Live Eorzean Time** - Always visible in top-right corner

### Fish Pages

**Browse Fish** (`/fish`)

- List all fish with filters
- Big Fish only filter (`/fish?big=1`)
- Folklore only filter (`/fish?folklore=1`)
- Shows patch, time windows, tug strength

**Fish Detail** (`/fish/:id`)

- Complete catch information
- Time windows
- Weather requirements
- Bait chains
- Hookset and tug strength
- Special flags (Big Fish, Folklore, Fish Eyes, Snagging)
- Aquarium compatibility

**Available Now** (`/fish/available`)

- Fish catchable at current Eorzean time
- Auto-refreshes every minute
- Great for quick reference while playing

### Quest Pages

**Browse Quests** (`/quests`)

- Search by name
- Filter by level
- Shows objectives count and rewards

**Quest Detail** (`/quest/:id`)

- Full quest information
- Prerequisites with links
- Complete objectives list
- Fish objectives show full catch details
- Link to fish detail pages from objectives

## Design

- **Mobile-First** - Optimized for phone screens
- **Dark Theme** - Easy on the eyes, battery-friendly
- **Fast** - Direct SQLite queries, no API calls
- **Offline-First** - All data stored locally

## Technical Details

### Stack

- **Express.js** - Web server
- **TypeScript** - Same services as CLI
- **Embedded CSS** - No build step needed
- **SQLite** - Same databases as CLI

### Code Reuse

- `FishTrackerService` - Zero changes
- `QuestTrackerService` - Zero changes
- `getEorzeanTime()` - Zero changes
- All types and interfaces - Zero changes

The web view uses the exact same business logic as the CLI.

## Usage Examples

### Quick Fish Lookup

1. Open home page
2. Type fish ID in search
3. Press Enter
4. See full details instantly

### Quest Planning

1. Search for quest name
2. View objectives
3. Click fish objectives to see catch requirements
4. Plan your fishing route

### Check What's Available

1. Go to "Available Now"
2. See all fish catchable right now
3. Page auto-refreshes as time changes

## Tips

### For Best Mobile Experience:

1. **Add to Home Screen** - Makes it feel like a native app
2. **Enable Full Screen** - Set "Display" to "Standalone" in iOS
3. **Bookmark Favorites** - Save direct links to frequently viewed fish/quests

### Network Recommendations:

- **Same WiFi** - Computer and phone on same network
- **Firewall** - Make sure port 3000 is allowed
- **Static IP** - Consider setting static IP on your computer for consistent access

## Security Notes

- Server binds to `0.0.0.0` (all interfaces) for network access
- Read-only database access
- No authentication (local network only!)
- **Do NOT expose to internet** - meant for local network use only

## Troubleshooting

### Can't access from phone?

- Make sure computer and phone are on same WiFi
- Check firewall settings on computer
- Verify the IP address is correct
- Try `http://` not `https://`

### Page won't load?

- Make sure server is running (`yarn web`)
- Check console for errors
- Verify databases exist (`data/fish.db`, `data/game.db`)

### Time widget shows wrong time?

- Eorzean Time is calculated from real-world time
- It's intentional (1 Earth hour = 70 minutes Eorzean Time)

## Future Enhancements

- Search autocomplete
- Fish name display (currently shows IDs)
- Weather forecast
- Push notifications for fish windows
- User favorites (localStorage)
- Dark/Light theme toggle
- PWA manifest for full app experience
- Game asset images

## Development

### File Structure

```
src/web.ts          # Web server (this file)
src/services/       # Reused from CLI
src/utils/          # Reused from CLI
src/types/          # Reused from CLI
```

### Adding New Routes

```typescript
app.get('/your-route', (req, res) => {
  // Use existing services
  const data = fishTracker.someMethod();

  // Return HTML
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <!-- Your content -->
      </body>
    </html>
  `);
});
```

### Styling

All CSS is in the `/style.css` route in `src/web.ts`. Modify the embedded CSS string to change styling.
