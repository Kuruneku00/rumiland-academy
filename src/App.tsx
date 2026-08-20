/**
 * Rumiland Academy — Main Application Entry Point
 */
import React, { useState, useCallback } from 'react';
import { AppLayout } from '@/views/AppLayout';
import { DashboardPage } from '@/views/Dashboard';
import { StudentsPage } from '@/views/Students';
import { StudentProfile } from '@/views/StudentProfile';
import { TeachersPage } from '@/views/Teachers';
import { PaymentsPage } from '@/views/Payments';
import { CoursesPage } from '@/views/Courses';
import { CalendarPage } from '@/views/Calendar';
import { RegistrationAttendancePage } from '@/views/RegistrationAttendance';
import { AttendancePage } from '@/views/Attendance';
import { QuizzesPage, ReportsPage } from '@/views/QuizzesReports';
import { SettingsPage } from '@/views/Settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page); setSelectedStudentId(null);
  }, []);

  const handleViewStudent = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
  }, []);

  const renderPage = () => {
    if (selectedStudentId) {
      return <StudentProfile studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />;
    }
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'students': return <StudentsPage onViewProfile={handleViewStudent} />;
      case 'courses': return <CoursesPage onViewProfile={handleViewStudent} />;
      case 'registrations': return <RegistrationAttendancePage onViewProfile={handleViewStudent} />;
      case 'attendance': return <AttendancePage />;
      case 'payments': return <PaymentsPage />;
      case 'quizzes': return <QuizzesPage />;
      case 'reports': return <ReportsPage />;
      case 'calendar': return <CalendarPage />;
      case 'settings': return <SettingsPage />;
      case 'teachers': return <TeachersPage />;
      case 'support': return <div style={{ padding: '2rem' }}><h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '1rem' }}>پشتیبانی و بازاریابی</h1><p style={{ color: 'var(--color-text-secondary)' }}>این بخش در حال توسعه است.</p></div>;
      default: return <DashboardPage />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </AppLayout>
  );
};

export default App;