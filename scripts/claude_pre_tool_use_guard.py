#!/usr/bin/env python3
"""Pre-tool-use guard: block destructive commands."""

import os
import re
import sys

BLOCKED_PATTERNS = [
    r"rm\s+-rf\s+/",
    r"terraform\s+destroy",
    r"git\s+push\s+--force",
    r"git\s+push\s+-f\b",
    r"git\s+reset\s+--hard",
    r"git\s+clean\s+-f",
    r"chmod\s+-R\s+777",
    r"dd\s+if=",
    r"mkfs\.",
    r":(){ :|:& };:",  # fork bomb
]

command = os.environ.get("CLAUDE_COMMAND", "")
if not command:
    command = sys.argv[1] if len(sys.argv) > 1 else ""

for pattern in BLOCKED_PATTERNS:
    if re.search(pattern, command):
        print(f"BLOCKED: Destructive command detected: {command}", file=sys.stderr)
        sys.exit(1)

sys.exit(0)
