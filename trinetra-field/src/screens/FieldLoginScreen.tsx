import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, HardHat, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Globe } from 'lucide-react';
import { TouchButton } from '../components/TouchButton';
import { SupportedLanguage } from '../i18n/translations';

export const FieldLoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid email or password. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Trinetra@2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#080A09] text-slate-100 flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Header & Language Bar */}
      <header className="flex items-center justify-between w-full max-w-md mx-auto pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <HardHat className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-100 font-mono tracking-wider">TRINETRA FIELD</h1>
            <p className="text-[10px] text-amber-400 font-medium">v1.0.0 • STANDALONE</p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
          {(['en', 'hi', 'te'] as SupportedLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                language === lang
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6 space-y-6">
        {/* Branding Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Field Intelligence & Governance</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight font-sans">
            TRINETRA FIELD
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto font-sans leading-relaxed">
            Observe. Verify. Record. Act.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-400 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email / Username</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. inspector.dgms@trinetra.gov.in"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans transition-all"
            />
          </div>

          <TouchButton
            variant="primary"
            fullWidth
            size="lg"
            type="submit"
            disabled={isLoading}
            icon={!isLoading && <ArrowRight className="w-4 h-4" />}
          >
            {isLoading ? 'AUTHENTICATING FIELD OFFICER...' : 'SIGN IN TO FIELD APP'}
          </TouchButton>
        </form>

        {/* Demo Fast-Fill Personas */}
        <div className="space-y-2.5 pt-2">
          <p className="text-[11px] text-slate-500 text-center font-mono uppercase tracking-wider">
            Quick Persona Selector (Evaluation Mode)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('inspector.dgms@trinetra.gov.in')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300 flex items-center justify-between">
                <span>Field Inspector</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">DGMS</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">inspector.dgms@...</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager.mine1@trinetra.gov.in')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300 flex items-center justify-between">
                <span>Mine Manager</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">MGR</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">manager.mine1@...</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('safety.mine1@trinetra.gov.in')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300 flex items-center justify-between">
                <span>Safety Officer</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">SAFETY</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">safety.mine1@...</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@trinetra.gov.in')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300 flex items-center justify-between">
                <span>System Admin</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">ADMIN</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">admin@trinetra.gov.in</p>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Security Badge */}
      <footer className="w-full max-w-md mx-auto text-center py-2 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>SHA-256 Hash-Linked Audit Security • CMR 2017 Compliant</span>
        </div>
        <p className="text-[9px] text-slate-600">
          Smart Colliery Governance Operating System • Government of India
        </p>
      </footer>
    </div>
  );
};
