export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
  institutionId?: string;
  isFirstAccess?: boolean;
}

export type UserRole = "admin" | "coordinator" | "teacher" | "student";

export interface Institution {
  id: string;
  name: string;
  logo?: string;
  active: boolean;
  settings: InstitutionSettings;
}

export interface InstitutionSettings {
  id: string;
  institution_id: string;
  attendance_validation_method: 'qrcode' | 'geolocation' | 'code' | 'manual';
  attendance_window_minutes: number;
  primary_color: string;
  default_temporary_password?: string;
  latitude: number;
  longitude: number;
  geolocation_radius: number;
  created_at: string;
  updated_at: string;
  classTimes?: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
  }>;
}

export interface ClassTime {
  id: string;
  name: string;
  start_time: string; // Format: "HH:MM"
  end_time: string; // Format: "HH:MM"
  days_of_week: number[]; // 0 = Sunday, 1 = Monday, etc.
  institution_id: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  institutionId: string;
  active: boolean;
}

export interface Class {
  id: string;
  date: string; // ISO date
  subject_id: string;
  subject?: {
    id: string;
    name: string;
  };
  teacher_id: string;
  teacher?: {
    id: string;
    name: string;
  };
  class_time_id: string;
  classTime?: ClassTime;
  institution_id: string;
  title?: string;
  description?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  id: string;
  class_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'pending';
  confirmed_at?: string;
  confirmed_by?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  distance_from_institution?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GeolocationError {
  code: number;
  message: string;
}
