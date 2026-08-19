/**
 * Rumiland Academy — Dashboard Page (real data from database)
 */
import React, { useEffect, useState } from 'react';
import { useDashboardStore, useAuthStore } from '@/store';
import { dashboardService, notificationService, financeService } from '@/services';
import { Card, StatCard, EmptyState, Skeleton } from '@/components/Layout';
import { Button } from '@/components/Basic';

type ChartMode = 'six_months' | 'weekly' | 'monthly' | 'yearly';

export const DashboardPage: React.FC = () => {
  const { stats, todayClasses, announcements, isLoading, lastUpdated } = useDashboardStore();
  const [revenueData, setRevenueData] = useState<Array<{ name: string; value: number }>>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('six_months');
  const [distributionData, setDistributionData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState<any>({ count: 0, total: 0, average: 0, expense: 0 });
  const [overdueList, setOverdueList] = useState<Array<{ studentName: string; amount: number; className: string }>>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => { loadDashboard(); const interval = setInterval(loadDashboard, 60000); return () => clearInterval(interval); }, []);

  useEffect(() => { loadRevenueChart(chartMode); }, [chartMode]);

  const loadRevenueChart = async (mode: ChartMode) => {
    setChartLoading(true);
    const revData = await dashboardService.getRevenueChartData(mode);
    setRevenueData(revData);
    setChartLoading(false);
  };

  const loadDashboard = async () => {
    useDashboardStore.getState().setLoading(true);
    const s = await dashboardService.getStats();
    useDashboardStore.getState().setStats(s);

    const classes = await dashboardService.getTodayClasses();
    useDashboardStore.getState().setTodayClasses(classes as any);

    const teachers = await dashboardService.getLatestTeachers();
    useDashboardStore.getState().setLatestTeachers(teachers);

    const fin = await dashboardService.getFinancialSummary();
    setFinancialSummary(fin);

    await loadRevenueChart(chartMode);

    const distData = await dashboardService.getStudentDistribution();
    setDistributionData(distData);

    const debtors = await financeService.getDebtors();
    const sorted = debtors.sort((a: any, b: any) => b.remaining - a.remaining).slice(0, 5);
    setOverdueList(sorted.map((d: any) => ({ studentName: d.studentName, amount: d.remaining, className: d.className })));

    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      const notifs = await notificationService.getForUser(userId);
      setNotifications(notifs.slice(0, 5));
    }

    useDashboardStore.getState().setLastUpdated(new Date().toISOString());
    useDashboardStore.getState().setLoading(false);
  };

  const statCards = [
    { title: 'تعداد کل شاگردان', value: stats.totalStudents, change: stats.studentGrowth, icon: <StudentsIcon />, color: 'var(--color-primary-400)' },
    { title: 'کلاس‌های فعال', value: stats.activeClasses, change: stats.classGrowth, icon: <ClassIcon />, color: 'var(--color-success)' },
    { title: 'درآمد ماه جاری', value: stats.monthlyRevenue.toLocaleString('fa-IR'), suffix: 'تومان', change: stats.revenueGrowth, changeLabel: 'نسبت به ماه قبل', icon: <RevenueIcon />, color: 'var(--color-warning)' },
    { title: 'تعداد بدهکاران', value: stats.overdueCount, change: 0, icon: <DebtIcon />, color: 'var(--color-danger)' },
  ];

  const chartModes: Array<{ key: ChartMode; label: string }> = [
    { key: 'six_months', label: '۶ ماه' },
    { key: 'weekly', label: 'هفتگی' },
    { key: 'monthly', label: 'ماهانه' },
    { key: 'yearly', label: 'سالانه' },
  ];

  const notifColor: Record<string, string> = {
    payment: 'var(--color-warning)',
    attendance: 'var(--color-primary-400)',
    class: 'var(--color-accent-400)',
    exam: 'var(--color-danger)',
    system: 'var(--color-text-tertiary)',
    backup: 'var(--color-success)',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>نمای کلی آموزشگاه</h1>
        {lastUpdated && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>آخرین به‌روزرسانی: {new Date(lastUpdated).toLocaleTimeString('fa-IR')}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {statCards.map((card, i) => <StatCard key={i} {...card} loading={isLoading} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card style={{ minHeight: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>نمودار درآمد (تومان)</h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {chartModes.map((m) => (
                <button key={m.key} onClick={() => setChartMode(m.key)} style={{ padding: '0.25rem 0.75rem', fontSize: 'var(--font-size-xs)', borderRadius: 'var(--radius-full)', background: chartMode === m.key ? 'var(--color-primary)' : 'transparent', color: chartMode === m.key ? '#fff' : 'var(--color-text-tertiary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{m.label}</button>
              ))}
            </div>
          </div>
          {chartLoading ? <Skeleton height={240} /> : revenueData.length === 0 || revenueData.every((d) => d.value === 0) ? <EmptyState title="هیچ داده‌ای برای نمایش وجود ندارد" /> : <ChartBar data={revenueData} />}
        </Card>

        <Card style={{ minHeight: 320 }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1.25rem' }}>تعداد شاگردان هر کلاس</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
            {distributionData.length === 0 ? <EmptyState title="هیچ داده‌ای برای نمایش وجود ندارد" /> : <DonutChart data={distributionData} />}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>کلاس‌های امروز</h3>
          </div>
          {todayClasses.length === 0 ? <EmptyState title="کلاسی برای امروز ثبت نشده است" /> : todayClasses.map((cls: any) => (
            <div key={cls?.cls?.id || Math.random()} style={{ padding: '0.75rem 0', borderBottom: 'var(--border-thin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{cls?.course?.title || cls?.cls?.code}</div><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{cls?.teacher?.first_name} {cls?.teacher?.last_name}</div></div>
              {cls?.session?.start_time && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{cls.session.start_time}</span>}
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>بدهکاران اخیر</h3>
          </div>
          {overdueList.length === 0 ? <EmptyState title="هیچ بدهکاری یافت نشد" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {overdueList.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < overdueList.length - 1 ? 'var(--border-thin)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{item.studentName}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{item.className}</div>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>{item.amount.toLocaleString('fa-IR')} تومان</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>خلاصه آمار مالی</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FinancialItem label="تعداد تراکنش" value={financialSummary.count.toLocaleString('fa-IR')} />
            <FinancialItem label="مجموع درآمد" value={`${financialSummary.total.toLocaleString('fa-IR')} تومان`} />
            <FinancialItem label="میانگین پرداخت" value={`${Math.round(financialSummary.average).toLocaleString('fa-IR')} تومان`} />
            <FinancialItem label="سود خالص" value={`${(financialSummary.total - financialSummary.expense).toLocaleString('fa-IR')} تومان`} />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>اعلان‌ها و یادآورها</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.length === 0 ? (
              <EmptyState title="اعلانی وجود ندارد" />
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: notifColor[n.category] || 'var(--color-text-tertiary)', flexShrink: 0, marginTop: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>{n.title}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{n.message}</div>
                  </div>
                  {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary-400)', flexShrink: 0, marginTop: 6 }} />}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

function ChartBar({ data }: { data: Array<{ name: string; value: number }> }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barColors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#6366f1', '#818cf8'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 240, paddingTop: '1rem' }}>
      {data.map((d, i) => (
        <div key={`${d.name}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{d.value > 0 ? d.value.toLocaleString('fa-IR') : '۰'}</span>
          <div style={{ width: 36, height: `${(d.value / maxVal) * 180}px`, minHeight: 4, background: d.value > 0 ? barColors[i % barColors.length] : 'var(--color-surface)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', transition: 'height var(--transition-slow)' }} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{d.name}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-surface)" strokeWidth="14" />
        {data.map((d, i) => {
          const circumference = 2 * Math.PI * 38;
          const dash = (d.value / total) * circumference;
          const el = (
            <circle key={i} cx="50" cy="50" r="38" fill="none" stroke={d.color} strokeWidth="14" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-cumulative} strokeLinecap="round" style={{ transition: 'all var(--transition-slow)' }} />
          );
          cumulative += dash;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{total.toLocaleString('fa-IR')}</span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>نفر</span>
      </div>
    </div>
  );
}

function FinancialItem({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>{label}</div><div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{value}</div></div>;
}

function StudentsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ClassIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function RevenueIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function DebtIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
