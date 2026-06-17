// Shared Cash UI primitives — header, filter row, sortable column header

// Cash app header (desktop)
function CashHeader({ activeTab = 'Journal', accountName }) {
  const tabs = ['Journal', 'Accounts', 'Reports', 'Closing'];
  const linkStyle = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', height: '4rem', padding: '0 1rem',
    textDecoration: 'none', fontSize: '0.95rem', cursor: 'pointer',
    borderBottom: active ? '0.2rem solid white' : '0.2rem solid transparent',
  });
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'rgba(0,0,220,1)', color: 'white',
      height: '4rem', width: '100%',
    }}>
      <span style={{ fontSize: '1.5rem', padding: '0 1rem', fontWeight: 400 }}>Cash</span>
      <nav style={{ display: 'flex' }}>
        {tabs.map(t => (
          <a key={t} href="#" style={linkStyle(t === activeTab)} onClick={e => e.preventDefault()}>{t}</a>
        ))}
      </nav>
      <div style={{ flexGrow: 1 }} />
      <a href="#" style={linkStyle(false)} onClick={e => e.preventDefault()}>All Applications</a>
      <a href="#" style={linkStyle(false)} onClick={e => e.preventDefault()}>Logout</a>
    </div>
  );
}

// Cash app header (mobile) — hamburger opens a full-screen menu overlay
function CashHeaderMobile({ activeTab = 'Journal' }) {
  const [open, setOpen] = React.useState(false);
  const tabs = ['Journal', 'Accounts', 'Reports', 'Closing'];
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(0,0,220,1)', color: 'white',
        height: '3.5rem', width: '100%', padding: '0 1rem',
      }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 400 }}>Cash</span>
        <div style={{ flexGrow: 1 }} />
        <Icon name="menu" style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }} onClick={() => setOpen(true)} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'white', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(0,0,220,1)', color: 'white',
            height: '3.5rem', padding: '0 1rem', flexShrink: 0,
          }}>
            <span style={{ fontSize: '1.25rem' }}>Cash</span>
            <div style={{ flexGrow: 1 }} />
            <Icon name="close" style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }} onClick={() => setOpen(false)} />
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
            {tabs.map(t => (
              <a key={t} href="#" onClick={e => { e.preventDefault(); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', textDecoration: 'none', color: 'black',
                fontSize: '1.05rem',
                background: t === activeTab ? 'rgb(240,240,255)' : 'white',
                borderLeft: t === activeTab ? '4px solid rgba(0,0,220,1)' : '4px solid transparent',
                fontWeight: t === activeTab ? 600 : 400,
              }}>
                <span>{t}</span>
                <Icon name="caretRight" style={{ width: '0.7rem', height: '0.7rem', opacity: 0.4 }} />
              </a>
            ))}
            <div style={{ height: '1px', background: 'rgba(200,200,200,1)', margin: '0.5rem 1.25rem' }} />
            <a href="#" onClick={e => { e.preventDefault(); setOpen(false); }} style={{
              padding: '1rem 1.25rem', textDecoration: 'none', color: 'black', fontSize: '1.05rem',
            }}>All Applications</a>
            <a href="#" onClick={e => { e.preventDefault(); setOpen(false); }} style={{
              padding: '1rem 1.25rem', textDecoration: 'none', color: 'black', fontSize: '1.05rem',
            }}>Logout</a>
          </nav>
        </div>
      )}
    </>
  );
}

