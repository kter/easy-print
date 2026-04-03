#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Directory traversal protection
if echo "$FILE_PATH" | grep -q '\.\.'; then
  exit 0
fi

# Convert absolute to relative path
REL_PATH="${FILE_PATH#$CLAUDE_PROJECT_DIR/}"

make -C "$CLAUDE_PROJECT_DIR" claude-post-tool-use FILE_PATH="$REL_PATH" 2>/dev/null || true
