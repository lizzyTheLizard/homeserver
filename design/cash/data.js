// Sample data for the Cash application

const ACCOUNTS_DATA = [
  { id: 1,  name: '3. Säule BEKB',              type: 'Asset',     archived: true  },
  { id: 2,  name: '3. Säule Post',              type: 'Asset',     archived: true  },
  { id: 3,  name: 'Andere Ausgaben',            type: 'Expense',   archived: false },
  { id: 4,  name: 'Andere Einkommen',           type: 'Income',    archived: false },
  { id: 5,  name: 'Anschaffungen',              type: 'Expense',   archived: false },
  { id: 6,  name: 'Depot BEKB',                 type: 'Asset',     archived: false },
  { id: 7,  name: 'E-Trading',                  type: 'Asset',     archived: true  },
  { id: 8,  name: 'finvest 3A',                 type: 'Asset',     archived: false },
  { id: 9,  name: 'Gemeinsam',                  type: 'Asset',     archived: false },
  { id: 10, name: 'Gesundheit, Versicherungen', type: 'Expense',   archived: true  },
  { id: 11, name: 'Gewinn',                     type: 'Profit',    archived: false },
  { id: 12, name: 'Guthaben',                   type: 'Asset',     archived: false },
  { id: 13, name: 'Kleider und Co.',            type: 'Expense',   archived: true  },
  { id: 14, name: 'Kreditkarte',                type: 'Liability', archived: false },
  { id: 15, name: 'Lohn',                       type: 'Income',    archived: false },
  { id: 16, name: 'Miete und Co.',              type: 'Expense',   archived: true  },
  { id: 17, name: 'Neon',                       type: 'Cash',      archived: false },
  { id: 18, name: 'Postkonto',                  type: 'Cash',      archived: true  },
  { id: 19, name: 'Reserve Babypause',          type: 'Asset',     archived: true  },
  { id: 20, name: 'Revolut CHF',                type: 'Cash',      archived: true  },
  { id: 21, name: 'Revolut EUR',                type: 'Cash',      archived: true  },
  { id: 22, name: 'Sackgeld',                   type: 'Expense',   archived: false },
  { id: 23, name: 'Bargeld',                    type: 'Cash',      archived: false },
  { id: 24, name: 'Eigenkapital',               type: 'Equity',    archived: false },
];

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Income', 'Expense', 'Cash', 'Equity', 'Profit'];

