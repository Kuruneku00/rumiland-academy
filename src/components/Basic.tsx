/**
 * Rumiland Academy — Reusable UI Component Library
 * Part 1: Basic Components (Button, Input, Select, Badge, Card, etc.)
 */

import React, { useState, useEffect, useMemo, type ReactNode, type CSSProperties, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

// ================================================================
// BUTTON
// ================================================================
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', loading = false, icon, fullWidth = false, children, className, disabled, ...props }) => {
  const base: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 500, borderRadius: 'var(--radius-button)', border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled || loading ? 0.6 : 1, transition: 'all var(--transition-fast)', whiteSpace: 'nowrap', fontFamily: 'inherit', width: fullWidth ? '100%' : undefined };
  const sz: Record<string, CSSProperties> = { sm: { padding: '0.375rem 0.75rem', fontSize: 'var(--font-size-xs)', height: 32 }, md: { padding: '0.5rem 1.25rem', fontSize: 'var(--font-size-sm)', height: 38 }, lg: { padding: '0.625rem 1.5rem', fontSize: 'var(--font-size-md)', height: 44 } };
  const vr: Record<string, CSSProperties> = { primary: { background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 8px var(--color-primary-glow)' }, secondary: { background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-card-border)' }, ghost: { background: 'transparent', color: 'var(--color-text-secondary)' }, danger: { background: 'var(--color-danger)', color: '#fff', boxShadow: '0 2px 8px var(--color-danger-glow)' }, success: { background: 'var(--color-success)', color: '#fff' }, outline: { background: 'transparent', color: 'var(--color-primary-400)', border: '1px solid var(--color-primary-600)' } };
  return <button style={{ ...base, ...sz[size], ...vr[variant] }} className={clsx('btn', className)} disabled={disabled || loading} {...props}>{loading && <Spinner size={14} />}{!loading && icon && <span className="btn-icon">{icon}</span>}{children}</button>;
};

// ================================================================
// ICON BUTTON
// ================================================================
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg'; variant?: 'ghost' | 'surface'; tooltip?: string;
}
export const IconButton: React.FC<IconButtonProps> = ({ size = 'md', variant = 'ghost', tooltip, children, className, ...props }) => {
  const sz: Record<string, CSSProperties> = { sm: { width: 32, height: 32, fontSize: 16 }, md: { width: 38, height: 38, fontSize: 18 }, lg: { width: 44, height: 44, fontSize: 20 } };
  return <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: variant === 'surface' ? 'var(--color-surface)' : 'transparent', color: 'var(--color-text-secondary)', transition: 'all var(--transition-fast)', ...sz[size] }} className={clsx('icon-btn', className)} title={tooltip} {...props}>{children}</button>;
};

// ================================================================
// INPUT
// ================================================================
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; icon?: ReactNode; iconPosition?: 'left' | 'right'; }
export const Input: React.FC<InputProps> = ({ label, error, icon, iconPosition = 'right', className, style, ...props }) => (
  <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
    {label && <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</label>}
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && <span style={{ position: 'absolute', [iconPosition]: '0.75rem', zIndex: 1, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>{icon}</span>}
      <input style={{ width: '100%', height: 40, padding: icon ? (iconPosition === 'right' ? '0.75rem 3rem 0.75rem 1rem' : '0.75rem 1rem 0.75rem 3rem') : '0.75rem 1rem', background: 'var(--color-input)', border: error ? 'var(--border-error)' : 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', outline: 'none', ...style }} className={clsx('input', className)} {...props} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-input-focus)'; props.onFocus?.(e); }} onBlur={(e) => { e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-input-border)'; props.onBlur?.(e); }} />
    </div>
    {error && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>{error}</span>}
  </div>
);

// ================================================================
// SEARCH INPUT
// ================================================================
interface SearchInputProps { placeholder?: string; value: string; onChange: (v: string) => void; className?: string; }
export const SearchInput: React.FC<SearchInputProps> = ({ placeholder = 'جستجو...', value, onChange, className }) => (
  <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
    <svg style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', height: 40, padding: '0 2.5rem 0 0.75rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', outline: 'none' }} className={clsx('search-input', className)} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-input-focus)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-input-border)'; }} />
  </div>
);

// ================================================================
// SELECT
// ================================================================
interface SelectProps { label?: string; options: Array<{ value: string; label: string }>; value: string; onChange: (v: string) => void; placeholder?: string; className?: string; }
export const Select: React.FC<SelectProps> = ({ label, options, value, onChange, placeholder, className }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
    {label && <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</label>}
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ height: 40, padding: '0 0.75rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', outline: 'none', cursor: 'pointer', minWidth: 160 }} className={clsx('select', className)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// ================================================================
// TEXTAREA
// ================================================================
interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string; }
export const Textarea: React.FC<TextareaProps> = ({ label, error, className, style, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
    {label && <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</label>}
    <textarea style={{ width: '100%', minHeight: 100, padding: '0.75rem', background: 'var(--color-input)', border: error ? 'var(--border-error)' : 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', ...style }} className={clsx('textarea', className)} {...props} />
    {error && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>{error}</span>}
  </div>
);

// ================================================================
// BADGE
// ================================================================
interface BadgeProps { children: ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'; size?: 'sm' | 'md'; }
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => {
  const colors: Record<string, string> = { success: 'var(--color-success)', warning: 'var(--color-warning)', danger: 'var(--color-danger)', info: 'var(--color-info)', primary: 'var(--color-primary)', neutral: 'var(--color-text-tertiary)' };
  const c = colors[variant];
  return <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: size === 'sm' ? 'var(--font-size-xs)' : 'var(--font-size-sm)', fontWeight: 600, padding: size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', background: `${c}18`, color: c, whiteSpace: 'nowrap' }}>{children}</span>;
};

// ================================================================
// SPINNER
// ================================================================
interface SpinnerProps { size?: number; }
export const Spinner: React.FC<SpinnerProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="var(--color-surface)" strokeWidth="3" fill="none" />
    <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="3" fill="none" strokeDasharray="50" strokeLinecap="round" />
  </svg>
);

// ================================================================
// SKELETON
// ================================================================
interface SkeletonProps { width?: number | string; height?: number | string; style?: CSSProperties; }
export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, style }) => (
  <div style={{ width, height, background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', animation: 'skeletonPulse 1.5s ease infinite', ...style }} />
);