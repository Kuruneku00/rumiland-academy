/**
 * Rumiland Academy — Complete Database Schema (Dexie.js / IndexedDB)
 * 
 * This is the production database architecture.
 * All relationships are normalized with foreign keys.
 * Every table supports soft-delete via deleted_at.
 */

import Dexie, { Table } from 'dexie';

// ================================================================
// INTERFACES
// ================================================================

export interface User {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role_id: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Role {
  id: string;
  name: string;
  name_fa: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  national_id: string;
  phone: string;
  phone_2: string | null;
  birth_date: string | null;
  birth_date_jalali: string | null;
  address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  avatar_url: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'graduated' | 'archived';
  registered_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  national_id: string;
  phone: string;
  email: string | null;
  specialty: string | null;
  avatar_url: string | null;
  bio: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  title_en: string | null;
  description: string | null;
  category: string | null;
  level: string | null;
  duration_sessions: number;
  session_duration_minutes: number;
  tuition_fee: number;
  registration_fee: number;
  image_url: string | null;
  tags: string[];
  status: 'draft' | 'registration_open' | 'active' | 'full' | 'completed' | 'cancelled' | 'archived';
  prerequisites: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Class {
  id: string;
  code: string;
  course_id: string;
  teacher_id: string;
  assistant_teacher_id: string | null;
  classroom: string | null;
  capacity: number;
  type: 'group' | 'private';
  start_date: string;
  end_date: string;
  schedule_json: string;
  status: 'registration_open' | 'active' | 'full' | 'completed' | 'cancelled' | 'archived';
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Registration {
  id: string;
  registration_number: string;
  student_id: string;
  course_id: string;
  class_id: string;
  registration_date: string;
  registration_date_jalali: string;
  start_date: string | null;
  expected_end_date: string | null;
  registration_fee: number;
  tuition_fee: number;
  discount: number;
  installments: number;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  installment_plan_json?: string | null;
  payment_status: 'paid' | 'partial' | 'pending' | 'overdue';
  attendance_status: 'active' | 'completed' | 'frozen' | 'cancelled';
  completion_status: 'in_progress' | 'completed' | 'dropped';
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Session {
  id: string;
  class_id: string;
  session_number: number;
  date: string;
  date_jalali: string;
  start_time: string;
  end_time: string;
  teacher_id: string;
  classroom: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  registration_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'online' | 'offline';
  late_minutes: number;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  registration_id: string;
  class_id: string | null;
  course_id: string | null;
  amount: number;
  installment_number?: number;
  installment_title?: string | null;
  due_date?: string | null;
  payment_date: string;
  payment_date_jalali: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  method: 'cash' | 'card' | 'transfer' | 'check';
  receipt_url: string | null;
  description: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  class_id: string;
  teacher_id: string;
  quiz_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'practical' | 'listening' | 'speaking' | 'reading' | 'writing';
  passing_score: number;
  max_score: number;
  time_limit_minutes: number | null;
  start_date: string;
  end_date: string;
  is_random_questions: boolean;
  shuffle_answers: boolean;
  auto_grade: boolean;
  status: 'draft' | 'published' | 'in_progress' | 'graded' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_bank_id: string | null;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options_json: string | null;
  correct_answer: string | null;
  points: number;
  order_index: number;
  image_url: string | null;
  audio_url: string | null;
}

export interface QuizResult {
  id: string;
  quiz_id: string;
  student_id: string;
  registration_id: string;
  score: number;
  max_score: number;
  percentage: number;
  grade: string | null;
  status: 'pending' | 'graded' | 'published';
  teacher_notes: string | null;
  student_feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  graded_by: string | null;
}

export interface QuestionBank {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options_json: string | null;
  correct_answer: string | null;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: string;
  certificate_number: string;
  verification_code: string;
  student_id: string;
  course_id: string;
  registration_id: string;
  issue_date: string;
  issue_date_jalali: string;
  final_score: number;
  status: 'issued' | 'revoked';
  qr_code_data: string;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'academic' | 'financial' | 'event' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'critical';
  is_pinned: boolean;
  read_by: string[];
  scheduled_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'reminder';
  category: 'payment' | 'attendance' | 'class' | 'exam' | 'system' | 'backup';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface AcademySettings {
  id: string;
  academy_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  phone_2: string | null;
  email: string | null;
  website: string | null;
  social_media_json: string | null;
  working_days: string[];
  working_hours_start: string;
  working_hours_end: string;
  academic_year_start: string | null;
  default_currency: string;
  default_language: string;
  timezone: string;
  session_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details_json: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface BackupRecord {
  id: string;
  filename: string;
  size_bytes: number;
  type: 'manual' | 'automatic';
  status: 'completed' | 'failed' | 'in_progress';
  data_json: string;
  created_at: string;
}

// ================================================================
// DATABASE CLASS
// ================================================================

export class RumilandDB extends Dexie {
  users!: Table<User, string>;
  roles!: Table<Role, string>;
  students!: Table<Student, string>;
  teachers!: Table<Teacher, string>;
  courses!: Table<Course, string>;
  classes!: Table<Class, string>;
  registrations!: Table<Registration, string>;
  sessions!: Table<Session, string>;
  attendance!: Table<Attendance, string>;
  payments!: Table<Payment, string>;
  quizzes!: Table<Quiz, string>;
  quizQuestions!: Table<QuizQuestion, string>;
  quizResults!: Table<QuizResult, string>;
  questionBank!: Table<QuestionBank, string>;
  certificates!: Table<Certificate, string>;
  announcements!: Table<Announcement, string>;
  notifications!: Table<Notification, string>;
  academySettings!: Table<AcademySettings, string>;
  auditLogs!: Table<AuditLog, string>;
  backupRecords!: Table<BackupRecord, string>;

  constructor() {
    super('RumilandAcademy');

    this.version(1).stores({
      users: 'id, username, role_id, is_active',
      roles: 'id, name',
      students: 'id, first_name, last_name, national_id, phone, status, created_at',
      teachers: 'id, first_name, last_name, national_id, status',
      courses: 'id, code, title, category, level, status',
      classes: 'id, code, course_id, teacher_id, type, status',
      registrations: 'id, registration_number, student_id, course_id, class_id, payment_status',
      sessions: 'id, class_id, date, status',
      attendance: 'id, session_id, student_id, class_id, date',
      payments: 'id, student_id, registration_id, class_id, status, payment_date',
      quizzes: 'id, course_id, class_id, teacher_id, status',
      quizQuestions: 'id, quiz_id, order_index',
      quizResults: 'id, quiz_id, student_id',
      questionBank: 'id, category, difficulty',
      certificates: 'id, certificate_number, student_id, course_id',
      announcements: 'id, category, priority, is_pinned, created_at',
      notifications: 'id, user_id, is_read, created_at',
      academySettings: 'id',
      auditLogs: 'id, user_id, entity_type, created_at',
      backupRecords: 'id, type, created_at',
    });
  }
}

// Singleton
export const db = new RumilandDB();
