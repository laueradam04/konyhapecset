import { useEffect, useState, type ReactNode } from 'react';
import type { DB, Device } from './data/types';
import { setCurrentStaff, useCurrentStaff, useDB } from './data/store';
import { deviceToday, type DeviceToday } from './logic/tasks';
import { fmtRange, fmtTemp } from './logic/temp';
import { fmtTime } from './logic/dates';

/** Percenként frissülő „most”, hogy a mai állapot éjfélkor is átforduljon. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function staffNameOf(db: DB, id: string): string {
  return db.staff.find((s) => s.id === id)?.name ?? '–';
}

/* --- Ikonok (saját, egyszerű vonalas rajzok) --- */

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const Icon = {
  today: () => (
    <svg {...svgProps}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M8 13l3 3 5-6" />
    </svg>
  ),
  thermo: () => (
    <svg {...svgProps}>
      <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" />
      <path d="M12 9v7" />
    </svg>
  ),
  box: () => (
    <svg {...svgProps}>
      <path d="M3.5 7.5 12 3.5l8.5 4-8.5 4z" />
      <path d="M3.5 7.5v9l8.5 4 8.5-4v-9M12 11.5v9" />
    </svg>
  ),
  doc: () => (
    <svg {...svgProps}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 12.5h7M9 16.5h7" />
    </svg>
  ),
  sliders: () => (
    <svg {...svgProps}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
  check: () => (
    <svg {...svgProps} strokeWidth={3}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  alert: () => (
    <svg {...svgProps} strokeWidth={3}>
      <path d="M12 5v9M12 19h.01" />
    </svg>
  ),
};

/* --- Alsó navigáció --- */

const TABS = [
  { key: 'ma', href: '#/', label: 'Ma', icon: Icon.today },
  { key: 'meres', href: '#/meres', label: 'Mérés', icon: Icon.thermo },
  { key: 'atvetel', href: '#/atvetel', label: 'Átvétel', icon: Icon.box },
  { key: 'naplo', href: '#/naplo', label: 'Napló', icon: Icon.doc },
  { key: 'beallitasok', href: '#/beallitasok', label: 'Beállítások', icon: Icon.sliders },
];

export function TabBar({ active }: { active: string }) {
  return (
    <nav className="tabbar" aria-label="Fő menü">
      <div className="tabbar-inner">
        {TABS.map(({ key, href, label, icon: I }) => (
          <a key={key} href={href} className="tab" aria-current={active === key ? 'page' : undefined}>
            <I />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

/* --- Dolgozóválasztó --- */

export function StaffPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const db = useDB();
  const staff = db.staff.filter((s) => s.active);
  if (staff.length === 0) {
    return (
      <p className="muted">
        Még nincs dolgozó felvéve. <a href="#/beallitasok">Dolgozó hozzáadása</a>
      </p>
    );
  }
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {staff.map((s) => (
          <button
            type="button"
            key={s.id}
            className="chip"
            aria-pressed={value === s.id}
            onClick={() => onChange(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A műszakban lévő dolgozó – ez kerül alapból a mérésekre és feladatokra. */
export function ShiftBar() {
  const current = useCurrentStaff();
  return <StaffPicker value={current} onChange={setCurrentStaff} label="Ki van műszakban?" />;
}

/* --- Igen/Nem választó --- */

export function YesNo({
  label,
  value,
  onChange,
  yes = 'Igen',
  no = 'Nem',
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  yes?: string;
  no?: string;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        <button type="button" aria-pressed={value === true} onClick={() => onChange(true)}>
          {yes}
        </button>
        <button type="button" className="is-no" aria-pressed={value === false} onClick={() => onChange(false)}>
          {no}
        </button>
      </div>
    </div>
  );
}

/* --- Kétlépcsős megerősítés (a beágyazott nézetekben a confirm() ablak nem mindig működik) --- */

export function ConfirmButton({
  label,
  confirmLabel,
  question = 'Biztosan?',
  onConfirm,
  className = 'button',
}: {
  label: ReactNode;
  confirmLabel: string;
  question?: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="confirm" role="group" aria-label={question}>
      <span>{question}</span>
      <button
        type="button"
        className="button danger"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="button" onClick={() => setArmed(false)}>
        Mégse
      </button>
    </span>
  );
}

/* --- Eszközlista mai állapottal --- */

function stateText(s: DeviceToday): string {
  switch (s.state) {
    case 'alert':
      return 'Eltérés, mérd újra';
    case 'missing':
      return 'Ma még nincs mérés';
    case 'partial':
      return `${s.count} / ${s.needed} mérés kész`;
    case 'ok':
      return `Kész, ${fmtTime(s.last!.at)}`;
  }
}

export function DeviceRows({ db, now }: { db: DB; now: Date }) {
  const devices: Device[] = db.devices.filter((d) => d.active);
  if (devices.length === 0) {
    return (
      <p className="empty">
        Még nincs eszköz felvéve. <a href="#/beallitasok">Hűtő vagy fagyasztó hozzáadása</a>
      </p>
    );
  }
  return (
    <ul className="rows">
      {devices.map((d) => {
        const s = deviceToday(d, db.tempLogs, now);
        return (
          <li key={d.id}>
            <a className={`row state-${s.state}`} href={`#/meres/${d.id}`}>
              <span className="row-main">
                <strong>{d.name}</strong>
                <span className="small muted">{fmtRange(d)}</span>
              </span>
              <span className="row-side">
                {s.last && <span className="reading">{fmtTemp(s.last.value)}</span>}
                <span className="small state-text">{stateText(s)}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/* --- Hőmérő-skála: hol van a mért érték a megengedett sávhoz képest --- */

export function RangeBar({ device, value }: { device: Pick<Device, 'min' | 'max'>; value: number | null }) {
  const span = Math.max(device.max - device.min, 4);
  const lo = device.min - span * 0.6;
  const hi = device.max + span * 0.6;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  const left = pct(device.min);
  const right = pct(device.max);
  return (
    <div className="range" aria-hidden="true">
      <div className="range-track">
        <div className="range-safe" style={{ left: `${left}%`, width: `${right - left}%` }} />
        {value !== null && <div className="range-marker" style={{ left: `${pct(value)}%` }} />}
      </div>
      <div className="range-labels">
        <span style={{ left: `${left}%` }}>{String(device.min).replace('-', '−').replace('.', ',')}</span>
        <span style={{ left: `${right}%` }}>{String(device.max).replace('-', '−').replace('.', ',')}</span>
      </div>
    </div>
  );
}