// Page title row.
// Desktop:  Title  |  Search  |  Year  |  Month  |  Action
// Mobile:   Title  (row 1)
//           Year | Month | Action  (row 2)
//           Search  (row 3)
function PageHeader({ title, showFilters = true, actionLabel, mobile = false, showSearch = false, searchPlaceholder = 'Search\u2026' }) {
  const ddStyle = {
    border: '1px solid rgba(200,200,200,1)', borderRadius: '6px',
    padding: mobile ? '0.4rem 1.5rem 0.4rem 0.5rem' : '0.5rem 1.75rem 0.5rem 0.5rem',
    background: 'white', fontSize: '0.95rem',
    fontFamily: 'sans-serif', appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23555\'><path d=\'M3.204 5h9.592L8 10.481zm-.753.659 4.796 5.48a1 1 0 0 0 1.506 0l4.796-5.48c.566-.647.106-1.659-.753-1.659H3.204a1 1 0 0 0-.753 1.659\'/></svg>")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.4rem center',
    backgroundSize: '0.85rem',
    width: mobile ? '100%' : 'auto',
  };
  const fieldWrap = { position: 'relative', flex: mobile ? 1 : 'none' };
  const fieldLabel = {
    position: 'absolute', top: '-0.5rem', left: '0.4rem',
    fontSize: '0.65rem', background: 'white', padding: '0 0.25rem',
    color: 'rgba(0,0,0,0.55)',
  };
  const actionBtn = (
    <button style={{
      background: 'rgba(0,0,220,1)', color: 'white',
      border: '1px solid rgba(0,0,150,1)', borderRadius: '6px',
      padding: mobile ? '0.5rem 0.85rem' : '0.6rem 1.1rem',
      fontSize: mobile ? '0.85rem' : '0.95rem', cursor: 'pointer',
      whiteSpace: 'nowrap', height: mobile ? '2.4rem' : 'auto',
    }}>{actionLabel}</button>
  );
  const yearField = (
    <div style={fieldWrap}>
      <span style={fieldLabel}>Year</span>
      <select style={ddStyle} defaultValue="2026">
        <option>2024</option><option>2025</option><option>2026</option>
      </select>
    </div>
  );
  const monthField = (
    <div style={fieldWrap}>
      <span style={fieldLabel}>Month</span>
      <select style={ddStyle} defaultValue="April">
        <option>January</option><option>February</option><option>March</option>
        <option>April</option><option>May</option><option>June</option>
      </select>
    </div>
  );

  if (mobile) {
    return (
      <div style={{ padding: '0.75rem 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        {(showFilters || actionLabel) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {showFilters && yearField}
            {showFilters && monthField}
            {actionLabel && actionBtn}
          </div>
        )}
        {showSearch && (
          <SearchBox mobile placeholder={searchPlaceholder} />
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '1rem 1.25rem',
    }}>
      <h1 style={{
        margin: 0, fontSize: '2rem', fontWeight: 700,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        marginRight: '0.5rem',
      }}>{title}</h1>
      <div style={{ flex: 1 }} />
      {showSearch && (
        <div style={{ width: '20rem' }}>
          <SearchBox placeholder={searchPlaceholder} />
        </div>
      )}
      {showFilters && yearField}
      {showFilters && monthField}
      {actionLabel && actionBtn}
    </div>
  );
}

// Sort indicator (up/down)
function SortArrow({ dir }) {
  // dir: 'asc', 'desc', or null
  const opaUp = dir === 'asc' ? 1 : 0.3;
  const opaDown = dir === 'desc' ? 1 : 0.3;
  if (dir === 'asc') return <Icon name="up" style={{ width: '0.7rem', height: '0.7rem', marginLeft: '0.25rem', opacity: 1 }} />;
  if (dir === 'desc') return <Icon name="down" style={{ width: '0.7rem', height: '0.7rem', marginLeft: '0.25rem', opacity: 1 }} />;
  return <Icon name="updown" style={{ width: '0.7rem', height: '0.7rem', marginLeft: '0.25rem', opacity: 0.45 }} />;
}

// Add `up` / `down` / account-type icons.
if (typeof ICONS !== 'undefined') {
  if (!ICONS.up)   ICONS.up   = '<path fill-rule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V3.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 3.707V11.5a.5.5 0 0 0 .5.5"/>';
  if (!ICONS.down) ICONS.down = '<path fill-rule="evenodd" d="M8 4a.5.5 0 0 1 .5.5v7.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 12.293V4.5a.5.5 0 0 1 .5-.5"/>';
  // Account type icons (Bootstrap-icon style, 16×16)
  if (!ICONS.typeAsset)     ICONS.typeAsset     = '<path d="m8 0 6.61 3h.89a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5H15v7a.5.5 0 0 1 .485.38l.5 2a.498.498 0 0 1-.485.62H.5a.498.498 0 0 1-.485-.62l.5-2A.5.5 0 0 1 1 13V6H.5a.5.5 0 0 1-.5-.5v-2A.5.5 0 0 1 .5 3h.89zM3.777 3h8.447L8 1zM2 6v7h1V6zm2 0v7h2.5V6zm3.5 0v7h1V6zm2 0v7H12V6zM13 6v7h1V6zm2-1V4H1v1zm-.39 9H1.39l-.25 1h13.72z"/>';
  // Liability — credit-card (an obligation, not an alert)
  if (!ICONS.typeLiability) ICONS.typeLiability = '<path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm-1 4v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z"/><path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>';
  // Income — arrow up (money coming in)
  if (!ICONS.typeIncome)    ICONS.typeIncome    = '<path d="M16 8A8 8 0 1 0 0 8a8 8 0 0 0 16 0m-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707z"/>';
  // Expense — arrow down (money going out)
  if (!ICONS.typeExpense)   ICONS.typeExpense   = '<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293z"/>';
  // Cash — stack of banknotes
  if (!ICONS.typeCash)      ICONS.typeCash      = '<path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/><path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2z"/>';
  // Equity — pie chart (share of net worth)
  if (!ICONS.typeEquity)    ICONS.typeEquity    = '<path d="M15.985 8.5H8.207l-5.5 5.5a8 8 0 0 0 13.277-5.5zM2 13.292A8 8 0 0 1 7.5.015v7.778zM8.5.015V7.5h7.485A8.001 8.001 0 0 0 8.5.015"/>';
  // Profit — trophy (the gain that flows into equity)
  if (!ICONS.typeProfit)    ICONS.typeProfit    = '<path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5q0 .807-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33 33 0 0 1 2.5.5m.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935m10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935"/>';
}

// Mapping account-type → icon name + color hint
function getTypeIcon(type) {
  return ({
    Asset:     'typeAsset',
    Liability: 'typeLiability',
    Income:    'typeIncome',
    Expense:   'typeExpense',
    Cash:      'typeCash',
    Equity:    'typeEquity',
    Profit:    'typeProfit',
  })[type] || 'typeAsset';
}
function getTypeColor(type) {
  return ({
    Asset:     'rgba(0,0,150,1)',
    Cash:      'rgba(0,0,150,1)',
    Income:    'rgba(30,120,30,1)',
    Profit:    'rgba(30,120,30,1)',
    Equity:    'rgba(150,0,0,1)',
    Expense:   'rgba(150,0,0,1)',
    Liability: 'rgba(150,0,0,1)',
  })[type] || 'black';
}
function TypeBadge({ type, size = '1rem' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: getTypeColor(type) }}>
      <Icon name={getTypeIcon(type)} style={{ width: size, height: size }} />
      <span style={{ color: 'black' }}>{type}</span>
    </span>
  );
}

