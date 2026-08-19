/**
 * Rumiland Academy — Global State Store (Zustand)
 * Centralized state management for the entire application.
 */

import { create } from 'zustand';
import type { User, Student, Teacher, Course, Class, Registration, Payment, Announcement } from '@/db/schema';

// ================================================================
// AUTH STATE
// ================================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  login: (user: User, permissions: string[]) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  permissions: [],
  login: (user, permissions) => set({ user, isAuthenticated: true, permissions, isLoading: false }),
  logout: () => set({ user: null, isAuthenticated: false, permissions: [], isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// ================================================================
// UI STATE
// ================================================================

interface UIState {
  sidebarCollapsed: boolean;
  currentPage: string;
  theme: 'dark';
  language: 'fa';
  toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  currentPage: 'dashboard',
  theme: 'dark',
  language: 'fa',
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCurrentPage: (page) => set({ currentPage: page }),
  addToast: (type, message) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ================================================================
// DASHBOARD STATE
// ================================================================

interface DashboardStats {
  totalStudents: number;
  activeClasses: number;
  monthlyRevenue: number;
  totalTeachers: number;
  overdueCount: number;
  studentGrowth: number;
  classGrowth: number;
  revenueGrowth: number;
  teacherGrowth: number;
}

interface DashboardState {
  stats: DashboardStats;
  todayClasses: Class[];
  latestTeachers: Teacher[];
  recentPayments: Payment[];
  announcements: Announcement[];
  isLoading: boolean;
  lastUpdated: string | null;
  setStats: (stats: DashboardStats) => void;
  setTodayClasses: (classes: Class[]) => void;
  setLatestTeachers: (teachers: Teacher[]) => void;
  setRecentPayments: (payments: Payment[]) => void;
  setAnnouncements: (announcements: Announcement[]) => void;
  setLoading: (loading: boolean) => void;
  setLastUpdated: (date: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: { totalStudents: 0, activeClasses: 0, monthlyRevenue: 0, totalTeachers: 0, overdueCount: 0, studentGrowth: 0, classGrowth: 0, revenueGrowth: 0, teacherGrowth: 0 },
  todayClasses: [],
  latestTeachers: [],
  recentPayments: [],
  announcements: [],
  isLoading: false,
  lastUpdated: null,
  setStats: (stats) => set({ stats }),
  setTodayClasses: (todayClasses) => set({ todayClasses }),
  setLatestTeachers: (latestTeachers) => set({ latestTeachers }),
  setRecentPayments: (recentPayments) => set({ recentPayments }),
  setAnnouncements: (announcements) => set({ announcements }),
  setLoading: (isLoading) => set({ isLoading }),
  setLastUpdated: (lastUpdated) => set({ lastUpdated }),
}));

// ================================================================
// STUDENT STATE
// ================================================================

interface StudentFilters {
  search: string;
  classId: string | null;
  paymentStatus: string | null;
  status: string | null;
  page: number;
  perPage: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

interface StudentState {
  students: Student[];
  totalCount: number;
  filters: StudentFilters;
  selectedIds: string[];
  isLoading: boolean;
  setStudents: (students: Student[], total: number) => void;
  setFilters: (filters: Partial<StudentFilters>) => void;
  setSelectedIds: (ids: string[]) => void;
  setLoading: (loading: boolean) => void;
  resetFilters: () => void;
}

const defaultStudentFilters: StudentFilters = {
  search: '', classId: null, paymentStatus: null, status: null,
  page: 1, perPage: 20, sortBy: 'created_at', sortDirection: 'desc',
};

export const useStudentStore = create<StudentState>((set) => ({
  students: [],
  totalCount: 0,
  filters: { ...defaultStudentFilters },
  selectedIds: [],
  isLoading: false,
  setStudents: (students, totalCount) => set({ students, totalCount }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters, page: filters.page ?? 1 } })),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setLoading: (isLoading) => set({ isLoading }),
  resetFilters: () => set({ filters: { ...defaultStudentFilters }, selectedIds: [] }),
}));

// ================================================================
// PAYMENT STATE
// ================================================================

interface PaymentFilters {
  search: string;
  classId: string | null;
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
  perPage: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

interface PaymentState {
  payments: Payment[];
  totalCount: number;
  filters: PaymentFilters;
  selectedIds: string[];
  isLoading: boolean;
  setPayments: (payments: Payment[], total: number) => void;
  setFilters: (filters: Partial<PaymentFilters>) => void;
  setSelectedIds: (ids: string[]) => void;
  setLoading: (loading: boolean) => void;
  resetFilters: () => void;
}

const defaultPaymentFilters: PaymentFilters = {
  search: '', classId: null, status: null, dateFrom: null, dateTo: null,
  page: 1, perPage: 20, sortBy: 'payment_date', sortDirection: 'desc',
};

export const usePaymentStore = create<PaymentState>((set) => ({
  payments: [],
  totalCount: 0,
  filters: { ...defaultPaymentFilters },
  selectedIds: [],
  isLoading: false,
  setPayments: (payments, totalCount) => set({ payments, totalCount }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters, page: filters.page ?? 1 } })),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setLoading: (isLoading) => set({ isLoading }),
  resetFilters: () => set({ filters: { ...defaultPaymentFilters }, selectedIds: [] }),
}));

