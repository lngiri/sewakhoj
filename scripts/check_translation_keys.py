#!/usr/bin/env python3
"""Check translation keys consistency between codebase and translation JSON files.

Usage:
    python scripts/check_translation_keys.py

The script scans all *.tsx and *.ts files under the `src/` directory for
translation hook usages (`tdash`, `tcommon`, `tnav`). It extracts the key strings
passed to these hooks and verifies that each key exists in both
`src/messages/en.json` and `src/messages/ne.json`.

If any missing keys are detected, the script prints a report and exits with a
non‑zero status code, causing the pre‑commit hook to fail.
"""
import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
EN_JSON = PROJECT_ROOT / "src" / "messages" / "en.json"
NE_JSON = PROJECT_ROOT / "src" / "messages" / "ne.json"

# Regex to capture translation hook calls with a string literal argument
HOOK_REGEX = re.compile(r"\b(tdash|tcommon|tnav)\s*\(\s*['\"]([^'\"]+)['\"]\s*\)")

def load_keys(json_path: Path) -> set:
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[ERROR] Failed to load {json_path}: {e}")
        sys.exit(1)
    # Flatten nested dicts into dot‑separated keys
    def flatten(prefix: str, obj):
        keys = set()
        if isinstance(obj, dict):
            for k, v in obj.items():
                new_prefix = f"{prefix}.{k}" if prefix else k
                keys.update(flatten(new_prefix, v))
        else:
            keys.add(prefix)
        return keys
    return flatten("", data)

def extract_code_keys() -> set:
    keys = set()
    for path in SRC_DIR.rglob("*.tsx"):
        content = path.read_text(encoding="utf-8", errors="ignore")
        for match in HOOK_REGEX.finditer(content):
            keys.add(match.group(2))
    for path in SRC_DIR.rglob("*.ts"):
        # Skip .d.ts files which may contain type definitions only
        if path.suffix == ".d.ts":
            continue
        content = path.read_text(encoding="utf-8", errors="ignore")
        for match in HOOK_REGEX.finditer(content):
            keys.add(match.group(2))
    return keys

def main():
    code_keys = extract_code_keys()
    en_keys = load_keys(EN_JSON)
    ne_keys = load_keys(NE_JSON)

    missing_in_en = code_keys - en_keys
    missing_in_ne = code_keys - ne_keys

    if not missing_in_en and not missing_in_ne:
        print("✅ All translation keys are present in both en.json and ne.json.")
        sys.exit(0)

    if missing_in_en:
        print("❌ Keys missing in en.json:")
        for k in sorted(missing_in_en):
            print(f"  - {k}")
    if missing_in_ne:
        print("❌ Keys missing in ne.json:")
        for k in sorted(missing_in_ne):
            print(f"  - {k}")
    sys.exit(1)

if __name__ == "__main__":
    main()