// A sortable column header: label + sort arrow.
function SortHeader({ label, dir, align = 'left', width }) {
  return (
    <th style={{
      textAlign: align, padding: '0.65rem 0.75rem',
      borderBottom: '2px solid rgba(200,200,200,1)',
      background: 'white', fontWeight: 600,
      width, whiteSpace: 'nowrap',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        cursor: 'pointer', userSelect: 'none',
      }}>
        <span>{label}</span>
        <SortArrow dir={dir} />
      </div>
    </th>
  );
}

// Single-field search box (replaces per-column filters).
function SearchBox({ placeholder = 'Search…', value, onChange, width, mobile = false }) {
  return (
    <div style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center',
      width: width || (mobile ? '100%' : '20rem'),
    }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16"
        fill="rgba(0,0,0,0.45)"
        style={{ position: 'absolute', left: '0.6rem', pointerEvents: 'none' }}>
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
      </svg>
      <input
        value={value || ''}
        onChange={onChange || (() => {})}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1px solid rgba(200,200,200,1)', borderRadius: '6px',
          padding: '0 0.6rem 0 2rem', height: mobile ? '2.2rem' : '2.4rem',
          fontSize: mobile ? '0.85rem' : '0.9rem', fontFamily: 'sans-serif',
          background: 'white',
        }}
      />
    </div>
  );
}

