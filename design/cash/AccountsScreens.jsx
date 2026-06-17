// Accounts screen — desktop & mobile

function AccountsDesktop({ selectedId: forcedSelected = 14 }) {
  const [selectedId, setSelectedId] = React.useState(forcedSelected);
  const [hoverId, setHoverId] = React.useState(null);
  const selected = ACCOUNTS_DATA.find(a => a.id === selectedId) || null;

  const tdStyle = {
    padding: '0.7rem 0.75rem',
    borderBottom: '1px solid rgba(220,220,220,1)',
    fontSize: '0.95rem',
  };
  const rowBg = (id) =>
    id === selectedId ? ROW_SELECTED :
    id === hoverId ? ROW_HOVER : 'white';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
      <CashHeader activeTab="Accounts" />
      <PageHeader title="Accounts" actionLabel="Add Account" showSearch searchPlaceholder="Search accounts…" />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '55%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <SortHeader label="Name" dir="asc" />
                <SortHeader label="Type" />
                <SortHeader label="Archived" />
              </tr>
            </thead>
            <tbody>
              {ACCOUNTS_DATA.map(a => (
                <tr key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    onMouseEnter={() => setHoverId(a.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{ background: rowBg(a.id), cursor: 'pointer', opacity: a.archived ? 0.6 : 1 }}>
                  <td style={tdStyle}>{a.name}</td>
                  <td style={tdStyle}><TypeBadge type={a.type} /></td>
                  <td style={tdStyle}>
                    <input type="checkbox" readOnly checked={a.archived} style={{ width: '1.05rem', height: '1.05rem', accentColor: 'rgba(0,0,220,1)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EditPanel
          open={!!selected}
          title="Edit Account"
          onClose={() => setSelectedId(null)}>
          {selected && <>
            <FieldLabel>Name</FieldLabel>
            <FormInput value={selected.name} />
            <FieldLabel>Type</FieldLabel>
            <FormSelect value={selected.type} options={ACCOUNT_TYPES} />
            <FormCheckbox checked={selected.archived} label="Archived" />
            <div style={{ flex: 1 }} />
            <FormButtons onCancel={() => setSelectedId(null)} />
          </>}
        </EditPanel>
      </div>
    </div>
  );
}

function AccountsMobile() {
  const [selectedId, setSelectedId] = React.useState(null);
  const selected = ACCOUNTS_DATA.find(a => a.id === selectedId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', position: 'relative', overflow: 'hidden' }}>
      <CashHeaderMobile activeTab="Accounts" />
      <PageHeader title="Accounts" mobile actionLabel="Add Account" showSearch searchPlaceholder="Search accounts…" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.55)' }}>Sort: Name ↑</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {ACCOUNTS_DATA.map(a => (
          <div key={a.id} onClick={() => setSelectedId(a.id)} style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid rgba(230,230,230,1)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            cursor: 'pointer',
            opacity: a.archived ? 0.55 : 1,
          }}>
            <Icon name={getTypeIcon(a.type)} style={{
              width: '1.4rem', height: '1.4rem',
              color: getTypeColor(a.type), flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.95rem', fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textDecoration: a.archived ? 'line-through' : 'none',
              }}>{a.name}</div>
              <div style={{ fontSize: '0.78rem', marginTop: '0.1rem', color: 'rgba(0,0,0,0.6)' }}>
                <span>{a.type}</span>
                {a.archived && <span style={{ marginLeft: '0.5rem' }}>• archived</span>}
              </div>
            </div>
            <Icon name="caretRight" style={{ width: '0.7rem', height: '0.7rem', opacity: 0.4 }} />
          </div>
        ))}
      </div>
      <EditPanel
        open={!!selected}
        variant="bottom"
        title="Edit Account"
        onClose={() => setSelectedId(null)}>
        {selected && <>
          <FieldLabel>Name</FieldLabel>
          <FormInput value={selected.name} />
          <FieldLabel>Type</FieldLabel>
          <FormSelect value={selected.type} options={ACCOUNT_TYPES} />
          <FormCheckbox checked={selected.archived} label="Archived" />
          <div style={{ flex: 1 }} />
          <FormButtons onCancel={() => setSelectedId(null)} />
        </>}
      </EditPanel>
    </div>
  );
}

Object.assign(window, { AccountsDesktop, AccountsMobile });
