#!/usr/bin/env bash
set -euo pipefail

make -C "$CLAUDE_PROJECT_DIR" test-unit 2>/dev/null || true