// Bookings (Journal entries) — April 2026
const BOOKINGS_DATA = [
  { id: 1,  date: '30.04.2026', credit: 'Neon',        debit: 'Lohn',          amount: 6920.90, description: 'Gesendet mit neon' },
  { id: 2,  date: '30.04.2026', credit: 'Neon',        debit: 'Sackgeld',      amount: 346.90,  description: 'Remaining amount for 2026-04' },
  { id: 3,  date: '24.04.2026', credit: 'Lohn',        debit: 'Neon',          amount: 8120.90, description: 'Rg.2482000720 Vonwage/Salary 00012482/202604 Sala' },
  { id: 4,  date: '20.04.2026', credit: 'Neon',        debit: 'Anschaffungen', amount: 125.89,  description: 'Seidensticker Hemden' },
  { id: 5,  date: '20.04.2026', credit: 'Kreditkarte', debit: 'Sackgeld',      amount: 5.15,    description: 'Figma' },
  { id: 6,  date: '17.04.2026', credit: 'Kreditkarte', debit: 'Sackgeld',      amount: 39.25,   description: 'Claude' },
  { id: 7,  date: '15.04.2026', credit: 'Neon',        debit: 'Kreditkarte',   amount: 282.40,  description: 'Viseca Card Services' },
  { id: 8,  date: '14.04.2026', credit: 'Neon',        debit: 'Anschaffungen', amount: 17.90,   description: 'Etherna' },
  { id: 9,  date: '13.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 36.00,   description: 'Tamedia' },
  { id: 10, date: '09.04.2026', credit: 'Kreditkarte', debit: 'Sackgeld',      amount: 0.40,    description: 'Microsoft' },
  { id: 11, date: '08.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 29.50,   description: 'Finnair' },
  { id: 12, date: '08.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 36.90,   description: 'Finnair' },
  { id: 13, date: '08.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 29.00,   description: 'Grimenz' },
  { id: 14, date: '08.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 609.00,  description: 'Finnair' },
  { id: 15, date: '08.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 794.00,  description: 'Finnair' },
  { id: 16, date: '08.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 8.80,    description: 'Restaurant Bendolla' },
  { id: 17, date: '08.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 36.90,   description: 'Finnair' },
  { id: 18, date: '07.04.2026', credit: 'Kreditkarte', debit: 'Sackgeld',      amount: 0.05,    description: 'GitHub' },
  { id: 19, date: '06.04.2026', credit: 'Neon',        debit: 'Gemeinsam',     amount: 28.20,   description: 'Coop' },
  { id: 20, date: '03.04.2026', credit: 'Kreditkarte', debit: 'Sackgeld',      amount: 17.80,   description: 'Claude' },
];

// Per-account bookings for "Neon" view (other-account perspective + running total)
// Negative amounts = outgoing (credit side from Neon perspective)
const NEON_BOOKINGS = [
  { id: 1,  otherAccount: 'Sackgeld',      amount: -346.90,   total: 1202.01, date: '30.04.2026', description: 'Remaining amount for 2026-04' },
  { id: 2,  otherAccount: 'Lohn',          amount: -6920.90,  total: 1548.91, date: '30.04.2026', description: 'Gesendet mit neon' },
  { id: 3,  otherAccount: 'Lohn',          amount: 8120.90,   total: 8469.81, date: '24.04.2026', description: 'Rg.2482000720 Vonwage/Salary 00012482/202604 Sala' },
  { id: 4,  otherAccount: 'Anschaffungen', amount: -125.89,   total: 348.91,  date: '20.04.2026', description: 'Seidensticker Hemden' },
  { id: 5,  otherAccount: 'Kreditkarte',   amount: -282.40,   total: 474.80,  date: '15.04.2026', description: 'Viseca Card Services' },
  { id: 6,  otherAccount: 'Anschaffungen', amount: -17.90,    total: 757.20,  date: '14.04.2026', description: 'Etherna' },
  { id: 7,  otherAccount: 'Gemeinsam',     amount: -36.00,    total: 775.10,  date: '13.04.2026', description: 'Tamedia' },
  { id: 8,  otherAccount: 'Gemeinsam',     amount: -36.90,    total: 811.10,  date: '08.04.2026', description: 'Finnair' },
  { id: 9,  otherAccount: 'Gemeinsam',     amount: -75.00,    total: 848.00,  date: '08.04.2026', description: 'Finnair' },
  { id: 10, otherAccount: 'Gemeinsam',     amount: -29.50,    total: 923.00,  date: '08.04.2026', description: 'Finnair' },
  { id: 11, otherAccount: 'Gemeinsam',     amount: -29.50,    total: 952.50,  date: '08.04.2026', description: 'Finnair' },
  { id: 12, otherAccount: 'Gemeinsam',     amount: -794.00,   total: 982.00,  date: '08.04.2026', description: 'Finnair' },
  { id: 13, otherAccount: 'Gemeinsam',     amount: -36.90,    total: 1776.00, date: '08.04.2026', description: 'Finnair' },
  { id: 14, otherAccount: 'Gemeinsam',     amount: -8.80,     total: 1812.90, date: '08.04.2026', description: 'Restaurant Bendolla' },
  { id: 15, otherAccount: 'Gemeinsam',     amount: -29.00,    total: 1821.70, date: '08.04.2026', description: 'Grimenz' },
  { id: 16, otherAccount: 'Gemeinsam',     amount: -28.20,    total: 3320.10, date: '06.04.2026', description: 'Coop' },
  { id: 17, otherAccount: 'Gemeinsam',     amount: 251.36,    total: 5363.65, date: '02.04.2026', description: 'Einkaufe Marz' },
  { id: 18, otherAccount: 'Gemeinsam',     amount: -1015.35,  total: 3348.30, date: '02.04.2026', description: 'Steuern Ruckzahlung' },
  { id: 19, otherAccount: 'Gemeinsam',     amount: -1000.00,  total: 4363.65, date: '02.04.2026', description: 'Kindergeld Jan, feb' },
  { id: 20, otherAccount: 'Gemeinsam',     amount: -500.00,   total: 5112.29, date: '02.04.2026', description: 'Kindergeld' },
];

Object.assign(window, { ACCOUNTS_DATA, ACCOUNT_TYPES, BOOKINGS_DATA, NEON_BOOKINGS });
