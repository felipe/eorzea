#!/bin/bash

# Update Fish Data Script
# 
# This script updates the fish database with the latest data from
# Carbuncle Plushy Fish Tracker.
#
# Usage:
#   ./scripts/update-fish-data.sh
#   or
#   yarn update-fish-data

set -e

echo "🔄 Updating fish data from Carbuncle Plushy..."
echo ""

# Step 1: Download latest data
echo "📥 Step 1/3: Downloading latest data..."
yarn tsx scripts/download-fish-data.ts

# Step 2: Parse data to JSON
echo ""
echo "🔧 Step 2/3: Parsing data..."
yarn tsx scripts/parse-fish-data.ts

# Step 3: Seed database
echo ""
echo "🌱 Step 3/3: Updating database..."
yarn tsx scripts/seed-fish-db.ts

echo ""
echo "✅ Fish data update complete!"
echo ""
echo "🐟 You can now use: eorzea fish --available"
