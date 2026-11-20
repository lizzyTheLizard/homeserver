/**
 * Split a SQL script into individual statements. Handles:
 *   - single- and double-quoted strings (with doubled-quote escapes)
 *   - dollar-quoted strings ($$...$$ and $tag$...$tag$)
 *   - line comments (-- ...) and block comments
 *   - statements terminated by ';' at the top level
 *
 * Trailing whitespace-only fragments are filtered out.
 */
export function splitSql(sql: string): string[] {
  const statements: string[] = []
  let buf = ''
  let i = 0
  const len = sql.length

  while (i < len) {
    const c = sql[i]
    const next = sql[i + 1]

    // Line comment
    if (c === '-' && next === '-') {
      const end = sql.indexOf('\n', i)
      if (end === -1) {
        buf += sql.slice(i)
        break
      }
      buf += sql.slice(i, end + 1)
      i = end + 1
      continue
    }

    // Block comment
    if (c === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2)
      if (end === -1) {
        buf += sql.slice(i)
        break
      }
      buf += sql.slice(i, end + 2)
      i = end + 2
      continue
    }

    // Single-quoted string
    if (c === '\'') {
      const end = readQuoted(sql, i, '\'')
      buf += sql.slice(i, end)
      i = end
      continue
    }

    // Double-quoted identifier
    if (c === '"') {
      const end = readQuoted(sql, i, '"')
      buf += sql.slice(i, end)
      i = end
      continue
    }

    // Dollar-quoted string: $tag$ ... $tag$
    if (c === '$') {
      const tagMatch = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))
      if (tagMatch) {
        const tag = tagMatch[0]
        const start = i + tag.length
        const closeIdx = sql.indexOf(tag, start)
        if (closeIdx === -1) {
          buf += sql.slice(i)
          break
        }
        buf += sql.slice(i, closeIdx + tag.length)
        i = closeIdx + tag.length
        continue
      }
    }

    if (c === ';') {
      const trimmed = buf.trim()
      if (trimmed.length > 0) statements.push(trimmed)
      buf = ''
      i++
      continue
    }

    buf += c
    i++
  }

  const trailing = buf.trim()
  if (trailing.length > 0) statements.push(trailing)
  return statements
}

function readQuoted(sql: string, start: number, quote: string): number {
  let i = start + 1
  while (i < sql.length) {
    if (sql[i] === quote) {
      // escaped quote
      if (sql[i + 1] === quote) {
        i += 2
        continue
      }
      return i + 1
    }
    i++
  }
  return sql.length
}
