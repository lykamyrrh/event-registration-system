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
    if (resendSeconds <= 0) {
      return;
    }

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
  //
  // App.tsx remains responsible for the final admin_users
  // authorization check.
  //
  // This only detects whether Supabase has established a session
  // after the administrator follows the Magic Link.
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const client = getSupabaseClient();

    if (!client) {
      return;
    }

    let mounted = true;

    const checkExistingSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError
        } = await client.auth.getSession();

        if (!mounted) {
          return;
        }

        if (sessionError) {
          console.error(
            'Supabase session check failed:',
            sessionError
          );

          return;
        }

        if (session?.user) {
          onAuthenticated();
        }
      } catch (sessionCheckError) {
        console.error(
          'Unable to check Supabase session:',
          sessionCheckError
        );
      }
    };

    void checkExistingSession();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        if (session?.user) {
          onAuthenticated();
        }
      }
    );

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
    // Magic Link returns to the application root.
    //
    // App.tsx then:
    // 1. detects the Supabase session
    // 2. checks admin_users
    // 3. checks is_active
    // 4. grants or rejects administrator access

    return `${window.location.origin}/`;
  };

  // ─────────────────────────────────────────────────────────────
  // Send Magic Link
  // ─────────────────────────────────────────────────────────────

  const sendMagicLink = async () => {
    clearFeedback();

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError(
        'Enter your authorized administrator email address.'
      );

      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setError(
        'Unable to connect to the authentication service.'
      );

      return;
    }

    setIsSending(true);

    try {
      const { error: signInError } =
        await client.auth.signInWithOtp({
          email: normalizedEmail,

          options: {
            // IMPORTANT:
            //
            // Do not automatically create Supabase Auth accounts
            // for random email addresses entered into this form.
            shouldCreateUser: false,

            // After clicking the Magic Link, return to this app.
            emailRedirectTo: getRedirectUrl()
          }
        });

      if (signInError) {
        throw signInError;
      }

      setEmail(normalizedEmail);
      setStep('sent');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);

      setMessage(
        'A secure sign-in link has been sent to your email.'
      );
    } catch (err: any) {
      console.error(
        'Magic Link request failed:',
        err
      );

      const errorMessage =
        typeof err?.message === 'string'
          ? err.message
          : '';

      if (
        errorMessage
          .toLowerCase()
          .includes('rate limit')
      ) {
        setError(
          'Too many sign-in requests were made. Please wait before requesting another link.'
        );
      } else {
        setError(
          errorMessage ||
            'Unable to send the secure sign-in link. Please try again.'
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Resend Magic Link
  // ─────────────────────────────────────────────────────────────

  const resendMagicLink = async () => {
    if (resendSeconds > 0 || isSending) {
      return;
    }

    await sendMagicLink();
  };

  // ─────────────────────────────────────────────────────────────
  // Change email
  // ─────────────────────────────────────────────────────────────

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
    <div className="min-h-screen bg-[#070d19] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Branding */}

        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gold-500 flex items-center justify-center shadow-xl mb-5">
            <ShieldCheck className="w-8 h-8 text-navy-950" />
          </div>

          <h1 className="text-3xl font-display font-bold text-white">
            MYRRH Registry
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Secure Authorized Access
          </p>
        </div>

        {/* Login Card */}

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          <div className="p-7 sm:p-8">

            {/* ==================================================
                EMAIL STEP
            ================================================== */}

            {step === 'email' && (
              <>
                <div className="mb-7">
                  <div className="flex items-center gap-2 mb-2">
                    <LockKeyhole className="w-5 h-5 text-navy-900" />

                    <h2 className="text-xl font-bold text-navy-900">
                      Administrator Sign In
                    </h2>
                  </div>

                  <p className="text-sm text-navy-900/60 leading-relaxed">
                    Enter your authorized administrator email.
                    We&apos;ll send you a secure sign-in link.
                  </p>
                </div>

                <label
                  htmlFor="admin-email"
                  className="block mb-2 text-xs font-bold uppercase tracking-wider text-navy-900/70"
                >
                  Authorized Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-900/40" />

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
                      if (
                        event.key === 'Enter' &&
                        !isSending
                      ) {
                        void sendMagicLink();
                      }
                    }}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-navy-200 bg-ivory text-navy-900 outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 disabled:opacity-60"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void sendMagicLink()
                  }
                  disabled={
                    isSending ||
                    !email.trim()
                  }
                  className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-navy-900 hover:bg-navy-950 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold transition"
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

                  <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>

                  <h2 className="text-xl font-bold text-navy-900">
                    Check Your Email
                  </h2>

                  <p className="mt-3 text-sm text-navy-900/60 leading-relaxed">
                    We sent a secure sign-in link to:
                  </p>

                  <p className="mt-2 text-sm font-bold text-navy-900 break-all">
                    {email}
                  </p>

                  <div className="mt-6 p-4 rounded-xl border border-navy-200 bg-ivory text-left">

                    <div className="flex items-start gap-3">

                      <Mail className="w-5 h-5 mt-0.5 text-gold-600 shrink-0" />

                      <div>
                        <p className="text-sm font-bold text-navy-900">
                          Open your email
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-navy-900/60">
                          Click the secure sign-in link in the
                          email from Supabase to continue to
                          MYRRH Registry.
                        </p>
                      </div>

                    </div>

                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-navy-900/50">
                    For your security, only authorized and active
                    MYRRH Registry administrators can access the
                    dashboard.
                  </p>

                </div>

                {/* Resend */}

                <button
                  type="button"
                  onClick={() =>
                    void resendMagicLink()
                  }
                  disabled={
                    resendSeconds > 0 ||
                    isSending
                  }
                  className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-navy-900 hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />

                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />

                      {resendSeconds > 0
                        ? `Resend Link in ${resendSeconds}s`
                        : 'Resend Sign-In Link'}
                    </>
                  )}
                </button>

                {/* Change Email */}

                <button
                  type="button"
                  onClick={changeEmail}
                  disabled={isSending}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-navy-900/60 hover:text-navy-900 transition disabled:opacity-50"
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
              <div className="mt-5 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* ==================================================
                SUCCESS MESSAGE
            ================================================== */}

            {message && !error && (
              <div className="mt-5 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
                {message}
              </div>
            )}

          </div>

          {/* Security Footer */}

          <div className="px-7 sm:px-8 py-4 bg-ivory border-t border-navy-200">

            <div className="flex items-start gap-2">

              <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />

              <p className="text-[11px] leading-relaxed text-navy-900/60">
                Protected administrator area. Authentication is
                handled securely through Supabase. Access is
                limited to authorized MYRRH Registry
                administrators.
              </p>

            </div>

          </div>

        </div>

        {/* Additional Security Notice */}

        <div className="mt-5 text-center">

          <p className="text-[11px] leading-relaxed text-slate-500">
            Never forward your administrator sign-in link to
            another person.
          </p>

        </div>

      </div>
    </div>
  );
};

export default LoginPage;