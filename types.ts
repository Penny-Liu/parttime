export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
}

export interface User {
  id: string;
  name: string;
  password?: string; // Optional for security in frontend list display
  color: string; // Tailwind color class or hex
  role: UserRole;
}

export interface ShiftDay {
  date: string; // YYYY-MM-DD
  signups: string[]; // User IDs of students who signed up
  confirmedUserId?: string; // ID of the student actually assigned
  isClosed?: boolean; // Is clinic closed manually
}

export interface ShiftMap {
  [date: string]: ShiftDay;
}

export interface AppSettings {
  adminPassword?: string; // Should be handled carefully
  holidays: string[]; // List of YYYY-MM-DD strings
  googleSheetUrl?: string; // URL to the Google Sheet or Backend
}

export interface AppData {
  users: User[];
  shifts: ShiftMap;
  settings: AppSettings;
}

export interface ApiPayload {
  action: 'getData' | 'login' | 'toggleSignup' | 'assignShift' | 'updateSettings' | 'manageUser' | 'setHoliday' | 'initialize';
  payload?: any;
}