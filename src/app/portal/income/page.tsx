'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Calendar, ArrowUpRight } from 'lucide-react';
import { format, parseISO, startOfMonth, isSameMonth } from 'date-fns';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import StatCard from '@/components/portal/StatCard';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppointments } from '@/lib/hooks/useAppointments';

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

  const { totalIncome, thisMonthIncome, lastMonthIncome, chartData, recentPaid } = useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const totalIncome = paid.length * feePerSession;

    const thisMonthPaid = paid.filter((a) => {
      try {
        return isSameMonth(parseISO(a.scheduledAt), now);
      } catch {
        return false;
      }
    });

    const lastMonthPaid = paid.filter((a) => {
      try {
        return isSameMonth(parseISO(a.scheduledAt), lastMonth);
      } catch {
        return false;
      }
    });

    const thisMonthIncome = thisMonthPaid.length * feePerSession;
    const lastMonthIncome = lastMonthPaid.length * feePerSession;

    // Build monthly chart data (last 6 months)
    const monthlyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, 'MMM yyyy');
      monthlyMap[key] = 0;
    }

    paid.forEach((a) => {
      try {
        const d = parseISO(a.scheduledAt);
        const key = format(d, 'MMM yyyy');
        if (key in monthlyMap) {
          monthlyMap[key] += feePerSession;
        }
      } catch {
        // skip invalid dates
      }
    });

    const chartData = Object.entries(monthlyMap).map(([month, income]) => ({
      month,
      income,
    }));

    const recentPaid = [...paid]
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .slice(0, 10);

    return { totalIncome, thisMonthIncome, lastMonthIncome, chartData, recentPaid };
  }, [paid, feePerSession]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar />
      <main className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Income Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your consultation earnings
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard
                  title="Total Earnings"
                  value={`LKR ${totalIncome.toLocaleString()}`}
                  subtitle={`${paid.length} paid sessions`}
                  icon={DollarSign}
                  color="emerald"
                />
                <StatCard
                  title="This Month"
                  value={`LKR ${thisMonthIncome.toLocaleString()}`}
                  icon={TrendingUp}
                  color="violet"
                />
                <StatCard
                  title="Last Month"
                  value={`LKR ${lastMonthIncome.toLocaleString()}`}
                  icon={Calendar}
                  color="blue"
                />
              </div>

              {/* Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Monthly Revenue</h2>
                {chartData.some((d) => d.income > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        formatter={(value) => [`LKR ${Number(value).toLocaleString()}`, 'Income']}
                      />
                      <Bar dataKey="income" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16">
                    <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No income data yet</p>
                  </div>
                )}
              </div>

              {/* Recent Transactions */}
              {recentPaid.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Transactions</h2>
                  <div className="divide-y divide-slate-100">
                    {recentPaid.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {apt.anonymousMode ? apt.anonymousAlias : 'Patient'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {(() => { try { return format(parseISO(apt.scheduledAt), 'MMM d, yyyy'); } catch { return apt.scheduledAt; } })()}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">
                          +LKR {feePerSession.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
