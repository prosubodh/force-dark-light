#!/usr/bin/env bash
# ==============================================================================
# scripts/smoke_test.sh
# Boundary verification smoke test for force-dark-light extension
# ==============================================================================

set -euo pipefail

echo "🔍 Starting Boundary Verification Smoke Test..."

# 1. Typecheck
echo "➡️  [1/4] Checking TypeScript compilation..."
pnpm run typecheck

# 2. Run Unit Test Suite
echo "➡️  [2/4] Executing test suite and coverage gates..."
pnpm run test:coverage

# 3. Build Extension Bundle
echo "➡️  [3/4] Building Vite MV3 extension bundle..."
pnpm run build

# 4. Verify Built Extension Artifacts
echo "➡️  [4/4] Verifying generated bundle structure..."
test -f dist/manifest.json || { echo "❌ Missing dist/manifest.json"; exit 1; }
test -f dist/background.js || { echo "❌ Missing dist/background.js"; exit 1; }
test -f dist/content.js || { echo "❌ Missing dist/content.js"; exit 1; }

# Verify dist/content.js is a classic IIFE script with ZERO ES module import statements
if grep -q "^import " dist/content.js; then
  echo "❌ dist/content.js must not contain ES module imports! MV3 content scripts only execute classic scripts."
  exit 1
fi
echo "✅ dist/content.js verified: Clean IIFE bundle with 0 ES module imports."

# Verify manifest valid JSON
node -e 'const m = JSON.parse(require("fs").readFileSync("dist/manifest.json", "utf8")); if (m.manifest_version !== 3) throw new Error("Invalid MV3");'

echo "=============================================================="
echo "✅ Boundary Smoke Test PASSED! Extension build is healthy."
echo "=============================================================="