// Common filter input styles
const filterInputStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid rgba(200,200,200,1)', borderRadius: '6px',
  padding: '0.4rem 0.5rem', fontSize: '0.85rem', fontFamily: 'sans-serif',
  background: 'white', height: '2rem',
};
const filterSelectStyle = {
  ...filterInputStyle,
  appearance: 'none', WebkitAppearance: 'none',
  paddingRight: '1.5rem',
  backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23555\'><path d=\'M3.204 5h9.592L8 10.481zm-.753.659 4.796 5.48a1 1 0 0 0 1.506 0l4.796-5.48c.566-.647.106-1.659-.753-1.659H3.204a1 1 0 0 0-.753 1.659\'/></svg>")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.4rem center',
  backgroundSize: '0.8rem',
};
const dateInputStyle = { ...filterInputStyle };

// Range pair (From / To) used in filter cells
function RangeFilter({ from = '', to = '', fromPlaceholder = 'From', toPlaceholder = 'To' }) {
  return (
    <div style={{ display: 'flex', gap: '0.35rem' }}>
      <input style={filterInputStyle} value={from} placeholder={fromPlaceholder} readOnly />
      <input style={filterInputStyle} value={to} placeholder={toPlaceholder} readOnly />
    </div>
  );
}

// Table row hover / selection helper
const ROW_HOVER = 'rgb(240,240,240)';
const ROW_SELECTED = 'rgb(232,232,232)';

// Link style (for in-table account links)
function AccountLink({ name, danger }) {
  return (
    <a href="#" onClick={e => e.preventDefault()} style={{
      color: danger ? 'rgba(150,0,0,1)' : 'rgba(0,0,220,1)',
      textDecoration: 'underline', cursor: 'pointer',
    }}>{name}</a>
  );
}

