import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RotateCw,
  Coins,
  Sparkles,
} from 'lucide-react';
import { getSupabase } from '../lib/supabase';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

type ScreenView = 'AUTH_CHOICE' | 'VERIFICATION';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [view, setView] = useState<ScreenView>('AUTH_CHOICE');
  const [authTab, setAuthTab] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);

  // UI state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Countdown timer for Resend Code button
  const [resendTimer, setResendTimer] = useState(0);

  // Ref to track last auto-pasted code so we don't re-trigger repeatedly
  const lastAutoPastedCodeRef = React.useRef<string>('');

  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Direct verification trigger
  const verifyCodeDirectly = async (token: string) => {
    if (token.length < 6 || loading) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: authTab === 'SIGNUP' ? 'signup' : 'email',
      });

      if (error) throw error;

      // Verification successful -> proceed directly to Dashboard
      onAuthenticated();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid or expired 6-digit code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check clipboard for 6-digit verification code on focus or visibility change
  const checkAndPasteClipboard = async () => {
    if (view !== 'VERIFICATION' || loading) return;

    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) return;
      const text = await navigator.clipboard.readText();
      if (!text) return;

      // Extract numeric digits
      const digits = text.trim().replace(/\D/g, '');
      if (digits.length === 6 && digits !== lastAutoPastedCodeRef.current) {
        lastAutoPastedCodeRef.current = digits;
        setOtpCode(digits.split(''));
        setStatusMessage({
          type: 'success',
          text: `Detected code ${digits} from clipboard! Verifying automatically...`,
        });
        verifyCodeDirectly(digits);
      }
    } catch (e) {
      // Permission denied or API restricted in iframe - fail silently
    }
  };

  // Attach window focus & visibilitychange listeners when on VERIFICATION view
  useEffect(() => {
    if (view !== 'VERIFICATION') return;

    // Check clipboard immediately when verification screen opens
    checkAndPasteClipboard();

    const handleFocus = () => {
      checkAndPasteClipboard();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndPasteClipboard();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [view, email, authTab, loading]);

  // Google OAuth
  const handleGoogleAuth = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Google authentication failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit Login or Sign Up form
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setStatusMessage(null);

    const supabase = getSupabase();

    try {
      if (authTab === 'SIGNUP') {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // On successful sign up request, navigate to Verification Screen
        setStatusMessage({
          type: 'success',
          text: 'Account created! Please enter the 6-digit code sent to your email.',
        });
        setResendTimer(60);
        setView('VERIFICATION');
      } else {
        // Log In Flow
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // Logged in directly -> Navigate to Dashboard
        onAuthenticated();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Authentication failed. Please check your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit 6-digit OTP code verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpCode.join('');
    if (token.length < 6) {
      setStatusMessage({ type: 'error', text: 'Please enter all 6 digits of the code.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: authTab === 'SIGNUP' ? 'signup' : 'email',
      });

      if (error) throw error;

      // Verification successful -> proceed directly to Dashboard
      onAuthenticated();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid or expired 6-digit code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend 6-digit code
  const handleResendCode = async () => {
    if (resendTimer > 0 || !email) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) throw error;

      setStatusMessage({
        type: 'success',
        text: 'A new 6-digit verification code has been sent to your email.',
      });
      setResendTimer(60);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to resend verification code.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    // If multiple digits pasted into a single box via change event
    const cleanDigits = val.replace(/\D/g, '');
    if (cleanDigits.length >= 6) {
      const code6 = cleanDigits.slice(0, 6);
      setOtpCode(code6.split(''));
      lastAutoPastedCodeRef.current = code6;
      verifyCodeDirectly(code6);
      return;
    }

    if (!/^\d*$/.test(val)) return;

    const newCode = [...otpCode];
    newCode[index] = val.slice(-1);
    setOtpCode(newCode);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-verify when all 6 digits are populated
    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      verifyCodeDirectly(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpCode[index] && index > 0) {
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const digits = pastedText.trim().replace(/\D/g, '');
    if (digits.length >= 6) {
      const code6 = digits.slice(0, 6);
      setOtpCode(code6.split(''));
      lastAutoPastedCodeRef.current = code6;

      const lastInput = document.getElementById('otp-input-5');
      lastInput?.focus();

      setStatusMessage({
        type: 'success',
        text: `Pasted code ${code6}! Verifying automatically...`,
      });
      verifyCodeDirectly(code6);
    } else if (digits.length > 0) {
      const newCode = [...otpCode];
      for (let i = 0; i < Math.min(digits.length, 6); i++) {
        newCode[i] = digits[i];
      }
      setOtpCode(newCode);

      const nextIdx = Math.min(digits.length, 5);
      const nextInput = document.getElementById(`otp-input-${nextIdx}`);
      nextInput?.focus();

      if (newCode.join('').length === 6) {
        verifyCodeDirectly(newCode.join(''));
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#07090E] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Glow ambient background elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#0d111c]/90 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Branding Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <img
            src="/icons/tokencare-logo.png"
            alt="TokenCare Logo"
            className="w-16 h-16 rounded-2xl object-cover shadow-xl shadow-emerald-500/30 border border-emerald-500/20"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
            TokenCare <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">PRO</span>
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Secure • Transparent • Web3 Token & Donation Hub
          </p>
        </div>

        {/* STATUS ALERT */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start space-x-2.5 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* VERIFICATION SCREEN */}
        {view === 'VERIFICATION' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-1 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Verify Email</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We sent a 6-digit verification code to{' '}
                <span className="text-emerald-400 font-semibold">{email}</span>. Please enter it below.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-13 bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 rounded-2xl text-center text-xl font-bold text-emerald-400 focus:outline-none transition-all font-mono shadow-inner"
                    />
                  ))}
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={checkAndPasteClipboard}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Paste Code from Clipboard</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setView('AUTH_CHOICE');
                  setStatusMessage(null);
                }}
                className="text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendTimer > 0 || loading}
                className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                  resendTimer > 0
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* MAIN AUTH CHOICE SCREEN (LOG IN / SIGN UP) */
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Log In / Sign Up Toggle */}
            <div className="bg-zinc-950 p-1 rounded-2xl border border-zinc-800 flex text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('LOGIN');
                  setStatusMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                  authTab === 'LOGIN'
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('SIGNUP');
                  setStatusMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                  authTab === 'SIGNUP'
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-zinc-100 text-black font-bold rounded-2xl text-xs flex items-center justify-center space-x-3 transition-all shadow-md cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-zinc-800" />
              <span className="px-3 text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                or email
              </span>
              <div className="flex-1 border-t border-zinc-800" />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authTab === 'LOGIN' ? 'Log In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
