export type FunctionName = string;

export interface Employee {
  id: string;
  name: string;
  functions: FunctionName[];
}

export interface Location {
  id: string;
  name: string;
  type: string;
  city: string;
  clientId?: string | null;
  /** archived locations can no longer be booked; their existing shifts stay visible */
  archived?: boolean;
}

export interface Client {
  id: string;
  name: string;
}

export interface Licence {
  employeeId: string;
  type: string;
  /** null: does not expire (VOG) */
  expiresOn: string | null;
}

export interface PackingItem {
  item: string;
  qty: number;
}

export interface Activity {
  id: string;
  name: string;
  packingList: PackingItem[];
}

export interface Bag {
  id: string;
  activityId: string;
  label: string;
}

/** An open "er mist iets" report on a bag (resolved ones are not loaded). */
export interface MissingReport {
  id: string;
  bagId: string;
  text: string;
  createdAt: string;
  employeeId: string | null;
}

/** Travel time between two location ids, the same in both directions. */
export interface TravelTime {
  a: string;
  b: string;
  minutes: number;
}

export interface Unavailability {
  id: string;
  employeeId: string;
  date: string;
  from: string;
  to: string;
  reason: string;
}

export type ShiftStatus = "active" | "cancelled";

export interface Shift {
  id: string;
  code: string;
  date: string;
  start: string;
  end: string;
  locationId: string;
  fn: FunctionName;
  /** null means: open shift, nobody planned yet */
  employeeId: string | null;
  status: ShiftStatus;
  note: string | null;
  seriesId: string | null;
  /** licences required on top of the location type's requirements */
  extraRequirements?: string[];
  activityId?: string | null;
  bagId?: string | null;
}

export interface PlanData {
  employees: Employee[];
  locations: Location[];
  travel: TravelTime[];
  unavailability: Unavailability[];
  shifts: Shift[];
  /** Extension (self-made data). When `requirements` is absent the licence check is off. */
  licences?: Licence[];
  requirements?: Record<string, string[]>;
  clients?: Client[];
  activities?: Activity[];
  bags?: Bag[];
  missing?: MissingReport[];
}

export type ConflictType = "overlap" | "travel" | "unavailable" | "function" | "licence" | "bag";

export interface Conflict {
  type: ConflictType;
  employeeId: string;
  date: string;
  /** shifts involved (1 or 2) */
  shiftIds: string[];
  /** Dutch, human readable */
  message: string;
}
