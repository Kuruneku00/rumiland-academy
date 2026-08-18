/**
 * Rumiland Academy — Dashboard Page (real data from database)
 */
import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '@/store';
import { dashboardService, notificationService, paymentService } from '@/services';
import { Card, StatCard, EmptyState, Skeleton } from '@/components/Layout';
import { Button } from '@/components/Basic';

export const DashboardPage: React.FC = () => {
  const { stats, todayClasses, latestTeachers, announcements, isLoading, lastUpdated } = useDashboardStore();
  const [revenueData, setRevenueData] = useState<Array<{ name: string; value: number }>>([]);
  const [distributionData, setDistributionData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState({ count: 0, total: 0, average: 0 });
  const [overdueList, setOverdueList] = useState<Array<{ studentName: string; amount: number; className: string }>>([]);

  useEffect(() => { loadDashboard(); const interval = setInterval(loadDashboard, 60000); return () => clearInterval(interval); }, []);

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

    // Revenue chart — real data
    const revData = await dashboardService.getRevenueChartData(6);
    setRevenueData(revData);

    // Distribution chart — real data
    const distData = await dashboardService.getStudentDistribution();
    setDistributionData(distData);

    // Overdue payments — real data
    const overdueResolved = await paymentService.getPaymentsResolved({ status: 'overdue', perPage: 5, sortBy: 'amount', sortDirection: 'desc' });
    setOverdueList(overdueResolved.data.map((r: any) => ({ studentName: r.studentName, amount: r.payment.amount, className: r.className })));

    useDashboardStore.getState().setLastUpdated(new Date().toISOString());
    useDashboardStore.getState().setLoading(false);
    setChartLoading(false);
  };

  const statCards = [
    { title: 'تعداد کل شاگردان', value: stats.totalStudents, change: stats.studentGrowth, icon: <StudentsIcon />, color: 'var(--color-primary-400)' },
    { title: 'کلاس‌های فعال', value: stats.activeClasses, change: stats.classGrowth, icon: <ClassIcon />, color: 'var(--color-success)' },
    { title: 'درآمد ماه جاری', value: stats.monthlyRevenue.toLocaleString('fa-IR'), suffix: 'تومان', change: stats.revenueGrowth, changeLabel: 'نسبت به ماه قبل', icon: <RevenueIcon />, color: 'var(--color-warning)' },
    { title: 'تعداد بدهکاران', value: stats.overdueCount, change: 0, icon: <DebtIcon />, color: 'var(--color-danger)' },
  ];

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>نمودار درآمد ماهانه (تومان)</h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {['۶ ماه', 'هفتگی', 'ماهانه', 'سالانه'].map((lbl, i) => (
                <button key={lbl} style={{ padding: '0.25rem 0.75rem', fontSize: 'var(--font-size-xs)', borderRadius: 'var(--radius-full)', background: i === 0 ? 'var(--color-primary)' : 'transparent', color: i === 0 ? '#fff' : 'var(--color-text-tertiary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
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
            <button style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>مشاهده همه</button>
          </div>
          {todayClasses.length === 0 ? <EmptyState title="کلاسی برای امروز ثبت نشده است" /> : todayClasses.map((cls: any) => (
            <div key={cls?.cls?.id || Math.random()} style={{ padding: '0.75rem 0', borderBottom: 'var(--border-thin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{cls?.course?.title || cls?.cls?.code}</div><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{cls?.teacher?.first_name} {cls?.teacher?.last_name}</div></div>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>دهکاران اخیر</h3>
            <button style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>مشاهده همه بدهکاران</button>
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
            <FinancialItem label="تعداد مورد" value={financialSummary.count.toLocaleString('fa-IR')} />
            <FinancialItem label="معاملات" value={`${financialSummary.total.toLocaleString('fa-IR')} تومان`} />
            <FinancialItem label="تجمع دریافتی" value={`${financialSummary.total.toLocaleString('fa-IR')} تومان`} />
            <FinancialItem label="میانگین پرداخت" value={`${Math.round(financialSummary.average).toLocaleString('fa-IR')} تومان`} />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>اعلان‌ها و یادآورها</h3>
            <button style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>مشاهده همه اعلان‌ها</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <AnnouncementItem color="var(--color-warning)" title="یادآوری پرداخت شهریه" />
            <AnnouncementItem color="var(--color-primary-400)" title="کلید یکم هفتگی" />
            <AnnouncementItem color="var(--color-success)" title="چک لیست وظایف امروز" />
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
        <div key={d.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{d.value > 0 ? d.value.toLocaleString('fa-IR') : '۰'}</span>
          <div style={{ width: 36, height: `${(d.value / maxVal) * 180}px`, minHeight: 4, background: d.value > 0 ? barColors[i % barColors.length] : 'var(--color-surface)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', transition: 'height var(--transition-slow)' }} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{d.name}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-surface)" strokeWidth="14" />
        {data.map((d, i) => {
          const circumference = 2 * Math.PI * 38;
          const offset = circumference - (d.value / total) * circumference;
          return <circle key={i} cx="50" cy="50" r="38" fill="none" stroke={d.color} strokeWidth="14" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset var(--transition-slow)' }} />;
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

function AnnouncementItem({ color, title }: { color: string; title: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}><div style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: color, flexShrink: 0 }} /><span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{title}</span></div>;
}

function StudentsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ClassIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function RevenueIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function DebtIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }