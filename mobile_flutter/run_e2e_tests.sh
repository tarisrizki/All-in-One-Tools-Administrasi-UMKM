#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "=== E2E Flutter — Beres POS ==="
flutter test test/e2e/ --reporter=compact "$@"
