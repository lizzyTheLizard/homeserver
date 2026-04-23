'use client'

import { useState } from 'react'
import styles from './Config.module.css'
import type { ConfigSection } from '../server'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export interface ConfigProps {
  data?: ConfigSection[]
}

export function Config({ data = [] }: ConfigProps) {
  const [query, setQuery] = useState('')
  const [showSecrets, setShowSecrets] = useState(false)

  return (
    <div>
      <ActionTitle>
        <h1>Config</h1>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value) }}
          placeholder="Filter keys…"
          className={styles.search}
        />
        <button
          onClick={() => { setShowSecrets(v => !v) }}
          className={showSecrets ? styles.showSecretsActive : styles.showSecrets}
        >
          {showSecrets ? 'Hide secrets' : 'Show secrets'}
        </button>
      </ActionTitle>
      <div className={styles.grid}>
        {data.map(section => (
          <SectionCard key={section.id} section={section} showSecrets={showSecrets} query={query} />
        ))}
      </div>
    </div>
  )
}

function SectionCard({ section, showSecrets, query }: { section: ConfigSection, showSecrets: boolean, query: string }) {
  const filtered = section.entries.filter(e =>
    !query
    || e.key.toLowerCase().includes(query.toLowerCase())
    || (e.value ?? '').toLowerCase().includes(query.toLowerCase()),
  )
  if (filtered.length === 0) return null
  return (
    <div className={styles.card}>
      <div className={styles.sectionLabel}>{section.label}</div>
      {filtered.map(e => <ConfigRow key={e.key} entry={e} showSecrets={showSecrets} />)}
    </div>
  )
}

function ConfigRow({ entry, showSecrets }: { entry: ConfigSection['entries'][number], showSecrets: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const val = entry.value ?? ''
  const masked = '••••••••••••••••'

  let display: string
  if (entry.secret && !showSecrets) {
    display = masked
  }
  else if (entry.truncate && !expanded) {
    display = val.slice(0, 60) + '…'
  }
  else {
    display = val
  }

  const canToggle = entry.truncate && (!entry.secret || showSecrets)

  return (
    <div className={styles.configRow}>
      <span className={styles.configKey}>{entry.key}</span>
      <span className={styles.configValueWrap}>
        <span className={entry.secret && !showSecrets ? styles.configValueSecret : styles.configValue}>
          {display}
        </span>
        {canToggle && (
          <button onClick={() => { setExpanded(v => !v) }} className={styles.toggleBtn}>
            {expanded ? 'less' : 'more'}
          </button>
        )}
      </span>
    </div>
  )
}
