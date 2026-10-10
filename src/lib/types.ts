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
}

export interface PlanData {
  employees: Employee[];
  locations: Location[];
  travel: TravelTime[];
  unavailability: Unavailability[];
  shifts: Shift[];
}

export type ConflictType = "overlap" | "travel" | "unavailable" | "function";

export interface Conflict {
  type: ConflictType;
  employeeId: string;
  date: string;
  /** shifts involved (1 or 2) */
  shiftIds: string[];
  /** Dutch, human readable */
  message: string;
}
