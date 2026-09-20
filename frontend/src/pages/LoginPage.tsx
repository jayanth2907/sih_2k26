import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock, Mail, ArrowRight, AlertCircle, Shield, Globe } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('admin@trinetra.gov.in');
  const [password, setPassword] = useState('Trinetra@2026');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Handle prefers-reduced-motion accessibility
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches && videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogins = [
    { role: 'System Admin', email: 'admin@trinetra.gov.in', desc: 'Cross-mine governance' },
    { role: 'Mine 1 Manager (BDS-04)', email: 'manager.mine1@trinetra.gov.in', desc: 'Bharat Deep Shaft 4' },
    { role: 'Mine 1 Safety Officer', email: 'safety.mine1@trinetra.gov.in', desc: 'Safety Compliance BDS-04' },
    { role: 'Mine 2 Manager (SOB-02)', email: 'manager.mine2@trinetra.gov.in', desc: 'Singrauli OpenCast' },
    { role: 'Field Inspector (DGMS)', email: 'inspector.dgms@trinetra.gov.in', desc: 'Statutory Inspections' },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#080A09] text-slate-100 overflow-x-hidden select-none">
      {/* 1. IMMERSIVE MINING VIDEO BACKGROUND (Visible & Cinematic) */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center"
        >
          <source src="/videos/trinetra-login-background.mp4" type="video/mp4" />
        </video>

        {/* Cinematic Multi-Zone Gradient Overlays (Light & Balanced) */}
        {/* Top & Bottom Vignette (~20-30%) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080A09]/35 via-transparent to-[#080A09]/45 pointer-events-none" />
        {/* Center Card Soft Ambient Shadow (~20-25%) */}
        <div className="absolute inset-0 bg-radial from-[#080A09]/35 via-[#080A09]/15 to-transparent pointer-events-none" />
      </div>

      {/* 2. TOP COMMAND HUD BAR */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-4 flex items-center justify-between border-b border-[#232A26]/40 bg-[#080A09]/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SYSTEM OPERATIONAL</span>
          </div>
          <span className="hidden md:inline-block text-[11px] font-mono text-slate-400 border-l border-[#232A26] pl-3">
            SECURE GOVERNANCE GATEWAY // TRINETRA v2.6
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-[#0D100F]/90 border border-[#232A26] rounded-lg p-1 text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                language === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                language === 'hi' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              हिं
            </button>
            <button
              onClick={() => setLanguage('te')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                language === 'te' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              తె
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-slate-400 px-2.5 py-1 rounded bg-[#0D100F]/80 border border-[#232A26]">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>DGMS COMPLIANT</span>
          </div>
        </div>
      </header>

      {/* 3. CENTRAL LOGIN COMMAND CARD */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-[0_0_25px_rgba(245,158,11,0.35)] mb-3 border border-amber-300/40">
              <span className="font-serif font-black text-slate-950 text-xl tracking-tighter">त्रिन</span>
            </div>

            <div className="flex items-center justify-center gap-2 mb-1 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              <span className="font-serif font-bold text-amber-400 text-lg tracking-wide">त्रिनेत्र</span>
              <span className="text-slate-400">•</span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase font-sans">TRINETRA</h1>
            </div>

            <p className="text-xs text-amber-400/95 font-mono tracking-wider uppercase font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              MINE GOVERNANCE AI
            </p>

            {/* Subtle Core Concept Tagline */}
            <div className="mt-2.5 flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest text-slate-300 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              <span className="text-amber-400 font-semibold">OBSERVE</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-semibold">PREDICT</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-semibold">GOVERN</span>
            </div>
          </div>

          {/* Form Card (Crisp & High Contrast against live video) */}
          <div className="bg-[#060A08]/85 sm:bg-[#060A08]/88 backdrop-blur-xl border border-[#232A26] rounded-2xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/10">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Official Email / Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#080A09]/90 border border-[#232A26] rounded-lg text-slate-100 text-xs focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors font-mono"
                    placeholder="name@trinetra.gov.in"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Security Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#080A09]/90 border border-[#232A26] rounded-lg text-slate-100 text-xs focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors font-mono"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Authenticating...' : 'Sign In to Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="mt-5 pt-5 border-t border-[#1B211E]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center font-mono">
                Quick Role Switch (Demo Credentials)
              </p>
              <div className="space-y-1.5">
                {quickLogins.map((q) => (
                  <button
                    key={q.email}
                    type="button"
                    onClick={() => {
                      setEmail(q.email);
                      setPassword('Trinetra@2026');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg bg-[#080A09]/80 hover:bg-[#171B18] border border-[#1B211E] hover:border-amber-500/40 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                        {q.role}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">{q.desc}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono px-2 py-0.5 rounded bg-[#0D100F] border border-[#232A26] group-hover:border-amber-500/30 group-hover:text-amber-400 transition-colors">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM FOOTER HUD */}
      <footer className="relative z-10 w-full px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#232A26]/40 bg-[#080A09]/40 backdrop-blur-md text-[10px] font-mono text-slate-400">
        <div>
          <span>MINISTRY OF MINES & COAL • GOVT OF INDIA</span>
        </div>
        <div className="flex items-center gap-4">
          <span>AES-256 ENCRYPTED</span>
          <span>•</span>
          <span>AI MONITORING ACTIVE</span>
        </div>
      </footer>
    </div>
  );
};
