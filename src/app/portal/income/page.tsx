'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Trophy,
  Clock,
  Zap,
  Video,
  Phone,
  Users,
  BarChart3,
  Sun,
  CalendarRange,
  CalendarCheck,
  Target,
  Activity,
  Repeat,
  Flame,
  BarChart2,
} from 'lucide-react';
import {
  format,
  parseISO,
  subMonths,
  subDays,
  subWeeks,
  isSameMonth,
  isAfter,
  isToday,
  startOfWeek,
  endOfWeek,
  getDay,
  getDate,
  getDaysInMonth,
  differenceInDays,
  differenceInWeeks,
  getHours,
} from 'date-fns';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppointments } from '@/lib/hooks/useAppointments';
import type { Appointment } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import ActiveSessionCard from '@/components/portal/ActiveSessionCard';

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeRange = '3m' | '6m' | '12m' | 'all';
type InsightTab = 'daily' | 'weekly' | 'monthly';

interface InsightItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: 'emerald' | 'violet' | 'blue' | 'amber';
}

interface PeriodMetric {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  color: 'emerald' | 'violet' | 'blue' | 'amber';
  trend?: 'up' | 'down' | 'neutral';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RANGES: { key: TimeRange; label: string }[] = [
  { key: '3m', label: '3 Months' },
  { key: '6m', label: '6 Months' },
  { key: '12m', label: '12 Months' },
  { key: 'all', label: 'All Time' },
];

const CHART_COLORS = {
  emerald: '#10b981',
  violet: '#7c3aed',
  blue: '#3b82f6',
  amber: '#f59e0b',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const RANGE_MONTHS: Record<TimeRange, number> = {
  '3m': 3,
  '6m': 6,
  '12m': 12,
  all: 0,
};

const ICON_COLOR_MAP = {
  violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
};

const INSIGHT_TABS: { key: InsightTab; label: string; icon: LucideIcon }[] = [
  { key: 'daily', label: 'Daily', icon: Sun },
  { key: 'weekly', label: 'Weekly', icon: CalendarRange },
  { key: 'monthly', label: 'Monthly', icon: CalendarCheck },
];

const SECTION_DELAY_STEP = 0.1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLKR(amount: number): string {
  return `LKR ${amount.toLocaleString()}`;
}

function calcGrowthPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function safeParse(dateStr: string): Date | null {
  try {
    return parseISO(dateStr);
  } catch {
    return null;
  }
}

function filterByRange(paid: Appointment[], range: TimeRange): Appointment[] {
  if (range === 'all') return paid;
  const cutoff = subMonths(new Date(), RANGE_MONTHS[range]);
  return paid.filter((a) => {
    const d = safeParse(a.scheduledAt);
    return d && isAfter(d, cutoff);
  });
}

function filterByPreviousPeriod(paid: Appointment[], range: TimeRange): Appointment[] {
  if (range === 'all') return [];
  const months = RANGE_MONTHS[range];
  const now = new Date();
  const periodStart = subMonths(now, months * 2);
  const periodEnd = subMonths(now, months);
  return paid.filter((a) => {
    const d = safeParse(a.scheduledAt);
    return d && isAfter(d, periodStart) && !isAfter(d, periodEnd);
  });
}

function buildMonthlyData(
  filtered: Appointment[],
  fee: number,
  range: TimeRange,
): { month: string; income: number; sessions: number; cumulative: number }[] {
  const now = new Date();
  const monthCount = range === 'all' ? 12 : RANGE_MONTHS[range];
  const monthlyMap: Record<string, number> = {};

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap[format(d, 'MMM yyyy')] = 0;
  }

  filtered.forEach((a) => {
    const d = safeParse(a.scheduledAt);
    if (!d) return;
    const key = format(d, 'MMM yyyy');
    if (key in monthlyMap) {
      monthlyMap[key] += fee;
    }
  });

  let cumulative = 0;
  return Object.entries(monthlyMap).map(([month, income]) => {
    cumulative += income;
    return {
      month,
      income,
      sessions: fee > 0 && income > 0 ? Math.round(income / fee) : 0,
      cumulative,
    };
  });
}

function buildConsultationBreakdown(
  filtered: Appointment[],
  fee: number,
): { type: string; income: number; count: number; pct: number }[] {
  const video = filtered.filter((a) => a.consultationType === 'video');
  const audio = filtered.filter((a) => a.consultationType === 'audio');
  const total = filtered.length || 1;
  return [
    { type: 'video', income: video.length * fee, count: video.length, pct: Math.round((video.length / total) * 100) },
    { type: 'audio', income: audio.length * fee, count: audio.length, pct: Math.round((audio.length / total) * 100) },
  ];
}

function buildDayOfWeekData(
  filtered: Appointment[],
  fee: number,
): { day: string; dayIndex: number; income: number; sessions: number }[] {
  const counts = new Array(7).fill(0) as number[];
  filtered.forEach((a) => {
    const d = safeParse(a.scheduledAt);
    if (d) counts[getDay(d)]++;
  });
  const reordered = [1, 2, 3, 4, 5, 6, 0];
  return reordered.map((i) => ({
    day: DAY_NAMES[i],
    dayIndex: i,
    income: counts[i] * fee,
    sessions: counts[i],
  }));
}

function buildSparkline(paid: Appointment[], fee: number): number[] {
  const now = new Date();
  const result: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = paid.filter((a) => {
      const d = safeParse(a.scheduledAt);
      return d && isSameMonth(d, month);
    }).length;
    result.push(count * fee);
  }
  return result;
}

