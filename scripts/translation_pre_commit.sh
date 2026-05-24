#!/bin/bash
# Pre-commit hook script to check translation key consistency

# Exit on any error
set -e

# Run Python translation key check
echo "🔍 Checking translation key consistency..."
python scripts/check_translation_keys.py

# Run TypeScript translation check (if compiled)
if [ -f "scripts/ts_translation_check.js" ]; then
  echo "🔍 Running TypeScript translation validation..."
  node scripts/ts_translation_check.js
fi

echo "✅ Translation key check passed."