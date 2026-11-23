import type { DB, Delivery, Device, DeviceKind, Frequency, Settings, Staff, Task, TempLog } from './types';
import { DEFAULT_TASKS, KINDS, emptyDB } from './defaults';
import { store, uid } from './store';
import { inRange } from '../logic/temp';
import { seedDemo } from './demo';

export function addTempLog(
  input: { deviceId: string; value: number; staffId: string; action?: string; note?: string },
  device: Device,
  now = new Date(),
): TempLog {
  const log: TempLog = {
    id: uid(),
    deviceId: input.deviceId,
    value: input.value,
    ok: inRange(input.value, device),
    at: now.toISOString(),
    staffId: input.staffId,
    ...(input.action ? { action: input.action } : {}),
    ...(input.note ? { note: input.note } : {}),
  };
  store.update((db) => ({ ...db, tempLogs: [...db.tempLogs, log] }));
  return log;
}

export function completeTask(taskId: string, staffId: string, now = new Date()): void {
  store.update((db) => ({
    ...db,
    taskDone: [...db.taskDone, { id: uid(), taskId, staffId, at: now.toISOString() }],
  }));
}

export function undoTask(doneId: string): void {
  store.update((db) => ({ ...db, taskDone: db.taskDone.filter((d) => d.id !== doneId) }));
}

export function addDelivery(input: Omit<Delivery, 'id' | 'at'>, now = new Date()): Delivery {
  const d: Delivery = { ...input, id: uid(), at: now.toISOString() };
  store.update((db) => ({ ...db, deliveries: [...db.deliveries, d] }));
  return d;
}

export function saveSettings(patch: Partial<Settings>): void {
  store.update((db) => (db.settings ? { ...db, settings: { ...db.settings, ...patch } } : db));
}

export function addStaff(name: string): void {
  store.update((db) => ({ ...db, staff: [...db.staff, { id: uid(), name: name.trim(), active: true }] }));
}

export function updateStaff(id: string, patch: Partial<Staff>): void {
  store.update((db) => ({ ...db, staff: db.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
}

export function upsertDevice(device: Omit<Device, 'id' | 'createdAt'> & { id?: string }): void {
  store.update((db) => {
    if (device.id) {
      return { ...db, devices: db.devices.map((d) => (d.id === device.id ? { ...d, ...device, id: d.id } : d)) };
    }
    const created: Device = { ...device, id: uid(), createdAt: new Date().toISOString() };
    return { ...db, devices: [...db.devices, created] };
  });
}

export function addTask(title: string, frequency: Frequency): void {
  store.update((db) => ({ ...db, tasks: [...db.tasks, { id: uid(), title: title.trim(), frequency, active: true }] }));
}

export function updateTask(id: string, patch: Partial<Task>): void {
  store.update((db) => ({ ...db, tasks: db.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
}

export function setupKitchen(input: {
  unitName: string;
  felir: string;
  staffNames: string[];
  devices: { name: string; kind: DeviceKind }[];
}): void {
  const now = new Date().toISOString();
  const db: DB = {
    ...emptyDB(),
    settings: { unitName: input.unitName.trim(), felir: input.felir.trim(), address: '', createdAt: now, demo: false },
    staff: input.staffNames.map((name) => ({ id: uid(), name, active: true })),
    devices: input.devices.map((d) => ({
      id: uid(),
      name: d.name.trim(),
      kind: d.kind,
      min: KINDS[d.kind].min,
      max: KINDS[d.kind].max,
      checksPerDay: KINDS[d.kind].checksPerDay,
      active: true,
      createdAt: now,
    })),
    tasks: DEFAULT_TASKS.map((t) => ({ id: uid(), title: t.title, frequency: t.frequency, active: true })),
  };
  store.update(() => db);
}

export function loadDemo(): void {
  store.update(() => seedDemo(new Date()));
}

export function resetAll(): void {
  store.update(() => emptyDB());
}

export function replaceAll(db: DB): void {
  store.update(() => db);
}