function generateInsights(filtered: Appointment[], fee: number): InsightItem[] {
  const insights: InsightItem[] = [];
  if (filtered.length === 0) return insights;

  // Best month
  const monthCounts: Record<string, number> = {};
  filtered.forEach((a) => {
    const d = safeParse(a.scheduledAt);
    if (!d) return;
    const key = format(d, 'MMM yyyy');
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });
  const bestMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  if (bestMonth) {
    insights.push({
      icon: Trophy,
      title: 'Best Month',
      description: `${bestMonth[0]} was your highest earning month with ${formatLKR(bestMonth[1] * fee)} from ${bestMonth[1]} sessions`,
      color: 'amber',
    });
  }

  // Busiest day
  const dayCounts = new Array(7).fill(0) as number[];
  filtered.forEach((a) => {
    const d = safeParse(a.scheduledAt);
    if (d) dayCounts[getDay(d)]++;
  });
  const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  if (dayCounts[maxDayIdx] > 0) {
    insights.push({
      icon: Calendar,
      title: 'Busiest Day',
      description: `Most sessions happen on ${DAY_NAMES[maxDayIdx]}s with ${dayCounts[maxDayIdx]} consultations`,
      color: 'blue',
    });
  }

  // Growth trend
  const midpoint = Math.floor(filtered.length / 2);
  const sortedByDate = [...filtered].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const firstHalf = sortedByDate.slice(0, midpoint);
  const secondHalf = sortedByDate.slice(midpoint);
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const growth = calcGrowthPct(secondHalf.length * fee, firstHalf.length * fee);
    if (growth !== null) {
      insights.push({
        icon: growth >= 0 ? TrendingUp : TrendingDown,
        title: growth >= 0 ? 'Growing Revenue' : 'Revenue Dip',
        description: growth >= 0
          ? `Revenue increased by ${growth}% in the recent period compared to earlier`
          : `Revenue decreased by ${Math.abs(growth)}% — consider expanding availability`,
        color: growth >= 0 ? 'emerald' : 'amber',
      });
    }
  }

  // Session frequency
  if (filtered.length >= 2) {
    const dates = filtered.map((a) => safeParse(a.scheduledAt)).filter((d): d is Date => d !== null).sort((a, b) => a.getTime() - b.getTime());
    const weeks = Math.max(1, differenceInWeeks(dates[dates.length - 1], dates[0]));
    const perWeek = (filtered.length / weeks).toFixed(1);
    insights.push({
      icon: Clock,
      title: 'Session Frequency',
      description: `You average ${perWeek} sessions per week across this period`,
      color: 'violet',
    });
  }

  // Peak hours
  const hourBuckets: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
  filtered.forEach((a) => {
    const d = safeParse(a.scheduledAt);
    if (!d) return;
    const h = getHours(d);
    if (h >= 6 && h < 12) hourBuckets['Morning']++;
    else if (h >= 12 && h < 17) hourBuckets['Afternoon']++;
    else if (h >= 17 && h < 21) hourBuckets['Evening']++;
    else hourBuckets['Night']++;
  });
  const peakPeriod = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
  if (peakPeriod && peakPeriod[1] > 0) {
    insights.push({
      icon: Zap,
      title: 'Peak Hours',
      description: `Most appointments are in the ${peakPeriod[0].toLowerCase()} — ${peakPeriod[1]} sessions scheduled during this period`,
      color: 'emerald',
    });
  }

  return insights;
}

// ─── Period Insight Builders ─────────────────────────────────────────────────

function buildDailyInsights(filtered: Appointment[], fee: number): PeriodMetric[] {
  if (filtered.length === 0 || fee === 0) return [];
  const metrics: PeriodMetric[] = [];
  const now = new Date();

  const withDates = filtered
    .map((a) => ({ apt: a, date: safeParse(a.scheduledAt) }))
    .filter((x): x is { apt: Appointment; date: Date } => x.date !== null);
  if (withDates.length === 0) return [];

  // 1. Today's Earnings
  const todaySessions = withDates.filter((x) => isToday(x.date));
  const todayIncome = todaySessions.length * fee;
  const activeDaySet = new Set<string>();
  withDates.forEach((x) => activeDaySet.add(format(x.date, 'yyyy-MM-dd')));
  const activeDays = activeDaySet.size;
  const dailyAvg = activeDays > 0 ? (filtered.length * fee) / activeDays : 0;
  const todayVsAvg = dailyAvg > 0 ? ((todayIncome - dailyAvg) / dailyAvg) * 100 : 0;

  metrics.push({
    icon: Sun,
    label: "Today's Earnings",
    value: formatLKR(todayIncome),
    detail: todaySessions.length > 0
      ? `${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''} — ${todayVsAvg >= 0 ? 'above' : 'below'} daily avg of ${formatLKR(Math.round(dailyAvg))}`
      : `No sessions yet — daily avg is ${formatLKR(Math.round(dailyAvg))}`,
    color: todayIncome >= dailyAvg ? 'emerald' : 'amber',
    trend: todayIncome >= dailyAvg ? 'up' : 'down',
  });

  // 2. Best Single Day
  const dayIncomeMap: Record<string, { income: number; sessions: number }> = {};
  withDates.forEach((x) => {
    const key = format(x.date, 'yyyy-MM-dd');
    if (!dayIncomeMap[key]) dayIncomeMap[key] = { income: 0, sessions: 0 };
    dayIncomeMap[key].income += fee;
    dayIncomeMap[key].sessions++;
  });
  const bestDay = Object.entries(dayIncomeMap).sort((a, b) => b[1].income - a[1].income)[0];
  if (bestDay) {
    const bestDate = safeParse(bestDay[0]);
    metrics.push({
      icon: Trophy,
      label: 'Best Day',
      value: formatLKR(bestDay[1].income),
      detail: bestDate
        ? `${format(bestDate, 'EEEE, MMM d')} — ${bestDay[1].sessions} sessions`
        : `${bestDay[1].sessions} sessions`,
      color: 'amber',
    });
  }

  // 3. Earning Streak
  const sortedDayKeys = Object.keys(dayIncomeMap).sort().reverse();
  let streak = 0;
  if (sortedDayKeys.length > 0) {
    const startDate = safeParse(sortedDayKeys[0]);
    if (startDate) {
      for (let i = 0; i < 365; i++) {
        const checkDate = format(subDays(startDate, i), 'yyyy-MM-dd');
        if (dayIncomeMap[checkDate]) streak++;
        else break;
      }
    }
  }
  metrics.push({
    icon: Flame,
    label: 'Earning Streak',
    value: `${streak} day${streak !== 1 ? 's' : ''}`,
    detail: streak >= 5 ? 'Excellent consistency — keep it up!' : streak >= 3 ? 'Good momentum building' : 'Book more sessions to build a streak',
    color: streak >= 5 ? 'emerald' : streak >= 3 ? 'violet' : 'blue',
  });

  // 4. Active Day Rate
  const dates = withDates.map((x) => x.date).sort((a, b) => a.getTime() - b.getTime());
  const totalCalendarDays = Math.max(1, differenceInDays(dates[dates.length - 1], dates[0]) + 1);
  const activeRate = Math.round((activeDays / totalCalendarDays) * 100);
  metrics.push({
    icon: Activity,
    label: 'Active Day Rate',
    value: `${activeRate}%`,
    detail: `Sessions on ${activeDays} of ${totalCalendarDays} calendar days`,
    color: activeRate >= 50 ? 'emerald' : activeRate >= 25 ? 'violet' : 'amber',
  });

  // 5. Daily Earning Velocity
  const thisMonthSessions = withDates.filter((x) => isSameMonth(x.date, now)).length;
  const dayOfMonth = getDate(now);
  const daysInMonth = getDaysInMonth(now);
  const projectedMonthly = dayOfMonth > 0 ? Math.round((thisMonthSessions / dayOfMonth) * daysInMonth * fee) : 0;
  metrics.push({
    icon: Target,
    label: 'Monthly Projection',
    value: formatLKR(projectedMonthly),
    detail: `At current pace of ${(thisMonthSessions / Math.max(1, dayOfMonth)).toFixed(1)} sessions/day — ${daysInMonth - dayOfMonth} days remaining`,
    color: 'violet',
  });

  return metrics;
}

