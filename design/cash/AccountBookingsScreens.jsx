// AccountBookings screen — desktop & mobile (single-account journal view)

function AccountBookingsDesktop({ accountName = 'Neon', selectedId: forcedSelected = 1 }) {
  const [selectedId, setSelectedId] = React.useState(forcedSelected);
  const [hoverId, setHoverId] = React.useState(null);
  const selected = NEON_BOOKINGS.find(b => b.id === selectedId) || null;

  const tdStyle = {
    padding: '0.65rem 0.75rem',
    borderBottom: '1px solid rgba(220,220,220,1)',
    fontSize: '0.95rem',
  };
  const rowBg = (id) =>
    id === selectedId ? ROW_SELECTED :
    id === hoverId ? ROW_HOVER : 'white';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
      <CashHeader activeTab="Journal" />
      <PageHeader title={accountName} actionLabel="Add Transaction" showSearch searchPlaceholder="Search transactions…" />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '40%' }} />
            </colgroup>
            <thead>
              <tr>
                <SortHeader label="Other Account" />
                <SortHeader label="Amount" />
                <SortHeader label="Total" />
                <SortHeader label="Date" dir="desc" />
                <SortHeader label="Description" />
              </tr>
            </thead>
            <tbody>
              {NEON_BOOKINGS.map(b => (
                <tr key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    onMouseEnter={() => setHoverId(b.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{ background: rowBg(b.id), cursor: 'pointer' }}>
                  <td style={tdStyle}><AccountLink name={b.otherAccount} /></td>
                  <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums', color: b.amount < 0 ? 'rgba(220,0,0,1)' : 'black' }}>
                    {fmtCHF(b.amount)}
                  </td>
                  <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtCHF(b.total)}</td>
                  <td style={tdStyle}>{b.date}</td>
                  <td style={tdStyle}>{b.description}</td>
                </tr>
              ))}
              <tr style={{ background: 'rgb(250,250,250)' }}>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums', fontStyle: 'italic' }}>{fmtCHF(5612.29)}</td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, fontStyle: 'italic', color: 'rgba(0,0,0,0.6)' }}>Opening Balance</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EditPanel
          open={!!selected}
          title="Edit Transaction"
          subtitle={`Account: ${accountName}`}
          onClose={() => setSelectedId(null)}>
          {selected && <>
            <FieldLabel>Date</FieldLabel>
            <FormInput value={selected.date} />
            <FieldLabel>Other Account</FieldLabel>
            <FormSelect value={selected.otherAccount} options={ACCOUNTS_DATA.map(a => a.name)} />
            <FieldLabel>Amount (CHF) — negative = outgoing</FieldLabel>
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

function AccountBookingsMobile({ accountName = 'Neon' }) {
  const [selectedId, setSelectedId] = React.useState(null);
  const selected = NEON_BOOKINGS.find(b => b.id === selectedId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', position: 'relative', overflow: 'hidden' }}>
      <CashHeaderMobile activeTab="Journal" />
      <div style={{ padding: '0.75rem 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon name="caretRight" style={{ width: '0.8rem', height: '0.8rem', transform: 'rotate(180deg)', opacity: 0.7 }} />
        <span style={{ fontSize: '0.85rem', color: 'rgba(0,0,220,1)' }}>Journal</span>
      </div>
      <PageHeader title={accountName} mobile actionLabel="Add Transaction" showSearch searchPlaceholder="Search transactions…" />
      <div style={{ padding: '0 1rem 0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.55)' }}>Closing balance</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>CHF 1'202.01</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.55)' }}>Sort: Date ↓</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {NEON_BOOKINGS.map(b => (
          <div key={b.id} onClick={() => setSelectedId(b.id)} style={{
            padding: '0.7rem 1rem',
            borderBottom: '1px solid rgba(230,230,230,1)',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.description}</span>
              <span style={{
                fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums',
                color: b.amount < 0 ? 'rgba(220,0,0,1)' : 'black',
              }}>{fmtCHF(b.amount)}</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '0.2rem', fontSize: '0.8rem', color: 'rgba(0,0,0,0.65)',
            }}>
              <span><AccountLink name={b.otherAccount} /> <span style={{ color: 'rgba(0,0,0,0.4)' }}>•</span> {b.date}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'rgba(0,0,0,0.5)' }}>Total {fmtCHF(b.total)}</span>
            </div>
          </div>
        ))}
        <div style={{
          padding: '0.7rem 1rem', background: 'rgb(250,250,250)',
          fontSize: '0.85rem', color: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'space-between',
          fontStyle: 'italic',
        }}>
          <span>Opening Balance</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCHF(5612.29)}</span>
        </div>
      </div>
      <EditPanel
        open={!!selected}
        variant="bottom"
        title="Edit Transaction"
        subtitle={`Account: ${accountName}`}
        onClose={() => setSelectedId(null)}>
        {selected && <>
          <FieldLabel>Date</FieldLabel>
          <FormInput value={selected.date} />
          <FieldLabel>Other Account</FieldLabel>
          <FormSelect value={selected.otherAccount} options={ACCOUNTS_DATA.map(a => a.name)} />
          <FieldLabel>Amount (CHF) — negative = outgoing</FieldLabel>
          <FormInput value={selected.amount.toFixed(2)} />
          <FieldLabel>Description</FieldLabel>
          <FormTextarea value={selected.description} />
          <FormButtons onCancel={() => setSelectedId(null)} />
        </>}
      </EditPanel>
    </div>
  );
}

Object.assign(window, { AccountBookingsDesktop, AccountBookingsMobile });