// ================================================================
// COURSE & CLASS STATE
// ================================================================

interface CourseFilters {
  search: string;
  category: string | null;
  level: string | null;
  status: string | null;
  page: number;
  perPage: number;
}

interface ClassFilters {
  search: string;
  courseId: string | null;
  teacherId: string | null;
  status: string | null;
  type: string | null;
  page: number;
  perPage: number;
}

interface CourseClassState {
  courses: Course[];
  classes: Class[];
  courseTotal: number;
  classTotal: number;
  courseFilters: CourseFilters;
  classFilters: ClassFilters;
  isLoading: boolean;
  selectedCourse: Course | null;
  selectedClass: Class | null;
  setCourses: (courses: Course[], total: number) => void;
  setClasses: (classes: Class[], total: number) => void;
  setCourseFilters: (filters: Partial<CourseFilters>) => void;
  setClassFilters: (filters: Partial<ClassFilters>) => void;
  setSelectedCourse: (course: Course | null) => void;
  setSelectedClass: (cls: Class | null) => void;
  setLoading: (loading: boolean) => void;
}

const defaultCourseFilters: CourseFilters = { search: '', category: null, level: null, status: null, page: 1, perPage: 20 };
const defaultClassFilters: ClassFilters = { search: '', courseId: null, teacherId: null, status: null, type: null, page: 1, perPage: 20 };

export const useCourseClassStore = create<CourseClassState>((set) => ({
  courses: [], classes: [], courseTotal: 0, classTotal: 0,
  courseFilters: { ...defaultCourseFilters },
  classFilters: { ...defaultClassFilters },
  isLoading: false,
  selectedCourse: null,
  selectedClass: null,
  setCourses: (courses, courseTotal) => set({ courses, courseTotal }),
  setClasses: (classes, classTotal) => set({ classes, classTotal }),
  setCourseFilters: (filters) => set((s) => ({ courseFilters: { ...s.courseFilters, ...filters, page: filters.page ?? 1 } })),
  setClassFilters: (filters) => set((s) => ({ classFilters: { ...s.classFilters, ...filters, page: filters.page ?? 1 } })),
  setSelectedCourse: (selectedCourse) => set({ selectedCourse }),
  setSelectedClass: (selectedClass) => set({ selectedClass }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ================================================================
// CALENDAR STATE
// ================================================================

interface CalendarState {
  currentWeekStart: Date;
  sessions: any[];
  isLoading: boolean;
  setCurrentWeekStart: (date: Date) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
  setSessions: (sessions: any[]) => void;
  setLoading: (loading: boolean) => void;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentWeekStart: getWeekStart(new Date()),
  sessions: [],
  isLoading: false,
  setCurrentWeekStart: (currentWeekStart) => set({ currentWeekStart }),
  goToPreviousWeek: () => {
    const d = new Date(get().currentWeekStart);
    d.setDate(d.getDate() - 7);
    set({ currentWeekStart: d });
  },
  goToNextWeek: () => {
    const d = new Date(get().currentWeekStart);
    d.setDate(d.getDate() + 7);
    set({ currentWeekStart: d });
  },
  goToToday: () => set({ currentWeekStart: getWeekStart(new Date()) }),
  setSessions: (sessions) => set({ sessions }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ================================================================
// FINANCE STATE
// ================================================================

interface FinanceFilters {
  type: 'all' | 'income' | 'expense';
  category: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
}

interface FinanceState {
  activeTab: 'dashboard' | 'payments' | 'income' | 'expenses' | 'debtors' | 'transactions' | 'reports';
  filters: FinanceFilters;
  setActiveTab: (tab: FinanceState['activeTab']) => void;
  setFinanceFilters: (filters: Partial<FinanceFilters>) => void;
  resetFinanceFilters: () => void;
}

const defaultFinanceFilters: FinanceFilters = {
  type: 'all', category: null, dateFrom: null, dateTo: null, search: '',
};

export const useFinanceStore = create<FinanceState>((set) => ({
  activeTab: 'dashboard',
  filters: { ...defaultFinanceFilters },
  setActiveTab: (activeTab) => set({ activeTab }),
  setFinanceFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  resetFinanceFilters: () => set({ filters: { ...defaultFinanceFilters } }),
}));
