import { differenceInDays, format, parseISO, startOfDay, subDays, subMonths, subWeeks } from 'date-fns';
import type { ContainerLot, StorageSlot } from '../types';

export function slotLabel(row: number, col: number): string {
  const rowLetter = String.fromCharCode(65 + row); // A, B, C...
  return `${rowLetter}-${String(col + 1).padStart(2, '0')}`;
}

export function slotId(row: number, col: number): string {
  return `R${row}C${col}`;
}

export function generateSlots(rows: number, cols: number): StorageSlot[] {
  const slots: StorageSlot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        id: slotId(r, c),
        row: r,
        col: c,
        label: slotLabel(r, c),
        status: 'empty',
      });
    }
  }
  return slots;
}

export type AgeCategory = 'fresh' | 'good' | 'warning' | 'caution' | 'critical';

export function getAgeCategory(dateIn: string): AgeCategory {
  const days = differenceInDays(new Date(), parseISO(dateIn));
  if (days <= 30) return 'fresh';
  if (days <= 60) return 'good';
  if (days <= 90) return 'warning';
  if (days <= 120) return 'caution';
  return 'critical';
}

export function ageCategoryColor(cat: AgeCategory): string {
  const map: Record<AgeCategory, string> = {
    fresh: '#16a34a',
    good: '#65a30d',
    warning: '#ca8a04',
    caution: '#ea580c',
    critical: '#dc2626',
  };
  return map[cat];
}

export function ageCategoryBg(cat: AgeCategory): string {
  const map: Record<AgeCategory, string> = {
    fresh: 'bg-green-500',
    good: 'bg-lime-500',
    warning: 'bg-yellow-500',
    caution: 'bg-orange-500',
    critical: 'bg-red-600',
  };
  return map[cat];
}

export function ageCategoryText(cat: AgeCategory): string {
  const map: Record<AgeCategory, string> = {
    fresh: 'text-green-700 bg-green-100',
    good: 'text-lime-700 bg-lime-100',
    warning: 'text-yellow-700 bg-yellow-100',
    caution: 'text-orange-700 bg-orange-100',
    critical: 'text-red-700 bg-red-100',
  };
  return map[cat];
}

export function ageLabel(dateIn: string): string {
  const days = differenceInDays(new Date(), parseISO(dateIn));
  return `${days}d`;
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'dd MMM yyyy');
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm');
  } catch {
    return iso;
  }
}

export function generateLotNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `LOT-${y}${m}${d}-${rand}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function hashPassword(pw: string): string {
  // Simple deterministic hash for demo purposes (not production-safe)
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

export function getFIFOLots(lots: ContainerLot[]): ContainerLot[] {
  return [...lots]
    .filter(l => l.status === 'active')
    .sort((a, b) => a.dateIn.localeCompare(b.dateIn));
}

export function getDateRange(period: 'daily' | 'weekly' | 'monthly'): { from: Date; to: Date } {
  const to = new Date();
  let from: Date;
  if (period === 'daily') from = subDays(to, 30);
  else if (period === 'weekly') from = subWeeks(to, 12);
  else from = subMonths(to, 12);
  return { from: startOfDay(from), to };
}

export function numberWithCommas(n: number): string {
  return n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
