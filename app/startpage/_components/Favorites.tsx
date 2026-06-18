import styles from './Favorites.module.css'

interface FavoriteInfo {
  id: string
  name: string
  url: string
}

export function Favorites({ items }: { items: FavoriteInfo[] }) {
  if (items.length === 0) return null

  return (
    <>
      <div className={styles.section}>
        <div className={styles.label}>Bookmarks</div>
        <div className={styles.row}>
          {items.map(fav => (
            <a
              key={fav.id}
              href={fav.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.pill}
            >
              {fav.name}
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
