
import { TimeSlot, Registration } from './types';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';

// ==========================================
// 系統全域設定
// ==========================================
export const GLOBAL_GS_URL = ''; // 不再使用 Google Sheets

let registrationsUnsubscribe: Unsubscribe | null = null;

/**
 * 標準化時間格式，確保 8:0 -> 08:00, 08:00 -> 08:00
 */
export const normalizeTime = (timeStr: any): string => {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  const parts = str.split(':');
  if (parts.length < 2) return str;
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * 標準化日期格式，處理 2025/1/22 -> 2025-01-22
 */
export const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  // 處理 ISO 字串或帶時間的字串
  const dateOnly = str.split(' ')[0].split('T')[0];
  const parts = dateOnly.replace(/\//g, '-').split('-');
  if (parts.length !== 3) return dateOnly;
  const y = parts[0];
  const m = parts[1].padStart(2, '0');
  const d = parts[2].padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTime = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const generateTimeSlots = (
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  intervalMinutes: number,
  bookedSlots: string[]
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  let current = new Date();
  current.setHours(startHour, startMinute, 0, 0);

  const end = new Date();
  end.setHours(endHour, endMinute, 0, 0);

  // 在產生時段時，確保比對用的 bookedSlots 都是標準化的
  const normalizedBooked = bookedSlots.map(s => normalizeTime(s));

  while (current < end) {
    const startTimeStr = formatTime(current);
    const next = new Date(current.getTime() + intervalMinutes * 60000);
    const endTimeStr = formatTime(next);

    slots.push({
      label: `${startTimeStr} - ${endTimeStr}`,
      startTime: startTimeStr,
      endTime: endTimeStr,
      isBooked: normalizedBooked.includes(startTimeStr),
    });

    current = next;
  }

  return slots;
};

export const STORAGE_KEY = 'activity_registrations_v2'; // 更新 key 以清除舊格式快取
export const CONFIG_KEY = 'activity_config';

export const getStoredRegistrations = (): Registration[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveRegistrationLocal = (reg: Registration) => {
  const current = getStoredRegistrations();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, reg]));
};

export const overwriteLocalRegistrations = (regs: Registration[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(regs));
};

/**
 * 從 Firestore 讀取所有註冊資料
 */
export const fetchRegistrationsFromFirebase = async (): Promise<Registration[] | null> => {
  try {
    const q = query(collection(db, 'registrations'));
    const snapshot = await getDocs(q);
    
    const registrations: Registration[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      registrations.push({
        id: doc.id,
        name: data.name,
        department: data.department,
        extension: data.extension,
        date: normalizeDate(data.date),
        timeSlot: normalizeTime(data.timeSlot),
        createdAt: data.createdAt || Date.now(),
      });
    });
    
    return registrations;
  } catch (error) {
    console.error('Firestore fetch error:', error);
    return null;
  }
};

/**
 * 監聽 Firestore 資料實時變化，返回取消監聽的函數
 */
export const subscribeToRegistrations = (
  onUpdate: (registrations: Registration[]) => void
): Unsubscribe => {
  const q = query(collection(db, 'registrations'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const registrations: Registration[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      registrations.push({
        id: doc.id,
        name: data.name,
        department: data.department,
        extension: data.extension,
        date: normalizeDate(data.date),
        timeSlot: normalizeTime(data.timeSlot),
        createdAt: data.createdAt || Date.now(),
      });
    });
    
    onUpdate(registrations);
  });
  
  return unsubscribe;
};

/**
 * 保存註冊資料到 Firestore
 */
export const saveToFirebase = async (data: Registration): Promise<boolean> => {
  try {
    const payload = {
      name: data.name,
      department: data.department,
      extension: data.extension,
      date: normalizeDate(data.date),
      timeSlot: normalizeTime(data.timeSlot),
      createdAt: data.createdAt,
    };
    
    await addDoc(collection(db, 'registrations'), payload);
    return true;
  } catch (error) {
    console.error('Firebase save error:', error);
    return false;
  }
};

// 向後相容：提供舊的 Google Sheets 函數名稱（實際上會呼叫 Firebase）
export const fetchRegistrationsFromGoogleSheets = async (): Promise<Registration[] | null> => {
  return fetchRegistrationsFromFirebase();
};

export const saveToGoogleSheets = async (_url: string, data: Registration): Promise<boolean> => {
  return saveToFirebase(data);
};


export const getGoogleSheetsUrl = (): string => {
  return ''; // Firebase 不需要 URL
};

export const setGoogleSheetsUrl = (_url: string) => {
  // Firebase 不需要 URL 配置
};

