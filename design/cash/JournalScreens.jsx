// Journal screen — desktop & mobile

function JournalDesktop({ selectedId: forcedSelected = 16 }) {
  const [selectedId, setSelectedId] = React.useState(forcedSelected);
  const [hoverId, setHoverId] = React.useState(null);
  const selected = BOOKINGS_DATA.find(b => b.id === selectedId) || null;

  const tdStyle = {
    padding: '0.65rem 0.75rem',
    borderBottom: '1px solid rgba(220,220,220,1)',
    fontSize: '0.95rem', verticalAlign: 'top',
  };
  const rowBg = (id) =>
    id === selectedId ? ROW_SELECTED :
    id === hoverId ? ROW_HOVER : 'white';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
      <CashHeader activeTab="Journal" />
      <PageHeader title="Journal" actionLabel="Add Transaction" showSearch searchPlaceholder="Search transactions…" />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '17%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '40%' }} />
            </colgroup>
            <thead>
              <tr>
                <SortHeader label="Credit Account" />
                <SortHeader label="Debit Account" />
                <SortHeader label="Amount" />
                <SortHeader label="Date" dir="desc" />
                <SortHeader label="Description" />
              </tr>
            </thead>
            <tbody>
              {BOOKINGS_DATA.map(b => (
                <tr key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    onMouseEnter={() => setHoverId(b.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{ background: rowBg(b.id), cursor: 'pointer' }}>
                  <td style={tdStyle}><AccountLink name={b.credit} danger={b.credit === 'Kreditkarte'} /></td>
                  <td style={tdStyle}><AccountLink name={b.debit} danger={b.debit === 'Kreditkarte'} /></td>
                  <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtCHF(b.amount)}</td>
                  <td style={tdStyle}>{b.date}</td>
                  <td style={tdStyle}>{b.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EditPanel
          open={!!selected}
          title="Edit Transaction"
          onClose={() => setSelectedId(null)}>
          {selected && <>
            <FieldLabel>Date</FieldLabel>
            <FormInput value={selected.date} />
            <FieldLabel>Credit Account</FieldLabel>
            <FormSelect value={selected.credit} options={ACCOUNTS_DATA.map(a => a.name)} />
            <FieldLabel>Debit Account</FieldLabel>
            <FormSelect value={selected.debit} options={ACCOUNTS_DATA.map(a => a.name)} />
            <FieldLabel>Amount (CHF)</FieldLabel>
            <FormInput value={selected.amount.toFixed(2)} />
            <FieldLabel>Description</FieldLabel>
            <FormTextarea value={selected.description} />
            <FormButtons onCancel={() => setSelectedId(null)} />
          </>}
        </EditPanel>
      </div>
    </div>
  );
}

function JournalMobile() {
  const [selectedId, setSelectedId] = React.useState(null);
  const selected = BOOKINGS_DATA.find(b => b.id === selectedId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', position: 'relative', overflow: 'hidden' }}>
      <CashHeaderMobile activeTab="Journal" />
      <PageHeader title="Journal" mobile actionLabel="Add Transaction" showSearch searchPlaceholder="Search transactions…" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.55)' }}>Sort: Date ↓</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0.25rem 0.75rem 1rem' }}>
        {BOOKINGS_DATA.map(b => (
          <div key={b.id} onClick={() => setSelectedId(b.id)} style={{
            padding: '0.7rem 0.6rem',
            borderBottom: '1px solid rgba(230,230,230,1)',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.description}</span>
              <span style={{ fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>{fmtCHF(b.amount)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.8rem', color: 'rgba(0,0,0,0.65)' }}>
              <span><AccountLink name={b.credit} danger={b.credit === 'Kreditkarte'} /> <span style={{ color: 'rgba(0,0,0,0.4)' }}>→</span> <AccountLink name={b.debit} danger={b.debit === 'Kreditkarte'} /></span>
              <span>{b.date}</span>
            </div>
          </div>
        ))}
      </div>
      <EditPanel
        open={!!selected}
        variant="bottom"
        title="Edit Transaction"
        onClose={() => setSelectedId(null)}>
        {selected && <>
          <FieldLabel>Date</FieldLabel>
          <FormInput value={selected.date} />
          <FieldLabel>Credit Account</FieldLabel>
          <FormSelect value={selected.credit} options={ACCOUNTS_DATA.map(a => a.name)} />
          <FieldLabel>Debit Account</FieldLabel>
          <FormSelect value={selected.debit} options={ACCOUNTS_DATA.map(a => a.name)} />
          <FieldLabel>Amount (CHF)</FieldLabel>
          <FormInput value={selected.amount.toFixed(2)} />
          <FieldLabel>Description</FieldLabel>
          <FormTextarea value={selected.description} />
          <FormButtons onCancel={() => setSelectedId(null)} />
        </>}
      </EditPanel>
    </div>
  );
}

Object.assign(window, { JournalDesktop, JournalMobile });
