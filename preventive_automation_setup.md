# Pre-Commit Hook Configuration for Translation Keys

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: check-json
      - id: check-ast
      - id: check-merge-conflict
      - id: debug-statements
      - id: detect-private-key
      - id: end-of-file-fixer
      - id: trailing-whitespace

  - repo: local
    hooks:
      - id: check-translation-keys
        name: Check Translation Keys
        entry: d:/vscode/sewakhoj/scripts/check_translation_keys.py
        language: system
        args: []
        types: [python]

  - repo: local
    hooks:
      - id: type-check-translation
        name: TypeScript Translation Check
        entry: d:/vscode/sewakhoj/scripts/ts_translation_check.ts
        language: typescript
        args: []
        types: [typescript]
```

## Implementation Steps
1. Save this configuration as `.pre-commit-config.yaml` in your project root
2. Install pre-commit framework: `pip install pre-commit`
3. Run `pre-commit install` to activate hooks
4. Test with a sample commit to verify translation key checks