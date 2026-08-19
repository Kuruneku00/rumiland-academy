/**
 * Rumiland Academy — Settings & Administration (with User CRUD)
 */
import React, { useEffect, useState } from 'react';
import { settingsService, notificationService, userManagementService } from '@/services';
import { getStoragePath, isElectron } from '@/services/persistence';
import { db } from '@/db/schema';
import { Card, EmptyState, Modal } from '@/components/Layout';
import { Button, Input, Select } from '@/components/Basic';
import type { AcademySettings, User, Role } from '@/db/schema';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AcademySettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeSection, setActiveSection] = useState('academy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSettings, setEditSettings] = useState<Partial<AcademySettings>>({});

  // User form
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', display_name: '', email: '', phone: '', role_id: '' });
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState('');

  useEffect(() => { loadSettings(); loadUsers(); loadRoles(); }, []);

  const loadSettings = async () => { const s = await settingsService.get(); if (s) { setSettings(s); setEditSettings({ ...s }); } setLoading(false); };
  const loadUsers = async () => { setUsers(await db.users.toArray()); };
  const loadRoles = async () => { setRoles(await db.roles.toArray()); };

  const handleSave = async () => { setSaving(true); await settingsService.update(editSettings); setSettings({ ...settings!, ...editSettings }); setSaving(false); };

  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.password || !userForm.display_name) { setUserError('فیلدهای الزامی را تکمیل کنید'); return; }
    setUserSaving(true); setUserError('');
    const result = await userManagementService.createUser(userForm);
    setUserSaving(false);
    if (result.success) { setShowUserDialog(false); setUserForm({ username: '', password: '', display_name: '', email: '', phone: '', role_id: '' }); loadUsers(); }
    else setUserError(result.error || 'خطا');
  };

  const toggleUserStatus = async (user: User) => {
    await db.users.update(user.id, { is_active: !user.is_active, updated_at: new Date().toISOString() });
    loadUsers();
  };

  const sections = [
    { id: 'academy', label: 'اطلاعات آموزشگاه' }, { id: 'users', label: 'کاربران' }, { id: 'roles', label: 'نقش‌ها' }, { id: 'notifications', label: 'اعلان‌ها' }, { id: 'backup', label: 'پشتیبانی و بازبینی' },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '1.5rem' }}>تنظیمات</h1>

      <div style={{ display: 'flex', gap: '0', borderBottom: 'var(--border-default)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {sections.map((sec) => <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{ padding: '0.625rem 1.25rem', fontSize: 'var(--font-size-sm)', fontWeight: activeSection === sec.id ? 600 : 400, color: activeSection === sec.id ? 'var(--color-primary-300)' : 'var(--color-text-tertiary)', background: 'transparent', border: 'none', borderBottom: activeSection === sec.id ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{sec.label}</button>)}
      </div>

      {activeSection === 'academy' && (
        <Card>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1.25rem' }}>اطلاعات آموزشگاه</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="نام آموزشگاه" value={editSettings.academy_name || ''} onChange={(e) => setEditSettings({ ...editSettings, academy_name: e.target.value })} />
            <Input label="تلفن" value={editSettings.phone || ''} onChange={(e) => setEditSettings({ ...editSettings, phone: e.target.value })} />
            <Input label="ایمیل" value={editSettings.email || ''} onChange={(e) => setEditSettings({ ...editSettings, email: e.target.value })} />
            <Input label="وبسایت" value={editSettings.website || ''} onChange={(e) => setEditSettings({ ...editSettings, website: e.target.value })} />
            <Input label="آدرس" value={editSettings.address || ''} onChange={(e) => setEditSettings({ ...editSettings, address: e.target.value })} />
          </div>
          <div style={{ marginTop: '1rem' }}><Button onClick={handleSave} loading={saving}>ذخیره تنظیمات</Button></div>
        </Card>
      )}

      {activeSection === 'users' && (
        <Card padding="0">
          <div style={{ padding: '1rem 1.25rem', borderBottom: 'var(--border-thin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>مدیریت کاربران</h3>
            <Button size="sm" onClick={() => { setUserForm({ username: '', password: '', display_name: '', email: '', phone: '', role_id: '' }); setUserError(''); setShowUserDialog(true); }}>افزودن کاربر</Button>
          </div>
          {users.length === 0 ? <EmptyState title="هیچ کاربری ثبت نشده است" /> : (
            <table style={{ width: '100%' }}>
              <thead><tr style={{ borderBottom: 'var(--border-default)' }}>
                {['نام کاربری', 'نام نمایشی', 'ایمیل', 'نقش', 'وضعیت', 'عملیات'].map((h) => <th key={h} style={{ padding: '0.75rem 1rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>{h}</th>)}
              </tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id} style={{ borderBottom: 'var(--border-thin)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{u.username}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{u.display_name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{roles.find((r) => r.id === u.role_id)?.name_fa || '--'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 600, background: u.is_active ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: u.is_active ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {u.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button onClick={() => toggleUserStatus(u)} style={{ background: 'none', border: 'none', color: u.is_active ? 'var(--color-danger)' : 'var(--color-success)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>
                      {u.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}

          <Modal isOpen={showUserDialog} onClose={() => setShowUserDialog(false)} title="افزودن کاربر جدید" size="md"
            footer={<><Button variant="secondary" onClick={() => setShowUserDialog(false)}>انصراف</Button><Button onClick={handleCreateUser} loading={userSaving}>ایجاد</Button></>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {userError && <div style={{ padding: '0.625rem 0.75rem', background: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>{userError}</div>}
              <Input label="نام کاربری" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
              <Input label="رمز عبور" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              <Input label="نام نمایشی" value={userForm.display_name} onChange={(e) => setUserForm({ ...userForm, display_name: e.target.value })} />
              <Input label="ایمیل" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              <Input label="تلفن" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              <Select label="نقش" options={roles.map((r) => ({ value: r.id, label: r.name_fa }))} value={userForm.role_id} onChange={(v) => setUserForm({ ...userForm, role_id: v })} />
            </div>
          </Modal>
        </Card>
      )}

      {activeSection === 'roles' && (
        <Card padding="0">
          <div style={{ padding: '1rem 1.25rem', borderBottom: 'var(--border-thin)' }}><h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>نقش‌ها و دسترسی‌ها</h3></div>
          {roles.map((r) => (
            <div key={r.id} style={{ padding: '1rem 1.25rem', borderBottom: 'var(--border-thin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontWeight: 500 }}>{r.name_fa}</div><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{r.permissions.length} دسترسی</div></div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: r.is_system ? 'var(--color-warning)' : 'var(--color-success)' }}>{r.is_system ? 'سیستمی' : 'سفارشی'}</span>
            </div>
          ))}
        </Card>
      )}

      {activeSection === 'notifications' && (
        <Card><h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1.25rem' }}>تنظیمات اعلان‌ها</h3><EmptyState title="تنظیمات اعلان‌ها در دسترس است" description="تنظیمات پیش‌فرض اعلان‌ها قابل تغییر می‌باشند" /></Card>
      )}

      {activeSection === 'backup' && (
        <Card>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1.25rem' }}>پشتیبانی و بازبینی</h3>
          <StorageStatus />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>تهیه نسخه پشتیبان</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>تهیه نسخه پشتیبان از تمام اطلاعات سیستم شامل دانشجویان، اساتید، دوره‌ها، کلاس‌ها، ثبت‌نام‌ها، پرداخت‌ها و حضور و غیاب</p>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                <Button variant="secondary" size="sm" onClick={async () => {
                  const data = {
                    version: '1.0', date: new Date().toISOString(),
                    students: await db.students.toArray(), teachers: await db.teachers.toArray(),
                    courses: await db.courses.toArray(), classes: await db.classes.toArray(),
                    registrations: await db.registrations.toArray(), payments: await db.payments.toArray(),
                    attendance: await db.attendance.toArray(), quizzes: await db.quizzes.toArray(),
                    quizQuestions: await db.quizQuestions.toArray(), quizResults: await db.quizResults.toArray(),
                    certificates: await db.certificates.toArray(), announcements: await db.announcements.toArray(),
                    notifications: await db.notifications.toArray(), settings: await db.academySettings.toArray(),
                    users: await db.users.toArray(), roles: await db.roles.toArray(),
                    auditLogs: await db.auditLogs.toArray(), sessions: await db.sessions.toArray(),
                  };
                  const json = JSON.stringify(data, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url;
                  a.download = `rumiland-backup-${new Date().toISOString().split('T')[0]}.json`;
                  a.click(); URL.revokeObjectURL(url);
                  // Save backup record
                  await db.backupRecords.put({ id: crypto.randomUUID(), filename: a.download, size_bytes: json.length, type: 'manual', status: 'completed', data_json: '', created_at: new Date().toISOString() });
                }}>دانلود نسخه پشتیبان</Button>
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>بازگردانی نسخه پشتیبان</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>با انتخاب فایل پشتیبان، اطلاعات قبلی جایگزین خواهد شد. این عملیات قابل بازگشت نیست.</p>
              <Button variant="danger" size="sm" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = '.json';
                input.onchange = async (e: any) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const confirmed = confirm('آیا از بازگردانی نسخه پشتیبان اطمینان دارید؟ تمام داده‌های فعلی جایگزین می‌شوند.');
                  if (!confirmed) return;
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (data.students) { await db.students.clear(); await db.students.bulkPut(data.students); }
                    if (data.teachers) { await db.teachers.clear(); await db.teachers.bulkPut(data.teachers); }
                    if (data.courses) { await db.courses.clear(); await db.courses.bulkPut(data.courses); }
                    if (data.classes) { await db.classes.clear(); await db.classes.bulkPut(data.classes); }
                    if (data.registrations) { await db.registrations.clear(); await db.registrations.bulkPut(data.registrations); }
                    if (data.payments) { await db.payments.clear(); await db.payments.bulkPut(data.payments); }
                    if (data.attendance) { await db.attendance.clear(); await db.attendance.bulkPut(data.attendance); }
                    if (data.quizzes) { await db.quizzes.clear(); await db.quizzes.bulkPut(data.quizzes); }
                    if (data.sessions) { await db.sessions.clear(); await db.sessions.bulkPut(data.sessions); }
                    if (data.certificates) { await db.certificates.clear(); await db.certificates.bulkPut(data.certificates); }
                    if (data.quizQuestions) { await db.quizQuestions.clear(); await db.quizQuestions.bulkPut(data.quizQuestions); }
                    if (data.quizResults) { await db.quizResults.clear(); await db.quizResults.bulkPut(data.quizResults); }
                    if (data.announcements) { await db.announcements.clear(); await db.announcements.bulkPut(data.announcements); }
                    if (data.users) { await db.users.clear(); await db.users.bulkPut(data.users); }
                    if (data.roles) { await db.roles.clear(); await db.roles.bulkPut(data.roles); }
                    if (data.settings) { await db.academySettings.clear(); await db.academySettings.bulkPut(data.settings); }
                    alert('بازگردانی با موفقیت انجام شد. لطفاً برنامه را مجدداً بارگذاری کنید.');
                    window.location.reload();
                  } catch (err) {
                    alert('خطا در بازگردانی: فایل معتبر نیست');
                  }
                };
                input.click();
              }}>بازگردانی از فایل</Button>
            </div>

            <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>سوابق پشتیبان</div>
              {loading ? <div style={{ color: 'var(--color-text-tertiary)' }}>در حال بارگذاری...</div> : <EmptyState title="هنوز نسخه پشتیبانی تهیه نشده است" />}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// ================================================================
// وضعیت ذخیره‌سازی داده
// ================================================================
const StorageStatus: React.FC = () => {
  const [path, setPath] = useState<string>('');
  const [electronMode, setElectronMode] = useState<boolean>(false);

  useEffect(() => {
    getStoragePath().then(setPath);
    setElectronMode(isElectron());
  }, []);

  return (
    <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: 'var(--border-thin)' }}>
      <div style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        ذخیره‌سازی داده‌ها
        <span style={{ padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 600, background: electronMode ? 'var(--color-success-light)' : 'var(--color-warning-light)', color: electronMode ? 'var(--color-success)' : 'var(--color-warning)' }}>
          {electronMode ? 'حالت دسکتاپ (پایدار)' : 'حالت مرورگر (موقت)'}
        </span>
      </div>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
        {electronMode
          ? 'داده‌های شما به‌صورت خودکار روی دیسک ذخیره می‌شوند و پس از بستن برنامه یا ری‌استارت سیستم از بین نمی‌روند.'
          : 'در حالت مرورگر داده‌ها در حافظهٔ مرورگر نگهداری می‌شوند. برای ذخیره‌سازی پایدار، نسخه دسکتاپ را اجرا کنید.'}
      </p>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', direction: 'ltr', textAlign: 'left', fontFamily: 'monospace' }}>
        {path || '...'}
      </div>
    </div>
  );
};