// Side panel — wraps edit form. Desktop: right rail (full-height). Mobile: bottom sheet (~85% height).
// Always renders as a flex column; the inner form is also a column so a growing
// textarea (FormTextarea flex:1) stretches to fill the remaining space.
function EditPanel({ open, onClose, title, subtitle, children, variant = 'right' }) {
  if (!open) return null;
  if (variant === 'right') {
    return (
      <aside style={{
        width: '380px', flexShrink: 0,
        background: 'white', border: '1px solid black', borderRadius: '6px',
        margin: '0.25rem 1rem 1rem 0',
        padding: '1rem', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        alignSelf: 'stretch', minHeight: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', flexGrow: 1 }}>{title}</h2>
          <Icon name="close" style={{ width: '1.4rem', height: '1.4rem', cursor: 'pointer' }} onClick={onClose} />
        </div>
        {subtitle && <p style={{ margin: '0 0 0.75rem', fontWeight: 600, flexShrink: 0 }}>{subtitle}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </aside>
    );
  }
  // Mobile bottom sheet
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.35)', zIndex: 50,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'white', width: '100%', height: '88%',
        borderTopLeftRadius: '12px', borderTopRightRadius: '12px',
        padding: '1rem', boxSizing: 'border-box',
        borderTop: '1px solid black',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <div style={{
          width: '36px', height: '4px', borderRadius: '2px',
          background: 'rgba(200,200,200,1)', margin: '0 auto 0.75rem', flexShrink: 0,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', flexGrow: 1 }}>{title}</h2>
          <Icon name="close" style={{ width: '1.4rem', height: '1.4rem', cursor: 'pointer' }} onClick={onClose} />
        </div>
        {subtitle && <p style={{ margin: '0 0 0.75rem', fontWeight: 600, flexShrink: 0 }}>{subtitle}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Form helpers
function FieldLabel({ children }) {
  return <label style={{
    display: 'block', fontSize: '0.7rem', color: 'rgba(0,0,0,0.6)',
    marginBottom: '0.15rem', marginTop: '0.6rem',
  }}>{children}</label>;
}
function FormInput({ value, onChange, type = 'text' }) {
  return <input type={type} value={value || ''} onChange={onChange || (() => {})}
    style={{
      width: '100%', boxSizing: 'border-box', height: '2.4rem',
      border: '1px solid rgba(200,200,200,1)', borderRadius: '6px',
      padding: '0 0.6rem', fontSize: '0.95rem', fontFamily: 'sans-serif',
      background: 'white',
    }} />;
}
function FormSelect({ value, onChange, options }) {
  return <select value={value || ''} onChange={onChange || (() => {})}
    style={{
      width: '100%', boxSizing: 'border-box', height: '2.4rem',
      border: '1px solid rgba(200,200,200,1)', borderRadius: '6px',
      padding: '0 1.5rem 0 0.6rem', fontSize: '0.95rem', fontFamily: 'sans-serif',
      appearance: 'none', WebkitAppearance: 'none', background: 'white',
      backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23555\'><path d=\'M3.204 5h9.592L8 10.481zm-.753.659 4.796 5.48a1 1 0 0 0 1.506 0l4.796-5.48c.566-.647.106-1.659-.753-1.659H3.204a1 1 0 0 0-.753 1.659\'/></svg>")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.4rem center',
      backgroundSize: '0.85rem',
    }}>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>;
}
function FormTextarea({ value, onChange }) {
  return (
    <textarea value={value || ''} onChange={onChange || (() => {})}
      style={{
        width: '100%', boxSizing: 'border-box',
        flex: 1, minHeight: '4rem',
        border: '1px solid rgba(200,200,200,1)', borderRadius: '6px',
        padding: '0.5rem 0.6rem', fontSize: '0.95rem', fontFamily: 'sans-serif',
        background: 'white', resize: 'none', lineHeight: 1.4,
      }} />
  );
}
function FormCheckbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', cursor: 'pointer' }}>
      <input type="checkbox" checked={!!checked} onChange={onChange || (() => {})} style={{ width: '1.1rem', height: '1.1rem', accentColor: 'rgba(0,0,220,1)' }} />
      <span style={{ fontSize: '0.95rem' }}>{label}</span>
    </label>
  );
}

function FormButtons({ onSave, onDelete, onCancel }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
      <button style={{
        flex: 1, background: 'rgba(0,0,220,1)', color: 'white',
        border: '1px solid rgba(0,0,150,1)', borderRadius: '6px',
        padding: '0.6rem 1rem', fontSize: '0.95rem', cursor: 'pointer', minWidth: '5rem',
      }} onClick={onSave}>Save</button>
      <button style={{
        background: 'white', color: 'black',
        border: '1px solid rgba(200,200,200,1)', borderRadius: '6px',
        padding: '0.6rem 1rem', fontSize: '0.95rem', cursor: 'pointer',
      }} onClick={onCancel}>Cancel</button>
      <button style={{
        background: 'rgba(220,0,0,1)', color: 'white',
        border: '1px solid rgba(150,0,0,1)', borderRadius: '6px',
        padding: '0.6rem 1rem', fontSize: '0.95rem', cursor: 'pointer',
      }} onClick={onDelete}>Delete</button>
    </div>
  );
}

// CHF formatting — Swiss: thousands separator is apostrophe
function fmtCHF(amount, { signed = false } = {}) {
  const abs = Math.abs(amount).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = amount < 0 ? '-' : (signed && amount > 0 ? '' : '');
  return `CHF ${sign}${abs}`;
}

Object.assign(window, {
  CashHeader, CashHeaderMobile, PageHeader,
  SortArrow, SortHeader, SearchBox, RangeFilter,
  filterInputStyle, filterSelectStyle, dateInputStyle,
  ROW_HOVER, ROW_SELECTED, AccountLink, EditPanel,
  FieldLabel, FormInput, FormSelect, FormCheckbox, FormTextarea, FormButtons,
  getTypeIcon, getTypeColor, TypeBadge,
  fmtCHF,
});
