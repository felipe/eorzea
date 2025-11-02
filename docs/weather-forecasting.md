# FFXIV Weather Forecasting

## Weather System Overview

FFXIV weather is **deterministic** - it can be calculated based on Unix timestamp.

### Weather Window System
- Weather changes every 8 Eorzean hours (23 minutes 20 seconds real time)
- Weather windows: 0:00, 8:00, 16:00 ET
- Weather is calculated using a seed based on Unix timestamp

### Algorithm (from community reverse engineering)

```
1. Calculate current weather period
   - unixTime = current Unix timestamp (seconds)
   - bell = unixTime / 175  // Convert to Eorzean time
   - increment = (bell + 8 - (bell % 8)) % 24  // Next 8-hour mark
   
2. Calculate weather seed
   - totalDays = unixTime / 4200  // Eorzean days since epoch
   - calcBase = totalDays * 100 + increment
   - step1 = ((calcBase << 11) ^ calcBase) >>> 0
   - step2 = ((step1 >>> 8) ^ step1) >>> 0
   
3. Get weather chance (0-99)
   - chance = step2 % 100
   
4. Match against zone's weather rate table
   - Each zone has cumulative probability table
   - Find first weather where chance < rate
```

### Weather Transitions

For fish like Endoceras that require previous weather + current weather:
1. Must check previous 8-hour window weather
2. Must check current 8-hour window weather
3. Both must match requirements
4. Time window must also be satisfied

## Implementation Plan

1. Create weather forecasting utility
2. Calculate weather for any given timestamp
3. Find next window matching: time + previous weather + current weather
4. Update fish availability display

## Data Sources

- Weather rates from fish-data.json WEATHER_RATES
- Territory/zone mappings from FISHING_SPOTS
- Weather type IDs from WEATHER_TYPES
