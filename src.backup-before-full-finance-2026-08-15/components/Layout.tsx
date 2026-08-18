/**
 * Rumiland Academy — Layout Components
 * Card, StatCard, Modal, ConfirmDialog, EmptyState, Table, Pagination
 */

import React, { useState, useEffect, useMemo, type ReactNode, type CSSProperties } from 'react';
import clsx from 'clsx';
import { Badge, Spinner, Skeleton, Button, IconButton, Select, SearchInput } from './Basic';

// ================================================================
// CARD
// ================================================================
interface CardProps { children: ReactNode; className?: string; style?: CSSProperties; hover?: boolean; padding?: string; onClick?: () => void; }
export const Card: React.FC<CardProps> = ({ children, className, style, hover = false, padding = '1.25rem', onClick }) => (
  <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-card)', border: 'var(--border-thin)', padding, cursor: onClick ? 'pointer' : undefined, transition: 'all var(--transition-base)', ...style }} className={clsx('card', hover && 'card-hover', className)} onClick={onClick}>{children}</div>
);

// ================================================================
// STATISTICS CARD
// ================================================================
interface StatCardProps { title: string; value: number | string; suffix?: string; change?: number; changeLabel?: string; icon?: ReactNode; color?: string; loading?: boolean; }
export const StatCard: React.FC<StatCardProps> = ({ title, value, suffix = '', change = 0, changeLabel = 'این ماه', icon, color, loading = false }) => {
  const isPositive = change >= 0;
  const cc = color || (isPositive ? 'var(--color-success)' : 'var(--color-danger)');
  return (
    <Card style={{ minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{title}</span>
        {icon && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: `${cc}15`, color: cc }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {loading ? <Skeleton width={80} height={32} /> : <><span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>{typeof value === 'number' ? value.toLocaleString('fa-IR') : value}</span>{suffix && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>{suffix}</span>}</>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.125rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: cc, background: `${cc}15`, padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)' }}>{isPositive ? '▲' : '▼'} {Math.abs(change)}%</span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{changeLabel}</span>
      </div>
    </Card>
  );
};

// ================================================================
// MODAL / DIALOG
// ================================================================
interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; }
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  const sz: Record<string, CSSProperties> = { sm: { maxWidth: 400 }, md: { maxWidth: 560 }, lg: { maxWidth: 720 }, xl: { maxWidth: 960 } };
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', h); };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-backdrop)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 'var(--z-modal)', width: '90vw', ...sz[size], background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-modal)', border: 'var(--border-default)', boxShadow: 'var(--shadow-2xl)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', animation: 'modalIn 0.2s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: 'var(--border-thin)', flexShrink: 0 }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{title}</h2>
          <IconButton size="sm" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></IconButton>
        </div>
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '1rem 1.5rem', borderTop: 'var(--border-thin)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>{footer}</div>}
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:translate(-50%,-48%) scale(0.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>
    </>
  );
};

// ================================================================
// CONFIRM DIALOG
// ================================================================
interface ConfirmDialogProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'primary'; }
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'تایید', cancelLabel = 'انصراف', variant = 'danger' }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>{cancelLabel}</Button><Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{message}</p>
  </Modal>
);

