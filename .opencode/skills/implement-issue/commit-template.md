```bash
git add <relevant files>
git commit -m "$(cat <<'EOF'
<short imperative message> (#NUMBER)

Co-Authored-By: opencode <noreply@opencode.ai>
EOF
)"
git push -u origin HEAD
```

**Message rules:**
- Imperative mood, present tense ("Add", "Fix", "Wire up" — not "Added" or "Adding")
- Under 72 characters for the subject line
- Reference the issue number in parentheses at the end: `(#NUMBER)`
