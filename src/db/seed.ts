/**
 * Rumiland Academy — Database Seed & Initialization
 * Creates default roles, admin user, and default settings.
 */

import { db } from './schema';
import { v4 as uuid } from 'uuid';

const ADMIN_ID = 'admin-00000000000000000000000000000';
const ADMIN_ROLE_ID = 'role-admin-000000000000000000000000';
const MANAGER_ROLE_ID = 'role-manager-0000000000000000000000';
const RECEPTION_ROLE_ID = 'role-reception-00000000000000000000';
const TEACHER_ROLE_ID = 'role-teacher-0000000000000000000000';

const ALL_PERMISSIONS = [
  'dashboard.view', 'dashboard.manage',
  'students.view', 'students.create', 'students.edit', 'students.delete', 'students.archive', 'students.export',
  'teachers.view', 'teachers.create', 'teachers.edit', 'teachers.delete',
  'courses.view', 'courses.create', 'courses.edit', 'courses.delete',
  'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
  'registrations.view', 'registrations.create', 'registrations.edit', 'registrations.delete',
  'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete',
  'payments.view', 'payments.create', 'payments.edit', 'payments.delete', 'payments.export',
  'quizzes.view', 'quizzes.create', 'quizzes.edit', 'quizzes.delete', 'quizzes.grade',
  'reports.view', 'reports.create', 'reports.export',
  'calendar.view', 'calendar.manage',
  'settings.view', 'settings.edit',
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'roles.view', 'roles.manage',
  'backup.view', 'backup.create', 'backup.restore',
  'logs.view',
  'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete',
  'notifications.manage',
];

const MANAGER_PERMISSIONS = ALL_PERMISSIONS.filter(
  p => !p.startsWith('settings.') && !p.startsWith('users.') && !p.startsWith('roles.') && !p.startsWith('backup.') && !p.startsWith('logs.')
);

const RECEPTION_PERMISSIONS = [
  'dashboard.view',
  'students.view', 'students.create', 'students.edit',
  'teachers.view',
  'courses.view', 'classes.view',
  'registrations.view', 'registrations.create',
  'attendance.view', 'attendance.create',
  'payments.view', 'payments.create',
  'calendar.view',
  'announcements.view',
];

const TEACHER_PERMISSIONS = [
  'dashboard.view',
  'students.view',
  'courses.view', 'classes.view',
  'attendance.view', 'attendance.create', 'attendance.edit',
  'quizzes.view', 'quizzes.create', 'quizzes.edit', 'quizzes.grade',
  'calendar.view',
  'announcements.view',
];

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function initializeDatabase(): Promise<void> {
  const existingRoles = await db.roles.count();
  if (existingRoles > 0) return; // Already initialized

  const now = new Date().toISOString();

  // Create roles
  await db.roles.bulkPut([
    { id: ADMIN_ROLE_ID, name: 'administrator', name_fa: 'مدیر سیستم', permissions: ALL_PERMISSIONS, is_system: true, created_at: now, updated_at: now },
    { id: MANAGER_ROLE_ID, name: 'manager', name_fa: 'مدیر', permissions: MANAGER_PERMISSIONS, is_system: true, created_at: now, updated_at: now },
    { id: RECEPTION_ROLE_ID, name: 'reception', name_fa: 'منشی', permissions: RECEPTION_PERMISSIONS, is_system: true, created_at: now, updated_at: now },
    { id: TEACHER_ROLE_ID, name: 'teacher', name_fa: 'استاد', permissions: TEACHER_PERMISSIONS, is_system: true, created_at: now, updated_at: now },
  ]);

  // Create admin user (password: admin123)
  const passwordHash = await hashPassword('admin123');
  await db.users.put({
    id: ADMIN_ID,
    username: 'admin',
    password_hash: passwordHash,
    display_name: 'مدیر سیستم',
    email: 'admin@rumiland.academy',
    phone: '',
    avatar_url: null,
    role_id: ADMIN_ROLE_ID,
    is_active: true,
    last_login_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  // Default academy settings
  await db.academySettings.put({
    id: 'settings-default',
    academy_name: 'Rumiland Academy',
    logo_url: null,
    address: null,
    phone: null,
    phone_2: null,
    email: null,
    website: null,
    social_media_json: null,
    working_days: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    working_hours_start: '08:00',
    working_hours_end: '20:00',
    academic_year_start: null,
    default_currency: 'IRT',
    default_language: 'fa',
    timezone: 'Asia/Tehran',
    session_duration_minutes: 90,
    created_at: now,
    updated_at: now,
  });

  console.log('[DB] Database initialized with default roles and admin user.');
}

export function getPermissionsForRole(roleName: string): string[] {
  switch (roleName) {
    case 'administrator': return ALL_PERMISSIONS;
    case 'manager': return MANAGER_PERMISSIONS;
    case 'reception': return RECEPTION_PERMISSIONS;
    case 'teacher': return TEACHER_PERMISSIONS;
    default: return [];
  }
}

export { hashPassword };