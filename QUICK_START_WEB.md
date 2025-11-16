# Quick Start - Web View

Get your Eorzea tracker running on your phone in 3 steps.

## Step 1: Start the Server

```bash
yarn web
```

You'll see:

```
Eorzea Web Server Started!
Local:    http://localhost:3000
```

## Step 2: Find Your IP Address

**On Mac/Linux:**

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**

```bash
ipconfig
```

Look for something like `192.168.1.100`

## Step 3: Access from Your Phone

1. Make sure your phone is on the **same WiFi** as your computer
2. Open your phone's browser
3. Go to: `http://YOUR_IP_HERE:3000`
   - Example: `http://192.168.1.100:3000`

## Bonus: Add to Home Screen

### iOS

1. Tap the **Share** button (box with arrow)
2. Scroll down and tap **"Add to Home Screen"**
3. Tap **Add**
4. Now you have an app icon

### Android

1. Tap the **menu** (three dots)
2. Tap **"Add to Home screen"**
3. Tap **Add**
4. Now you have an app icon

## What You Can Do

- **Browse fish** - See all fish with filters
- **Search quests** - Find quests by name or level
- **Available now** - See catchable fish right now
- **Quest objectives** - View detailed objectives with fish requirements
- **Eorzean time** - Always displayed in top-right corner

## Troubleshooting

**Can't connect from phone?**

- Both devices on same WiFi?
- Server still running? (check terminal)
- Using `http://` not `https://`?
- Firewall not blocking port 3000?

**Page is slow?**

- First load might take a moment
- After that, everything is instant

## Full Documentation

See `docs/WEB_VIEW.md` for complete documentation.