function buildWeeklyInsights(filtered: Appointment[], fee: number): PeriodMetric[] {
  if (filtered.length === 0 || fee === 0) return [];
  const metrics: PeriodMetric[] = [];
  const now = new Date();

  const withDates = filtered
    .map((a) => ({ apt: a, date: safeParse(a.scheduledAt) }))
    .filter((x): x is { apt: Appointment; date: Date } => x.date !== null);
  if (withDates.length === 0) return [];

  // Group by ISO week
  const weekMap: Record<string, { income: number; sessions: number; weekStart: Date }> = {};
  withDates.forEach((x) => {
    const ws = startOfWeek(x.date, { weekStartsOn: 1 });
    const key = format(ws, 'yyyy-MM-dd');
    if (!weekMap[key]) weekMap[key] = { income: 0, sessions: 0, weekStart: ws };
    weekMap[key].income += fee;
    weekMap[key].sessions++;
  });
  const weekEntries = Object.entries(weekMap).sort((a, b) => b[0].localeCompare(a[0]));

  // 1. This Week vs Last Week
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const thisWeekKey = format(thisWeekStart, 'yyyy-MM-dd');
  const lastWeekKey = format(lastWeekStart, 'yyyy-MM-dd');
  const thisWeekData = weekMap[thisWeekKey] || { income: 0, sessions: 0 };
  const lastWeekData = weekMap[lastWeekKey] || { income: 0, sessions: 0 };
  const wowChange = calcGrowthPct(thisWeekData.income, lastWeekData.income);

  metrics.push({
    icon: CalendarRange,
    label: 'This Week',
    value: formatLKR(thisWeekData.income),
    detail: wowChange !== null
      ? `${thisWeekData.sessions} sessions — ${wowChange >= 0 ? '+' : ''}${wowChange}% vs last week`
      : `${thisWeekData.sessions} sessions this week`,
    color: wowChange !== null && wowChange >= 0 ? 'emerald' : 'amber',
    trend: wowChange !== null ? (wowChange >= 0 ? 'up' : 'down') : 'neutral',
  });

  // 2. Weekly Average
  const totalWeeks = Math.max(1, weekEntries.length);
  const weeklyAvg = Math.round((filtered.length * fee) / totalWeeks);
  metrics.push({
    icon: BarChart2,
    label: 'Weekly Average',
    value: formatLKR(weeklyAvg),
    detail: `Across ${totalWeeks} week${totalWeeks > 1 ? 's' : ''} in this period`,
    color: 'blue',
  });

  // 3. Best Week
  const bestWeek = [...weekEntries].sort((a, b) => b[1].income - a[1].income)[0];
  if (bestWeek) {
    const ws = bestWeek[1].weekStart;
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    metrics.push({
      icon: Trophy,
      label: 'Best Week',
      value: formatLKR(bestWeek[1].income),
      detail: `${format(ws, 'MMM d')} – ${format(we, 'MMM d')} — ${bestWeek[1].sessions} sessions`,
      color: 'amber',
    });
  }

  // 4. Weekday vs Weekend Split
  let weekdaySessions = 0;
  let weekendSessions = 0;
  withDates.forEach((x) => {
    const day = getDay(x.date);
    if (day === 0 || day === 6) weekendSessions++;
    else weekdaySessions++;
  });
  const total = weekdaySessions + weekendSessions || 1;
  const weekdayPct = Math.round((weekdaySessions / total) * 100);
  const weekendPct = 100 - weekdayPct;
  metrics.push({
    icon: Calendar,
    label: 'Weekday vs Weekend',
    value: `${weekdayPct}% / ${weekendPct}%`,
    detail: `${weekdaySessions} weekday + ${weekendSessions} weekend sessions — ${weekdayPct > weekendPct ? 'weekdays dominate' : weekendPct > weekdayPct ? 'weekends dominate' : 'evenly split'}`,
    color: 'violet',
  });

  // 5. Weekly Consistency
  if (weekEntries.length >= 3) {
    const weekIncomes = weekEntries.map((w) => w[1].income);
    const mean = weekIncomes.reduce((s, v) => s + v, 0) / weekIncomes.length;
    const variance = weekIncomes.reduce((s, v) => s + (v - mean) ** 2, 0) / weekIncomes.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
    const consistency = cv < 30 ? 'High' : cv < 60 ? 'Moderate' : 'Low';
    const consistencyColor: 'emerald' | 'violet' | 'amber' = cv < 30 ? 'emerald' : cv < 60 ? 'violet' : 'amber';
    metrics.push({
      icon: Activity,
      label: 'Weekly Consistency',
      value: consistency,
      detail: consistency === 'High'
        ? 'Steady income — earnings are well-distributed across weeks'
        : consistency === 'Moderate'
          ? 'Some variation — a few weeks are significantly busier than others'
          : 'High variation — earnings fluctuate significantly week to week',
      color: consistencyColor,
    });
  }

  return metrics;
}

