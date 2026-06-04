```bash
gh pr create --title "<short title> (#NUMBER)" --body "$(cat <<'EOF'
## Summary

<2–4 bullets describing what was done>

Closes #NUMBER
EOF
)"
```

**PR rules:**
- Title is short and clear, with the issue number in parentheses
- Body uses `Closes #NUMBER` so GitHub auto-closes the issue on merge
- Keep the body concise — the issue already contains the full context
