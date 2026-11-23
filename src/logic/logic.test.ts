import { describe, expect, it } from 'vitest';
import { applyKey, fmtRange, fmtTemp, inRange, parseReading } from './temp';
import { dayKey, shiftMonth, startOfWeek, daysInMonth } from './dates';
import { deviceToday, doneInPeriod } from './tasks';
import { monthReport } from './report';
import { seedDemo } from '../data/demo';
import type { Device, Task } from '../data/types';

const fridge: Device = {
  id: 'd1', name: 'Hűtő', kind: 'hűtő', min: 0, max: 5, checksPerDay: 2, active: true,
  createdAt: new Date(2026, 10, 1, 6).toISOString(),
};

describe('hőmérséklet', () => {
  it('a határok a tartomány részei', () => {
    expect(inRange(0, fridge)).toBe(true);
    expect(inRange(5, fridge)).toBe(true);
    expect(inRange(5.1, fridge)).toBe(false);
    expect(inRange(-0.1, fridge)).toBe(false);
  });

  it('magyar formátumban ír ki', () => {
    expect(fmtTemp(3.5)).toBe('3,5 °C');
    expect(fmtTemp(-18)).toBe('−18,0 °C');
    expect(fmtRange({ min: -30, max: -18 })).toBe('−30 és −18 °C között');
  });

  it('értelmezi a leolvasást', () => {
    expect(parseReading('3,5')).toBe(3.5);
    expect(parseReading('-18')).toBe(-18);
    expect(parseReading('4,')).toBe(4);
    expect(parseReading('-')).toBeNull();
    expect(parseReading('')).toBeNull();
    expect(parseReading('3,55')).toBeNull();
    expect(parseReading('1000')).toBeNull();
  });

  it('a billentyűzet helyesen építi az értéket', () => {
    const type = (keys: string[]) => keys.reduce(applyKey, '');
    expect(type(['3', ',', '5'])).toBe('3,5');
    expect(type([',', '5'])).toBe('0,5');
    expect(type(['±', '1', '8'])).toBe('-18');
    expect(type(['1', '8', '±'])).toBe('-18');
    expect(type(['0', '7'])).toBe('7');
    expect(type(['3', ',', '5', '5'])).toBe('3,5');
    expect(type(['1', '2', '3', '4'])).toBe('123');
    expect(type(['3', ',', ','])).toBe('3,');
    expect(type(['3', ',', '5', 'del', 'del'])).toBe('3');
  });
});

describe('dátumok', () => {
  it('a hét hétfőn kezdődik', () => {
    expect(dayKey(startOfWeek(new Date(2026, 10, 23)))).toBe('2026-11-23'); // hétfő
    expect(dayKey(startOfWeek(new Date(2026, 10, 29)))).toBe('2026-11-23'); // vasárnap
  });
  it('hónapok léptetése és hossza', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(daysInMonth('2028-02')).toBe(29);
  });
});

describe('feladatok és eszközök állapota', () => {
  const weekly: Task = { id: 't', title: 'Hűtők takarítása', frequency: 'heti', active: true };
  it('a heti feladat a hét bármely napján elvégzettnek számít', () => {
    const done = [{ id: 'x', taskId: 't', staffId: 's', at: new Date(2026, 10, 23, 16).toISOString() }];
    expect(doneInPeriod(weekly, done, new Date(2026, 10, 27, 9))).toBeDefined();
    expect(doneInPeriod(weekly, done, new Date(2026, 10, 30, 9))).toBeUndefined();
  });

  it('eltérés után az újramérés rendezi az állapotot', () => {
    const now = new Date(2026, 10, 23, 12);
    const bad = { id: 'a', deviceId: 'd1', value: 7.2, ok: false, at: new Date(2026, 10, 23, 7).toISOString(), staffId: 's' };
    const good = { id: 'b', deviceId: 'd1', value: 3.9, ok: true, at: new Date(2026, 10, 23, 7, 40).toISOString(), staffId: 's' };
    expect(deviceToday(fridge, [bad], now).state).toBe('alert');
    expect(deviceToday(fridge, [bad, good], now).state).toBe('ok');
    expect(deviceToday(fridge, [good], now).state).toBe('partial');
    expect(deviceToday(fridge, [], now).state).toBe('missing');
  });
});

describe('havi napló és demó', () => {
  const now = new Date(2026, 10, 23, 15, 0);
  const db = seedDemo(now);

  it('a demó adatai összefüggőek', () => {
    const deviceIds = new Set(db.devices.map((d) => d.id));
    const staffIds = new Set(db.staff.map((s) => s.id));
    expect(db.tempLogs.every((l) => deviceIds.has(l.deviceId) && staffIds.has(l.staffId))).toBe(true);
    expect(db.tempLogs.every((l) => new Date(l.at) <= now)).toBe(true);
    expect(db.tempLogs.filter((l) => !l.ok)).toHaveLength(1);
    expect(db.tempLogs.filter((l) => !l.ok).every((l) => l.action)).toBe(true);
    expect(db.deliveries.some((d) => !d.accepted)).toBe(true);
  });

  it('a napló jelzi a kimaradt mérési napot', () => {
    const r = monthReport(db, '2026-11', now);
    const d2 = r.devices.find((s) => s.device.id === 'd2')!;
    expect(d2.missingDays).toEqual([14]);
    const d1 = r.devices.find((s) => s.device.id === 'd1')!;
    expect(d1.missingDays).toEqual([]);
    expect(d1.alerts).toBe(1);
    // a használat kezdete előtti napok és a még tartó mai nap nem számítanak hiánynak
    expect(r.devices.every((s) => s.missingDays.every((day) => day >= 10 && day < 23))).toBe(true);
    expect(r.days[0]).toBe('2026-11-10'); // a használat kezdete
    expect(r.days).toHaveLength(14);
    expect(r.alerts).toHaveLength(1);
  });

  it('a feladat-összesítő jelzi a kihagyott takarítást, a mait nem', () => {
    const r = monthReport(db, '2026-11', now);
    expect(r.taskSummary.find((s) => s.task.id === 't2')!.missingDays).toEqual([17]);
    expect(r.taskSummary.find((s) => s.task.id === 't1')!.missingDays).toEqual([]);
    // heti feladatnál nincs napi hiánylista
    expect(r.taskSummary.find((s) => s.task.frequency === 'heti')!.missingDays).toEqual([]);
  });
});
