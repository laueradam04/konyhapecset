export type DeviceKind = 'hűtő' | 'fagyasztó' | 'melegentartó' | 'egyéb';
export type Frequency = 'napi' | 'heti' | 'havi';

export interface Settings {
  unitName: string;
  felir: string;
  address: string;
  createdAt: string;
  demo: boolean;
}

export interface Staff {
  id: string;
  name: string;
  active: boolean;
}

export interface Device {
  id: string;
  name: string;
  kind: DeviceKind;
  /** Megengedett tartomány alsó határa, °C */
  min: number;
  /** Megengedett tartomány felső határa, °C */
  max: number;
  /** Hány mérés kell naponta (reggel / délután) */
  checksPerDay: 1 | 2;
  active: boolean;
  createdAt: string;
}

export interface TempLog {
  id: string;
  deviceId: string;
  value: number;
  ok: boolean;
  at: string;
  staffId: string;
  /** Kötelező, ha az érték kívül esik a tartományon */
  action?: string;
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  frequency: Frequency;
  active: boolean;
}

export interface TaskDone {
  id: string;
  taskId: string;
  at: string;
  staffId: string;
}

export interface Delivery {
  id: string;
  at: string;
  supplier: string;
  product: string;
  temp: number | null;
  packagingOk: boolean;
  dateOk: boolean;
  accepted: boolean;
  staffId: string;
  note?: string;
}

export interface DB {
  version: 1;
  settings: Settings | null;
  staff: Staff[];
  devices: Device[];
  tempLogs: TempLog[];
  tasks: Task[];
  taskDone: TaskDone[];
  deliveries: Delivery[];
}
