// Shared UI components for Gutschi.site

function Button({ variant = 'primary', disabled, onClick, children, style: s }) {
  const base = {
    display: 'block', cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none', textAlign: 'center',
    borderRadius: '6px', boxSizing: 'border-box',
    height: '2.5rem', fontSize: '0.9rem',
    padding: 'calc((2.5rem - 0.9rem) / 2) 1rem',
    fontFamily: 'sans-serif', border: '1px solid',
    transition: 'background 0.15s',
    ...s,
  };
  const variants = {
    primary:   { background: 'rgba(0,0,220,1)',   color: 'white', borderColor: 'rgba(0,0,150,1)' },
    secondary: { background: 'white',             color: 'black', borderColor: 'rgba(200,200,200,1)' },
    danger:    { background: 'rgba(220,0,0,1)',   color: 'white', borderColor: 'rgba(150,0,0,1)' },
    disabled:  { background: 'rgba(100,100,100,1)', color: 'white', borderColor: 'rgba(150,150,150,1)' },
  };
  const v = disabled ? variants.disabled : (variants[variant] || variants.primary);
  return (
    <button onClick={!disabled ? onClick : undefined} style={{ ...base, ...v }} disabled={disabled}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, disabled, invalid, type = 'text' }) {
  return (
    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder=" "
        style={{
          display: 'block', fontFamily: 'sans-serif',
          padding: '1rem 0.5rem 0.25rem 0.5rem',
          borderRadius: '6px', border: '1px solid rgba(200,200,200,1)',
          width: '100%', height: '2.5rem', boxSizing: 'border-box', fontSize: '1rem',
          background: disabled ? 'rgba(100,100,100,0.1)' : invalid ? 'rgba(220,0,0,0.1)' : 'white',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      <label style={{
        color: 'rgba(0,0,0,0.6)', position: 'absolute',
        left: '0.5rem', top: '0.1rem', fontSize: '0.65rem', fontWeight: 'normal',
        pointerEvents: 'none',
      }}>{label}</label>
    </div>
  );
}

function Card({ href, onClick, children }) {
  const cardStyle = {
    display: 'flex', margin: '1rem', width: '20rem',
    border: '1px solid rgba(200,200,200,1)', borderRadius: '6px',
    padding: '1rem', flexDirection: 'column', color: 'black',
    textDecoration: 'none', alignItems: 'center', textAlign: 'center',
    cursor: href || onClick ? 'pointer' : 'default',
    background: 'white', boxSizing: 'border-box',
    transition: 'background 0.15s',
  };
  if (href || onClick) {
    return (
      <a href={href || '#'} onClick={e => { e.preventDefault(); onClick && onClick(); }}
        style={cardStyle}
        onMouseEnter={e => e.currentTarget.style.background = 'rgb(240,240,240)'}
        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
        {children}
      </a>
    );
  }
  return <div style={cardStyle}>{children}</div>;
}

function Header({ appName, links, currentPath, onNavigate, onLogout }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerStyle = {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
    background: 'rgba(0,0,220,1)', color: 'white',
    height: 'calc(2rem + 2 * 1rem)', width: '100%', boxSizing: 'border-box',
    position: 'sticky', top: 0, zIndex: 200,
  };
  const linkStyle = (active) => ({
    display: 'flex', alignItems: 'center',
    background: 'rgba(0,0,220,1)', color: 'white',
    height: 'calc(2rem + 2 * 1rem)', padding: '0 1rem',
    textDecoration: 'none', fontSize: '0.95rem', boxSizing: 'border-box',
    cursor: 'pointer', border: 'none', fontFamily: 'sans-serif',
    borderBottom: active ? '0.2rem solid white' : 'none',
    paddingTop: active ? 'calc(0.4rem)' : '0',
  });
  return (
    <div style={headerStyle}>
      <span style={{ fontSize: '1.5rem', padding: '0 1rem' }}>{appName || 'Homeserver'}</span>
      <nav style={{ display: 'flex' }}>
        {(links || []).map(l => (
          <a key={l.href} style={linkStyle(currentPath === l.href)}
            onClick={e => { e.preventDefault(); onNavigate && onNavigate(l.href); }}
            href={l.href}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,255,1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,220,1)'}>
            <span>{l.text}</span>
          </a>
        ))}
      </nav>
      <div style={{ flexGrow: 1 }} />
      <a style={{ ...linkStyle(false), cursor:'pointer' }} onClick={e => { e.preventDefault(); onNavigate && onNavigate('/'); }}
        href="/"
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,255,1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,220,1)'}>
        All Applications
      </a>
      <a style={{ ...linkStyle(false), cursor:'pointer' }} onClick={e => { e.preventDefault(); onLogout && onLogout(); }}
        href="/logout"
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,255,1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,220,1)'}>
        Logout
      </a>
    </div>
  );
}

function Sidebar({ open, onClose, title, type, children }) {
  const sideStyle = {
    background: 'white',
    borderRadius: '6px',
    transition: 'width 0.4s, border-width 0.4s, padding 0.4s, margin 0.4s',
    alignSelf: 'flex-start',
    marginTop: '0.25rem',
    overflow: 'hidden',
    position: 'sticky', top: 'calc(2rem + 2 * 1rem + 0.25rem)',
    ...(open ? {
      width: '400px', border: '1px solid black',
      padding: '1rem', marginLeft: '1rem',
      minHeight: '200px',
    } : {
      width: 0, border: '0px solid black',
      padding: 0, marginLeft: 0,
    }),
  };
  return (
    <div style={sideStyle}>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '368px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'left', flexGrow: 1 }}>{title}</h1>
            <Icon name="close" style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }} onClick={onClose} />
          </div>
          {type && <p style={{ margin: '0 0 0.5rem', fontSize: '1.17rem', fontWeight: 'bold' }}>{type}</p>}
          {children}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Button, Input, Card, Header, Sidebar });
