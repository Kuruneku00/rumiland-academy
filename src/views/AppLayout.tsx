/**
 * Rumiland Academy — Main Application Shell
 * Sidebar + Toolbar + Content area layout.
 */

import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useAuthStore, useUIStore, useDashboardStore } from '@/store';
import { authService, dashboardService, notificationService } from '@/services';
import { initializeDatabase } from '@/db/seed';
import { db } from '@/db/schema';
import { IconButton, Button } from '@/components/Basic';

// ================================================================
// SIDEBAR
// ================================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  permission: string;
  children?: Array<{ id: string; label: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: <DashboardIcon />, permission: 'dashboard.view' },
  { id: 'students', label: 'شاگردان', icon: <StudentsIcon />, permission: 'students.view' },
  { id: 'teachers', label: 'اساتید', icon: <TeacherIcon />, permission: 'teachers.view' },
  { id: 'courses', label: 'دوره‌ها و کلاس‌ها', icon: <CoursesIcon />, permission: 'courses.view' },
  { id: 'registrations', label: 'ثبت‌نام‌ها', icon: <RegistrationsIcon />, permission: 'registrations.view' },
  { id: 'attendance', label: 'حضور و غیاب', icon: <AttendanceIcon />, permission: 'attendance.view' },
  { id: 'payments', label: 'شهریه و پرداخت‌ها', icon: <PaymentsIcon />, permission: 'payments.view' },
  { id: 'quizzes', label: 'کوییزها و آزمون‌ها', icon: <QuizzesIcon />, permission: 'quizzes.view' },
  { id: 'reports', label: 'گزارش‌ها و آمار', icon: <ReportsIcon />, permission: 'reports.view' },
  { id: 'calendar', label: 'تقویم هفتگی', icon: <CalendarIcon />, permission: 'calendar.view' },
  { id: 'settings', label: 'تنظیمات', icon: <SettingsIcon />, permission: 'settings.view' },
  { id: 'support', label: 'پشتیبانی و بازاریابی', icon: <SupportIcon />, permission: 'dashboard.view' },
];

function DashboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function StudentsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function TeacherIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/></svg>; }
function CoursesIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function RegistrationsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>; }
function AttendanceIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function PaymentsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
function QuizzesIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>; }
function ReportsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function CalendarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function SettingsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function SupportIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  permissions: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, permissions }) => {
  const { user } = useAuthStore();
  const hasPermission = (perm: string) => permissions.includes(perm);

  return (
    <aside style={{
      width: 'var(--sidebar-width)', height: '100vh',
      background: 'var(--color-sidebar)', borderLeft: 'var(--border-thin)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: 'var(--border-thin)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--font-size-lg)', color: '#fff', flexShrink: 0 }}>R</div>
        <div>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>Rumiland Academy</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Manager</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
        {navItems.map((item) => {
          if (!hasPermission(item.permission)) return null;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 1rem', marginBottom: '0.125rem',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                color: isActive ? 'var(--color-primary-300)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                transition: 'all var(--transition-fast)',
                textAlign: 'right',
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--color-sidebar-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; } }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div style={{ padding: '0.75rem 1rem', borderTop: 'var(--border-thin)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'var(--color-primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 'var(--font-size-sm)', color: '#fff', flexShrink: 0 }}>
          {user?.display_name?.charAt(0) || 'م'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.display_name || 'مدیر سیستم'}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>مدیر</div>
        </div>
        <IconButton size="sm" onClick={() => useAuthStore.getState().logout()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </IconButton>
      </div>
    </aside>
  );
};

// ================================================================
// TOOLBAR
// ================================================================

interface ToolbarProps {
  onSearch?: (query: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ type: string; label: string; id: string }>>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      notificationService.getUnreadCount(user.id).then(setUnreadCount);
      notificationService.getForUser(user.id).then(setNotifications);
    }
  }, [user]);

  // Global search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); setShowSearchResults(false); return; }
    const timer = setTimeout(async () => {
      const q = searchQuery.toLowerCase();
      const results: Array<{ type: string; label: string; id: string }> = [];
      const [students, teachers, courses, classes] = await Promise.all([
        db.students.filter((s: any) => !s.deleted_at).toArray(),
        db.teachers.filter((t: any) => !t.deleted_at).toArray(),
        db.courses.filter((c: any) => !c.deleted_at).toArray(),
        db.classes.filter((c: any) => !c.deleted_at).toArray(),
      ]);
      students.forEach((s: any) => { const name = `${s.first_name} ${s.last_name}`; if (name.toLowerCase().includes(q) || s.national_id?.includes(q) || s.phone?.includes(q)) results.push({ type: 'student', label: `${name} (${s.national_id})`, id: s.id }); });
      teachers.forEach((t: any) => { const name = `${t.first_name} ${t.last_name}`; if (name.toLowerCase().includes(q)) results.push({ type: 'teacher', label: `استاد: ${name}`, id: t.id }); });
      courses.forEach((c: any) => { if (c.title?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)) results.push({ type: 'course', label: `دوره: ${c.title}`, id: c.id }); });
      classes.forEach((c: any) => { if (c.code?.toLowerCase().includes(q)) results.push({ type: 'class', label: `کلاس: ${c.code}`, id: c.id }); });
      setSearchResults(results.slice(0, 10));
      setShowSearchResults(results.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const now = new Date();
  const jalaliDate = formatJalaliDate(now);
  const time = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header style={{
      height: 'var(--toolbar-height)', background: 'var(--color-toolbar)',
      borderBottom: 'var(--border-toolbar-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', gap: '1rem', flexShrink: 0,
    }}>
      {/* Left: Date/Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{time}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{jalaliDate}</div>
        </div>
      </div>

      {/* Right: Search + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text" placeholder="جستجوی سریع..." value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            style={{ width: 280, height: 38, padding: '0 2.5rem 0 0.75rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none' }}
          />
          {showSearchResults && (
            <div style={{ position: 'absolute', top: '110%', right: 0, width: 340, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: 'var(--border-default)', boxShadow: 'var(--shadow-xl)', zIndex: 'var(--z-dropdown)', overflow: 'hidden' }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: 'var(--border-thin)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>نتایج جستجو ({searchResults.length})</div>
              {searchResults.map((r, i) => (
                <div key={i} style={{ padding: '0.5rem 0.75rem', borderBottom: 'var(--border-thin)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', transition: 'background var(--transition-fast)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginLeft: '0.5rem' }}>{r.type === 'student' ? 'شاگرد' : r.type === 'teacher' ? 'استاد' : r.type === 'course' ? 'دوره' : 'کلاس'}</span>
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <IconButton size="sm" onClick={() => setShowNotifications(!showNotifications)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </IconButton>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 'var(--radius-full)', background: 'var(--color-danger)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>
          )}
          {showNotifications && (
            <div style={{ position: 'absolute', top: '110%', left: 0, width: 340, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: 'var(--border-default)', boxShadow: 'var(--shadow-xl)', zIndex: 'var(--z-dropdown)', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: 'var(--border-thin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>اعلان‌ها و یادآورها</span>
                <button onClick={() => { notificationService.markAllRead(user?.id || ''); setUnreadCount(0); }} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-400)', background: 'none', border: 'none', cursor: 'pointer' }}>خواندن همه</button>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>هیچ اعلانی وجود ندارد</div>
                ) : notifications.slice(0, 10).map((n: any) => (
                  <div key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: 'var(--border-thin)', cursor: 'pointer', opacity: n.is_read ? 0.6 : 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <IconButton size="sm" onClick={() => {}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </IconButton>
      </div>
    </header>
  );
};

// ================================================================
// UTILITY: Jalali Date Formatter
// ================================================================

function formatJalaliDate(date: Date): string {
  try {
    return date.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' });
  } catch {
    return date.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' });
  }
}

// ================================================================
// MAIN APP LAYOUT
// ================================================================

interface AppLayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentPage, onNavigate, children }) => {
  const { user, permissions, isAuthenticated, isLoading } = useAuthStore();
  const [authReady, setAuthReady] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    initializeDatabase().then(() => {
      setAuthReady(true);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const result = await authService.login(loginUsername, loginPassword);
    if (result.success && result.user) {
      useAuthStore.getState().login(result.user, result.permissions || []);

      // Load dashboard data
      dashboardService.getStats().then((stats) => {
        useDashboardStore.getState().setStats(stats);
        useDashboardStore.getState().setLastUpdated(new Date().toISOString());
      });
    } else {
      setLoginError(result.error || 'خطا در ورود');
    }
    setLoginLoading(false);
  };

  // Loading
  if (!authReady) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-root)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: '1rem' }}>Rumiland Academy</div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-root)' }}>
        <div style={{ width: 400, background: 'var(--color-card)', borderRadius: 'var(--radius-2xl)', border: 'var(--border-default)', padding: '2.5rem', boxShadow: 'var(--shadow-xl)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--font-size-2xl)', color: '#fff', margin: '0 auto 1rem' }}>R</div>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Rumiland Academy</h1>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>ورود به پنل مدیریت</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>نام کاربری</label>
                <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="admin" style={{ width: '100%', height: 44, padding: '0 1rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', outline: 'none' }} required />
              </div>
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>رمز عبور</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', height: 44, padding: '0 1rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', outline: 'none' }} required />
              </div>
              {loginError && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)', background: 'var(--color-danger-light)', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)' }}>{loginError}</div>}
              <Button type="submit" fullWidth loading={loginLoading}>ورود به سیستم</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} permissions={permissions} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Toolbar />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--color-bg-primary)' }}>
          {children}
        </main>
      </div>

      {/* Toast container */}
      {/* <ToastContainer /> */}
    </div>
  );
};

export { Sidebar, Toolbar, formatJalaliDate };