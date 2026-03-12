'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Stethoscope } from 'lucide-react';

const Navbar = () => {
    const navLinks = [
        { name: 'Crisis', href: '#crisis' },
        { name: 'Features', href: '#features' },
        { name: 'Verdict', href: '#comparison' },
        { name: 'Invest', href: '#invest' },
        { name: 'Team', href: '#team' },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all duration-300">
            <motion.div
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* Brand */}
                <div className="flex-shrink-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">MindAssist</span>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center space-x-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100/50 transition-all duration-200"
                        >
                            {link.name}
                        </a>
                    ))}
                </div>

                {/* For Specialists Button */}
                <div>
                    <Link
                        href="/portal/login"
                        className="relative overflow-hidden bg-slate-900 text-white font-semibold py-2.5 px-6 rounded-full hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-lg shadow-slate-900/20 h-10 flex items-center justify-center gap-2 text-sm"
                    >
                        <Stethoscope className="w-4 h-4" />
                        <span>For Specialists</span>
                    </Link>
                </div>
            </motion.div>
        </nav>
    );
};

export default Navbar;
