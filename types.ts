
export interface Registration {
  id: string;
  name: string;
  department: string;
  extension: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  createdAt: number;
}

export interface TimeSlot {
  label: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export type DayType = '2025-01-22' | '2025-01-23';
