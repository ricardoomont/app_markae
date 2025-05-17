
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
  institutionId?: string;
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
  classTimes: ClassTime[];
  attendanceValidationMethod: "qrcode" | "geolocation" | "code" | "manual";
  attendanceWindowMinutes: number;
  logo?: string;
  primaryColor?: string;
}

export interface ClassTime {
  id: string;
  name: string;
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
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
  subjectId: string;
  subject?: Subject;
  teacherId: string;
  teacher?: User;
  classTimeId: string;
  classTime?: ClassTime;
  institutionId: string;
  title?: string;
  description?: string;
}

export interface Attendance {
  id: string;
  classId: string;
  studentId: string;
  student?: User;
  status: "present" | "absent" | "late" | "excused";
  confirmedAt?: string; // ISO date
  confirmedBy?: string; // User ID of who confirmed (teacher, admin, or self)
  notes?: string;
}
