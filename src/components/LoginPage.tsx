import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

import { getSupabaseClient } from '../lib/supabase';

interface LoginPageProps {
  onAuthenticated: () => void;
}

type LoginStep = 'email' | 'sent';

const RESEND_COOLDOWN_SECONDS = 60;

const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const LoginPage: React.FC<LoginPageProps> = ({
  onAuthenticated
}) => {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  // ─────────────────────────────────────────────────────────────
  // Resend countdown
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds(current =>
        current <= 1 ? 0 : current - 1
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendSeconds]);

  // ─────────────────────────────────────────────────────────────
  // Existing session detection
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let mounted = true;

    const checkExistingSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (!mounted) return;

        if (sessionError) {
          console.error('Supabase session check failed:', sessionError);
          return;
        }

        if (session?.user) {
          onAuthenticated();
        }
      } catch (sessionCheckError) {
        console.error('Unable to check Supabase session:', sessionCheckError);
      }
    };

    void checkExistingSession();

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        onAuthenticated();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [onAuthenticated]);

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  const clearFeedback = () => {
    setError('');
    setMessage('');
  };

  const getRedirectUrl = (): string => {
    return `${window.location.origin}/`;
  };

  // ─────────────────────────────────────────────────────────────
  // Send Magic Link
  // ─────────────────────────────────────────────────────────────

  const sendMagicLink = async () => {
    clearFeedback();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError('Enter your authorized administrator email address.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setError('Unable to connect to the authentication service.');
      return;
    }

    setIsSending(true);

    try {
      const { error: signInError } = await client.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getRedirectUrl()
        }
      });

      if (signInError) throw signInError;

      setEmail(normalizedEmail);
      setStep('sent');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setMessage('A secure sign-in link has been sent to your email.');
    } catch (err: any) {
      console.error('Magic Link request failed:', err);
      const errorMessage = typeof err?.message === 'string' ? err.message : '';

      if (errorMessage.toLowerCase().includes('rate limit')) {
        setError('Too many sign-in requests were made. Please wait before requesting another link.');
      } else {
        setError(errorMessage || 'Unable to send the secure sign-in link. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const resendMagicLink = async () => {
    if (resendSeconds > 0 || isSending) return;
    await sendMagicLink();
  };

  const changeEmail = () => {
    setStep('email');
    setMessage('');
    setError('');
    setResendSeconds(0);
  };

  // ─────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10 font-sans animate-fadeIn">
      <div className="w-full max-w-md">
        
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-5">
            <ShieldCheck className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white">
            MYRRH Registry
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Secure Authorized Access
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-7 sm:p-8">
            
            {/* ==================================================
                EMAIL STEP
            ================================================== */}
            {step === 'email' && (
              <>
                <div className="mb-7">
                  <div className="flex items-center gap-2 mb-2">
                    <LockKeyhole className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-bold text-white">
                      Administrator Sign In
                    </h2>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Enter your authorized administrator email. We'll send you a secure sign-in link.
                  </p>
                </div>

                <label htmlFor="admin-email" className="block mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Authorized Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    autoFocus
                    disabled={isSending}
                    placeholder="administrator@gmail.com"
                    onChange={event => {
                      setEmail(event.target.value);
                      setError('');
                      setMessage('');
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !isSending) void sendMagicLink();
                    }}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 disabled:opacity-60"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void sendMagicLink()}
                  disabled={isSending || !email.trim()}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold transition"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Secure Link...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Secure Sign-In Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            {/* ==================================================
                MAGIC LINK SENT STEP
            ================================================== */}
            {step === 'sent' && (
              <>
                <div className="text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-7 h-7 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Check Your Email
                  </h2>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                    We sent a secure sign-in link to:
                  </p>
                  <p className="mt-2 text-sm font-bold text-amber-400 break-all">
                    {email}
                  </p>

                  <div className="mt-6 p-4 rounded-xl border border-slate-700 bg-slate-950 text-left">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 mt-0.5 text-gold-300 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-white">
                          Open your email
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          Click the secure sign-in link in the email from Supabase to continue to MYRRH Registry.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    For your security, only authorized and active MYRRH Registry administrators can access the dashboard.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void resendMagicLink()}
                  disabled={resendSeconds > 0 || isSending}
                  className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition border border-slate-700"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      {resendSeconds > 0 ? `Resend Link in ${resendSeconds}s` : 'Resend Sign-In Link'}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={changeEmail}
                  disabled={isSending}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-400 hover:text-white transition disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Use a Different Email
                </button>
              </>
            )}

            {/* ==================================================
                ERROR
            ================================================== */}
            {error && (
              <div className="mt-5 p-3.5 rounded-xl border border-red-900/50 bg-red-950/30 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* ==================================================
                SUCCESS MESSAGE
            ================================================== */}
            {message && !error && (
              <div className="mt-5 p-3.5 rounded-xl border border-amber-900/50 bg-amber-950/30 text-sm text-amber-400">
                {message}
              </div>
            )}

          </div>

          {/* Security Footer */}
          <div className="px-7 sm:px-8 py-4 bg-slate-950 border-t border-slate-800">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
              <p className="text-[11px] leading-relaxed text-slate-500">
                Protected administrator area. Authentication is handled securely. Access is limited to authorized MYRRH Registry administrators.
              </p>
            </div>
          </div>

        </div>

        {/* Additional Security Notice */}
        <div className="mt-5 text-center">
          <p className="text-[11px] leading-relaxed text-slate-500">
            Never forward your administrator sign-in link to another person.
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;