function buildMonthlyInsights(filtered: Appointment[], fee: number): PeriodMetric[] {
  if (filtered.length === 0 || fee === 0) return [];
  const metrics: PeriodMetric[] = [];
  const now = new Date();

  const withDates = filtered
    .map((a) => ({ apt: a, date: safeParse(a.scheduledAt) }))
    .filter((x): x is { apt: Appointment; date: Date } => x.date !== null);
  if (withDates.length === 0) return [];

  // Group by month
  const monthMap: Record<string, { income: number; sessions: number; patients: Set<string> }> = {};
  withDates.forEach((x) => {
    const key = format(x.date, 'yyyy-MM');
    if (!monthMap[key]) monthMap[key] = { income: 0, sessions: 0, patients: new Set() };
    monthMap[key].income += fee;
    monthMap[key].sessions++;
    monthMap[key].patients.add(x.apt.userId);
  });
  const monthEntries = Object.entries(monthMap).sort((a, b) => b[0].localeCompare(a[0]));

  // 1. Monthly Projection
  const thisMonthKey = format(now, 'yyyy-MM');
  const thisMonthData = monthMap[thisMonthKey];
  const dayOfMonth = getDate(now);
  const daysInMonth = getDaysInMonth(now);

  if (thisMonthData) {
    const projected = Math.round((thisMonthData.income / dayOfMonth) * daysInMonth);
    const daysLeft = daysInMonth - dayOfMonth;
    metrics.push({
      icon: Target,
      label: 'Month-End Projection',
      value: formatLKR(projected),
      detail: `${formatLKR(thisMonthData.income)} earned so far — ${daysLeft} days left at ${(thisMonthData.sessions / dayOfMonth).toFixed(1)} sessions/day`,
      color: 'violet',
    });
  }

  // 2. Three-Month Trend
  if (monthEntries.length >= 2) {
    const recent3 = monthEntries.slice(0, 3).reverse();
    const trendValues = recent3.map((m) => m[1].income);
    const isGrowing = trendValues.every((v, i) => i === 0 || v >= trendValues[i - 1]);
    const isDeclining = trendValues.every((v, i) => i === 0 || v <= trendValues[i - 1]);
    const trendLabel = isGrowing ? 'Growing' : isDeclining ? 'Declining' : 'Mixed';
    const trendArrow = recent3.map((m) => {
      const d = safeParse(m[0] + '-01');
      return d ? format(d, 'MMM') : m[0];
    }).join(' → ');
    metrics.push({
      icon: isGrowing ? TrendingUp : isDeclining ? TrendingDown : Activity,
      label: 'Monthly Trend',
      value: trendLabel,
      detail: `${trendArrow}: ${recent3.map((m) => formatLKR(m[1].income)).join(' → ')}`,
      color: isGrowing ? 'emerald' : isDeclining ? 'amber' : 'blue',
      trend: isGrowing ? 'up' : isDeclining ? 'down' : 'neutral',
    });
  }

  // 3. Best vs Worst Month
  if (monthEntries.length >= 2) {
    const sorted = [...monthEntries].sort((a, b) => b[1].income - a[1].income);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const bestDate = safeParse(best[0] + '-01');
    const worstDate = safeParse(worst[0] + '-01');
    const bestName = bestDate ? format(bestDate, 'MMM yyyy') : best[0];
    const worstName = worstDate ? format(worstDate, 'MMM yyyy') : worst[0];
    metrics.push({
      icon: BarChart2,
      label: 'Best vs Lowest Month',
      value: formatLKR(best[1].income),
      detail: `Best: ${bestName} (${best[1].sessions} sessions) — Lowest: ${worstName} at ${formatLKR(worst[1].income)}`,
      color: 'amber',
    });
  }

  // 4. Revenue Per Unique Patient
  if (thisMonthData && thisMonthData.patients.size > 0) {
    const revenuePerPatient = Math.round(thisMonthData.income / thisMonthData.patients.size);
    metrics.push({
      icon: Users,
      label: 'Revenue Per Patient',
      value: formatLKR(revenuePerPatient),
      detail: `${thisMonthData.patients.size} unique patient${thisMonthData.patients.size > 1 ? 's' : ''} this month — avg ${(thisMonthData.sessions / thisMonthData.patients.size).toFixed(1)} sessions each`,
      color: 'blue',
    });
  }

  // 5. Returning Patient Rate
  if (thisMonthData && thisMonthData.sessions > 1) {
    const thisMonthAppointments = withDates.filter((x) => isSameMonth(x.date, now));
    const patientSessionCounts: Record<string, number> = {};
    thisMonthAppointments.forEach((x) => {
      patientSessionCounts[x.apt.userId] = (patientSessionCounts[x.apt.userId] || 0) + 1;
    });
    const returningPatients = Object.values(patientSessionCounts).filter((c) => c > 1).length;
    const totalPatients = Object.keys(patientSessionCounts).length;
    const returnRate = totalPatients > 0 ? Math.round((returningPatients / totalPatients) * 100) : 0;
    metrics.push({
      icon: Repeat,
      label: 'Returning Patients',
      value: `${returnRate}%`,
      detail: returningPatients > 0
        ? `${returningPatients} of ${totalPatients} patients had multiple sessions this month`
        : `All ${totalPatients} patients had single sessions — follow-ups could boost revenue`,
      color: returnRate >= 30 ? 'emerald' : 'violet',
    });
  }

  return metrics;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function EnhancedStatCard({
  title, value, icon: Icon, color, growth, subtitle, sparklineData,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  color: 'emerald' | 'violet' | 'blue' | 'amber';
  growth?: number | null;
  subtitle?: string;
  sparklineData?: number[];
}) {
  const colorHex = CHART_COLORS[color];
  const ic = ICON_COLOR_MAP[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 truncate">{value}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {growth !== undefined && growth !== null && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(growth)}%
              </span>
            )}
            {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ic.bg} ${ic.text}`}>
            <Icon className="w-5 h-5" />
          </div>
          {sparklineData && sparklineData.some((v) => v > 0) && (
            <div className="w-[60px] h-[28px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData.map((v, i) => ({ v, i }))}>
                  <defs>
                    <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colorHex} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={colorHex} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={colorHex} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomRevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; payload?: { sessions?: number } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 text-sm">
      <p className="font-medium text-slate-900 mb-1">{label}</p>
      <p className="text-violet-600">Income: {formatLKR(Number(payload[0]?.value ?? 0))}</p>
      {payload[1] && <p className="text-slate-400">Cumulative: {formatLKR(Number(payload[1]?.value ?? 0))}</p>}
      <p className="text-slate-400 text-xs mt-1">{payload[0]?.payload?.sessions ?? 0} sessions</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: { count?: number; pct?: number } }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 text-sm">
      <p className="font-medium text-slate-900 capitalize">{data?.name}</p>
      <p className="text-violet-600">{formatLKR(Number(data?.value ?? 0))}</p>
      <p className="text-slate-400 text-xs">{data?.payload?.count} sessions ({data?.payload?.pct}%)</p>
    </div>
  );
}

function CustomDayTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { day?: string; income?: number; sessions?: number } }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 text-sm">
      <p className="font-medium text-slate-900">{data?.day}</p>
      <p className="text-emerald-600">{formatLKR(data?.income ?? 0)}</p>
      <p className="text-slate-400 text-xs">{data?.sessions} sessions</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IncomePage() {
  return (
    <AuthGuard>
      <IncomeContent />
    </AuthGuard>
  );
}

function IncomeContent() {
  const { specialist } = useAuth();
  const { paid, loading } = useAppointments(specialist?.id);
  const feePerSession = (specialist?.priceInCents ?? 0) / 100;

  // State
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const [insightTab, setInsightTab] = useState<InsightTab>('daily');
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(0);
  const [txSortDir, setTxSortDir] = useState<'desc' | 'asc'>('desc');

  // Filtered by time range
  const filtered = useMemo(() => filterByRange(paid, timeRange), [paid, timeRange]);

  // KPI stats
  const kpiStats = useMemo(() => {
    const now = new Date();
    const totalIncome = filtered.length * feePerSession;
    const totalSessions = filtered.length;
    const thisMonthPaid = filtered.filter((a) => { const d = safeParse(a.scheduledAt); return d && isSameMonth(d, now); });
    const lastMonth = subMonths(now, 1);
    const lastMonthPaid = filtered.filter((a) => { const d = safeParse(a.scheduledAt); return d && isSameMonth(d, lastMonth); });
    const thisMonthIncome = thisMonthPaid.length * feePerSession;
    const lastMonthIncome = lastMonthPaid.length * feePerSession;
    const momGrowth = calcGrowthPct(thisMonthIncome, lastMonthIncome);
    const prevFiltered = filterByPreviousPeriod(paid, timeRange);
    const prevTotalIncome = prevFiltered.length * feePerSession;
    const totalGrowth = calcGrowthPct(totalIncome, prevTotalIncome);
    const sparklineData = buildSparkline(paid, feePerSession);
    return { totalIncome, totalGrowth, thisMonthIncome, momGrowth, totalSessions, sparklineData };
  }, [filtered, paid, feePerSession, timeRange]);

  const monthlyData = useMemo(() => buildMonthlyData(filtered, feePerSession, timeRange), [filtered, feePerSession, timeRange]);
  const consultationBreakdown = useMemo(() => buildConsultationBreakdown(filtered, feePerSession), [filtered, feePerSession]);
  const dayOfWeekData = useMemo(() => buildDayOfWeekData(filtered, feePerSession), [filtered, feePerSession]);
  const insights = useMemo(() => generateInsights(filtered, feePerSession), [filtered, feePerSession]);

  // Period insights
  const dailyInsights = useMemo(() => buildDailyInsights(filtered, feePerSession), [filtered, feePerSession]);
  const weeklyInsights = useMemo(() => buildWeeklyInsights(filtered, feePerSession), [filtered, feePerSession]);
  const monthlyInsights = useMemo(() => buildMonthlyInsights(filtered, feePerSession), [filtered, feePerSession]);
  const activePeriodInsights = insightTab === 'daily' ? dailyInsights : insightTab === 'weekly' ? weeklyInsights : monthlyInsights;

  // Transactions
  const { paginatedTx, totalPages, totalFiltered } = useMemo(() => {
    let list = [...filtered];
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      list = list.filter((a) => {
        const name = a.anonymousMode ? (a.anonymousAlias || 'anonymous') : (a.patientName || 'patient');
        return name.toLowerCase().includes(q);
      });
    }
    list.sort((a, b) => {
      const diff = new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
      return txSortDir === 'desc' ? diff : -diff;
    });
    const totalFiltered = list.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / 10));
    const safePage = Math.min(txPage, totalPages - 1);
    const paginatedTx = list.slice(safePage * 10, (safePage + 1) * 10);
    return { paginatedTx, totalPages, totalFiltered };
  }, [filtered, txSearch, txSortDir, txPage]);

  const maxDayIncome = Math.max(...dayOfWeekData.map((d) => d.income), 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Income Analytics</h1>
              <p className="text-sm text-slate-500 mt-1">Track your consultation earnings and performance insights</p>
            </div>
          </div>

          <ActiveSessionCard />

          {/* Time Range Selector */}
          <div className="flex gap-2 mb-6">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => { setTimeRange(r.key); setTxPage(0); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  timeRange === r.key
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : paid.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <BarChart3 className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-lg font-medium text-slate-500">No income data yet</p>
              <p className="text-sm text-slate-400 mt-1">Completed paid consultations will appear here</p>
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <EnhancedStatCard title="Total Earnings" value={formatLKR(kpiStats.totalIncome)} icon={DollarSign} color="emerald" growth={kpiStats.totalGrowth} subtitle={`${kpiStats.totalSessions} sessions`} sparklineData={kpiStats.sparklineData} />
                  <EnhancedStatCard title="This Month" value={formatLKR(kpiStats.thisMonthIncome)} icon={TrendingUp} color="violet" growth={kpiStats.momGrowth} subtitle="vs last month" sparklineData={kpiStats.sparklineData} />
                  <EnhancedStatCard title="Avg Per Session" value={formatLKR(feePerSession)} icon={Users} color="blue" subtitle="consultation fee" />
                  <EnhancedStatCard title="Total Sessions" value={String(kpiStats.totalSessions)} icon={Calendar} color="amber" subtitle={`in ${RANGES.find((r) => r.key === timeRange)?.label?.toLowerCase()}`} />
                </div>
              </motion.div>

              {/* Revenue Trend Chart */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: SECTION_DELAY_STEP }}>
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Revenue Trend</h2>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-600 rounded inline-block" /> Monthly</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 rounded inline-block" /> Cumulative</span>
                    </div>
                  </div>
                  {monthlyData.some((d) => d.income > 0) ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={monthlyData}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#cbd5e1' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <Tooltip content={<CustomRevenueTooltip />} />
                        <Area yAxisId="left" type="monotone" dataKey="income" stroke="#7c3aed" strokeWidth={2.5} fill="url(#revenueGradient)" dot={false} animationDuration={1200} animationEasing="ease-out" />
                        <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} animationDuration={1200} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-16">
                      <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No revenue data in this period</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Income Breakdown — Two Columns */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: SECTION_DELAY_STEP * 2 }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Donut: Consultation Type */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">By Consultation Type</h2>
                    {filtered.length > 0 ? (
                      <>
                        <div className="relative">
                          <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                              <Pie data={consultationBreakdown} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="income" nameKey="type" paddingAngle={4} animationDuration={800}>
                                {consultationBreakdown.map((_, i) => (
                                  <Cell key={i} fill={i === 0 ? CHART_COLORS.violet : CHART_COLORS.blue} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomPieTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              <p className="text-xs text-slate-400">Total</p>
                              <p className="text-lg font-bold text-slate-900">{formatLKR(filtered.length * feePerSession)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-center gap-6 mt-2">
                          {consultationBreakdown.map((item, i) => (
                            <div key={item.type} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-violet-600' : 'bg-blue-500'}`} />
                              <div>
                                <p className="text-sm font-medium text-slate-700 capitalize">{item.type}</p>
                                <p className="text-xs text-slate-400">{item.count} sessions ({item.pct}%)</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-16">
                        <Video className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No data available</p>
                      </div>
                    )}
                  </div>

                  {/* Horizontal Bar: Day of Week */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Revenue by Day</h2>
                    {dayOfWeekData.some((d) => d.income > 0) ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={dayOfWeekData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                          <YAxis type="category" dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip content={<CustomDayTooltip />} />
                          <Bar dataKey="income" radius={[0, 6, 6, 0]} animationDuration={800}>
                            {dayOfWeekData.map((entry, i) => (
                              <Cell key={i} fill={entry.income === maxDayIncome && entry.income > 0 ? CHART_COLORS.emerald : '#e2e8f0'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-16">
                        <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Performance Insights (general) */}
              {insights.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: SECTION_DELAY_STEP * 3 }}>
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Performance Insights</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {insights.map((insight, i) => {
                        const ic = ICON_COLOR_MAP[insight.color];
                        return (
                          <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-4 flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ic.bg} ${ic.text}`}>
                              <insight.icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{insight.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{insight.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Daily / Weekly / Monthly Period Analysis */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: SECTION_DELAY_STEP * 3.5 }}>
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-900">Period Analysis</h2>
                    <div className="flex bg-slate-100 rounded-xl p-1">
                      {INSIGHT_TABS.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setInsightTab(tab.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            insightTab === tab.key
                              ? 'bg-white text-violet-700 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <tab.icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activePeriodInsights.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activePeriodInsights.map((metric, i) => {
                        const ic = ICON_COLOR_MAP[metric.color];
                        return (
                          <div key={`${insightTab}-${i}`} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ic.bg} ${ic.text}`}>
                                <metric.icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{metric.label}</span>
                              {metric.trend && metric.trend !== 'neutral' && (
                                <span className={`ml-auto ${metric.trend === 'up' ? 'text-emerald-500' : 'text-red-400'}`}>
                                  {metric.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                </span>
                              )}
                            </div>
                            <p className="text-xl font-bold text-slate-900">{metric.value}</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{metric.detail}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Not enough data for {insightTab} analysis yet</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Transaction Table */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: SECTION_DELAY_STEP * 5 }}>
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Transactions</h2>
                    <span className="text-xs text-slate-400">{totalFiltered} transactions</span>
                  </div>

                  {/* Search + Sort */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by patient name..."
                        value={txSearch}
                        onChange={(e) => { setTxSearch(e.target.value); setTxPage(0); }}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
                      />
                    </div>
                    <select
                      value={txSortDir}
                      onChange={(e) => { setTxSortDir(e.target.value as 'desc' | 'asc'); setTxPage(0); }}
                      className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none cursor-pointer"
                    >
                      <option value="desc">Newest first</option>
                      <option value="asc">Oldest first</option>
                    </select>
                  </div>

                  {/* Transaction List */}
                  {paginatedTx.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {paginatedTx.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {apt.anonymousMode ? apt.anonymousAlias : (apt.patientName || 'Patient')}
                              </p>
                              <p className="text-xs text-slate-400">
                                {(() => { const d = safeParse(apt.scheduledAt); return d ? format(d, "MMM d, yyyy 'at' h:mm a") : apt.scheduledAt; })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1 ${
                              apt.consultationType === 'video' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {apt.consultationType === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                              {apt.consultationType}
                            </span>
                            <span className="text-sm font-bold text-emerald-600 min-w-[100px] text-right">
                              +{formatLKR(feePerSession)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">
                        {txSearch.trim() ? `No transactions matching "${txSearch}"` : 'No transactions in this period'}
                      </p>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalFiltered > 10 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
                      <p className="text-xs text-slate-400">
                        Showing {txPage * 10 + 1}&ndash;{Math.min((txPage + 1) * 10, totalFiltered)} of {totalFiltered}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setTxPage((p) => p - 1)} disabled={txPage === 0} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-600 transition-colors">
                          Previous
                        </button>
                        <button onClick={() => setTxPage((p) => p + 1)} disabled={txPage >= totalPages - 1} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-600 transition-colors">
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
