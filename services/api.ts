import { GAS_API_URL, TAIWAN_HOLIDAYS_2026_2027, DEFAULT_DB_URL } from '../constants';
import { AppData, ApiPayload, UserRole, ShiftMap, User } from '../types';

// Mock data for initial load if API fails or is empty
const MOCK_DATA: AppData = {
  users: [
    { id: 'u1', name: '昀儒', color: 'bg-blue-100 text-green-800', role: UserRole.STUDENT, password: '1234' },
    { id: 'u2', name: '語晨', color: 'bg-green-100 text-pink-800', role: UserRole.STUDENT, password: '4321' },
    { id: 'u3', name: '蘇蘇', color: 'bg-pink-100 text-blue-800', role: UserRole.STUDENT, password: '0000' },
  ],
  shifts: {},
  settings: {
    holidays: TAIWAN_HOLIDAYS_2026_2027, 
    adminPassword: 'admin',
    googleSheetUrl: DEFAULT_DB_URL,
  },
};

// Helper to safely format any date string/object to YYYY-MM-DD
const normalizeDateKey = (key: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  const d = new Date(key);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return key;
};

export const fetchAppData = async (): Promise<AppData> => {
  try {
    const cacheBuster = new Date().getTime();
    const response = await fetch(`${GAS_API_URL}?action=getData&t=${cacheBuster}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const rawData = await response.json();
    
    if (rawData.error) {
      throw new Error(rawData.error);
    }

    if (!rawData.users || !rawData.shifts) {
      console.warn("API returned incomplete data, using mock/partial data", rawData);
      return { ...MOCK_DATA, ...rawData };
    }

    // FIX: Normalize User IDs to strings immediately to prevent type mismatch bugs
    if (rawData.users) {
      rawData.users = rawData.users.map((u: any) => ({
        ...u,
        id: String(u.id)
      }));
    }

    // FIX: Normalize Shift Keys to YYYY-MM-DD
    const normalizedShifts: ShiftMap = {};
    if (rawData.shifts) {
      Object.keys(rawData.shifts).forEach(key => {
        const newKey = normalizeDateKey(key);
        normalizedShifts[newKey] = rawData.shifts[key];
        normalizedShifts[newKey].date = newKey;
      });
    }

    return { ...rawData, shifts: normalizedShifts };
  } catch (error) {
    console.error("Failed to fetch data from GAS:", error);
    return MOCK_DATA;
  }
};

export const sendAction = async (payload: ApiPayload): Promise<AppData | null> => {
  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      console.error("GAS Script Error:", result.error);
      throw new Error(result.error); 
    }

    return result; 
  } catch (error: any) {
    console.error("Action failed:", error);
    throw error; 
  }
};