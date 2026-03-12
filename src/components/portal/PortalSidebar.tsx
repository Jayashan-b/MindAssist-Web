'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarClock,
  ClipboardList,
  TrendingUp,
  UserCircle,
  LogOut,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { signOut } from '@/lib/auth';

const navItems = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/slots', label: 'Manage Slots', icon: CalendarClock },
  { href: '/portal/appointments', label: 'Appointments', icon: ClipboardList },
  { href: '/portal/income', label: 'Income', icon: TrendingUp },
  { href: '/portal/profile', label: 'Profile', icon: UserCircle },
];

export default function PortalSidebar() {
  const pathname = usePathname();
  const { specialist } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/portal/login';
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen sticky top-0">
      {/* Brand */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight">MindAssist</p>
            <p className="text-xs text-slate-400">Specialist Portal</p>
          </div>
        </div>
      </div>

      {/* Specialist Info */}
      {specialist && (
        <div className="px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            {specialist.photoUrl ? (
              <img
                src={specialist.photoUrl}
                alt={specialist.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-600"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-sm">
                {specialist.name.charAt(0)}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{specialist.name}</p>
              <p className="text-xs text-slate-400 truncate">{specialist.specialty}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-600/20 text-violet-300 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-slate-700/50">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