// ================================================================
// EMPTY STATE
// ================================================================
interface EmptyStateProps { icon?: ReactNode; title: string; description?: string; action?: ReactNode; }
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', minHeight: 240 }}>
    {icon ? <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', opacity: 0.5 }}>{icon}</div> : <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-2xl)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>}
    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</h3>
    {description && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', maxWidth: 400, lineHeight: 1.7 }}>{description}</p>}
    {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
  </div>
);

// ================================================================
// TABLE
// ================================================================
export interface Column<T> { key: string; title: string; sortable?: boolean; width?: string | number; render?: (item: T, index: number) => ReactNode; }
interface TableProps<T> { columns: Column<T>[]; data: T[]; rowKey: (item: T, index: number) => string; isLoading?: boolean; emptyState?: ReactNode; selectedIds?: string[]; onSelect?: (ids: string[]) => void; onRowClick?: (item: T) => void; sortBy?: string; sortDirection?: 'asc' | 'desc'; onSort?: (key: string) => void; className?: string; }

export function Table<T>({ columns, data, rowKey, isLoading = false, emptyState, selectedIds = [], onSelect, onRowClick, sortBy, sortDirection, onSort, className }: TableProps<T>) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  if (isLoading) return <div style={{ padding: '2rem' }}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={48} style={{ marginBottom: '0.5rem', borderRadius: 'var(--radius-md)' }} />)}</div>;
  if (data.length === 0 && emptyState) return <>{emptyState}</>;
  return (
    <div className={clsx('table-wrapper', className)} style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: 'var(--border-default)' }}>
          {onSelect && <th style={{ padding: '0.75rem 0.5rem', width: 40 }}><input type="checkbox" checked={allSelected} onChange={() => onSelect?.(allSelected ? [] : data.map((item, i) => rowKey(item, i)))} style={{ accentColor: 'var(--color-primary)' }} /></th>}
          {columns.map((col) => <th key={col.key} style={{ padding: '0.75rem 1rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textAlign: 'right', whiteSpace: 'nowrap', cursor: col.sortable ? 'pointer' : undefined, userSelect: 'none', width: col.width }} onClick={() => col.sortable && onSort?.(col.key)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>{col.title}{col.sortable && sortBy === col.key && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}</span></th>)}
        </tr></thead>
        <tbody>{data.map((item, index) => {
          const id = rowKey(item, index); const sel = selectedIds.includes(id);
          return <tr key={id} onClick={() => onRowClick?.(item)} style={{ borderBottom: 'var(--border-thin)', cursor: onRowClick ? 'pointer' : undefined, background: sel ? 'var(--color-sidebar-active)' : 'transparent', transition: 'background var(--transition-fast)' }} onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = 'var(--color-surface-hover)'; }} onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
            {onSelect && <td style={{ padding: '0.75rem 0.5rem' }} onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel} onChange={() => onSelect?.(sel ? selectedIds.filter((s) => s !== id) : [...selectedIds, id])} style={{ accentColor: 'var(--color-primary)' }} /></td>}
            {columns.map((col) => <td key={col.key} style={{ padding: '0.75rem 1rem', fontSize: 'var(--font-size-md)' }}>{col.render ? col.render(item, index) : (item as any)[col.key]}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

// ================================================================
// PAGINATION
// ================================================================
interface PaginationProps { page: number; perPage: number; total: number; onPageChange: (p: number) => void; onPerPageChange: (p: number) => void; label?: string; }
export const Pagination: React.FC<PaginationProps> = ({ page, perPage, total, onPageChange, onPerPageChange, label = 'مورد' }) => {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const pages = useMemo(() => {
    const p: (number | '...')[] = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) p.push(i);
    else { p.push(1); if (page > 3) p.push('...'); for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) p.push(i); if (page < totalPages - 2) p.push('...'); p.push(totalPages); }
    return p;
  }, [page, totalPages]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: 'var(--border-thin)', flexWrap: 'wrap', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>نمایش {start.toLocaleString('fa-IR')} تا {end.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')} {label}</span>
        <Select options={[{ value: '10', label: '۱۰ در صفحه' }, { value: '20', label: '۲۰ در صفحه' }, { value: '50', label: '۵۰ در صفحه' }, { value: '100', label: '۱۰۰ در صفحه' }]} value={String(perPage)} onChange={(v) => onPerPageChange(Number(v))} />
      </div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {pages.map((p, i) => p === '...' ? <span key={`d${i}`} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>…</span> : (
          <button key={p} onClick={() => onPageChange(p)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', border: 'var(--border-default)', background: p === page ? 'var(--color-primary)' : 'var(--color-surface)', color: p === page ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: p === page ? 600 : 400, fontSize: 'var(--font-size-sm)' }}>{p.toLocaleString('fa-IR')}</button>
        ))}
      </div>
    </div>
  );
};

// Re-export
export { Badge, Spinner, Skeleton, Button, IconButton, Select, SearchInput };