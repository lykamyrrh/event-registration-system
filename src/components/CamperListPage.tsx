import React, { useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  GraduationCap,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Users,
  XCircle
} from 'lucide-react';

interface Camper {
  fullName: string;
  badgeName: string;
  age: string;
  gradeLevel: string;
  gender: string;
}

interface DelegationRecord {
  id: string;
  submittedAt: string;
  delegationHead: string;
  registrationType: string;
  campers: Camper[];
}

interface CamperListPageProps {
  eventId: string;
  onBack: () => void;
}

const CHURCH_CODE_RE = /^CH-[A-Z0-9]{6}$/;

const GRADE_LABEL: Record<string, string> = {
  elementary: 'Elementary',
  'junior high': 'Junior High',
  'senior high': 'Senior High',
  college: 'College',
  working: 'Working / Professional'
};

const gradeBg = (level: string) => {
  switch (level) {
    case 'elementary':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'junior high':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'senior high':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'college':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

const extractCampers = (rowData: any): Camper[] => {
  if (
    Array.isArray(rowData?.campers_joined) &&
    rowData.campers_joined.length > 0
  ) {
    return rowData.campers_joined
      .slice()
      .sort(
        (a: any, b: any) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0)
      )
      .map((c: any) => ({
        fullName: c.full_name || '',
        badgeName: c.badge_name || '',
        age: c.age != null ? String(c.age) : '',
        gradeLevel: c.grade_level || 'junior high',
        gender: c.gender || 'male'
      }));
  }

  const data = rowData?.data || {};

  if (Array.isArray(data.campers) && data.campers.length > 0) {
    return data.campers.map((c: any) => ({
      fullName: c.fullName || c.full_name || '',
      badgeName: c.badgeName || c.badge_name || '',
      age: c.age != null ? String(c.age) : '',
      gradeLevel:
        c.gradeLevel ||
        c.grade_level ||
        'junior high',
      gender: c.gender || 'male'
    }));
  }

  const name =
    data.f_camper_full_name ||
    data.f_name ||
    data.f_fullname ||
    '';

  if (name) {
    return [
      {
        fullName: String(name),
        badgeName: String(
          data.f_preferred_badge_name || '—'
        ),
        age: String(
          data.f_dob_age ||
          data.f_age ||
          '—'
        ),
        gradeLevel: String(
          data.f_academic_level ||
          'General'
        ),
        gender: String(data.f_gender || '—')
      }
    ];
  }

  return [];
};

export const CamperListPage: React.FC<CamperListPageProps> = ({
  eventId,
  onBack
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [churchName, setChurchName] = useState('');
  const [delegations, setDelegations] = useState<DelegationRecord[]>([]);

  const handleCodeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const normalized = event.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .slice(0, 9);

    setCodeInput(normalized);

    if (error) {
      setError('');
    }
  };

  const handleVerify = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const normalizedCode = codeInput
      .trim()
      .toUpperCase();

    setError('');
    setDelegations([]);
    setVerifiedCode('');
    setChurchName('');

    if (!CHURCH_CODE_RE.test(normalizedCode)) {
      setError(
        'Enter a valid Church Registration Code in the format CH-XXXXXX.'
      );
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setError(
        'The registration database is not available right now. Please try again later.'
      );
      return;
    }

    setLoading(true);

    try {
      // Supabase/PostgREST query-builder filters are sent as structured
      // parameters. We do not construct SQL from the visitor's input.
      const [
        { data: eventRow, error: eventError },
        { data: rows, error: fetchError }
      ] = await Promise.all([
        client
          .from('events')
          .select('title')
          .eq('id', eventId)
          .maybeSingle(),

        client
          .from('registrations')
          .select(`
            id,
            submitted_at,
            data,
            campers (
              id,
              full_name,
              badge_name,
              age,
              grade_level,
              gender,
              sort_order
            )
          `)
          .eq('event_id', eventId)
          .eq(
            'data->>church_registration_code',
            normalizedCode
          )
          .order('submitted_at', {
            ascending: true
          })
      ]);

      if (eventError) {
        console.error(
          'Event lookup error:',
          eventError
        );
      }

      if (fetchError) {
        console.error(
          'Camper list lookup error:',
          fetchError
        );

        setError(
          'We could not verify the Church Registration Code. Please try again.'
        );
        return;
      }

      // Deliberately use the same response for invalid code and no matching
      // registration so the page does not reveal whether a church exists.
      if (!rows || rows.length === 0) {
        setError(
          'The Church Registration Code could not be verified for this event.'
        );
        return;
      }

      const firstData = rows[0]?.data as any;

      const mapped: DelegationRecord[] = rows.map(
        (row: any) => {
          const data = row.data || {};
          const withJoined = {
            ...row,
            campers_joined: row.campers
          };

          return {
            id: row.id,
            submittedAt: row.submitted_at,
            delegationHead:
              data.f_delegation_fullname ||
              data.f_delegation_head_name ||
              data.f_name ||
              '—',
            registrationType:
              data.registration_type ||
              'church',
            campers: extractCampers(withJoined)
          };
        }
      );

      setEventTitle(
        eventRow?.title ||
        'AYOS Youth Camp 2026'
      );
      setChurchName(
        firstData?.f_church_name ||
        ''
      );
      setDelegations(mapped);
      setVerifiedCode(normalizedCode);

      // Remove the typed secret from the input once verification succeeds.
      setCodeInput('');
    } catch (err) {
      console.error(
        'Camper list verification error:',
        err
      );

      setError(
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLockList = () => {
    setVerifiedCode('');
    setDelegations([]);
    setChurchName('');
    setCodeInput('');
    setError('');
  };

  const totalCampers = delegations.reduce(
    (sum, delegation) =>
      sum + delegation.campers.length,
    0
  );

  let globalIndex = 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 font-sans animate-fadeIn">
      <div className="max-w-3xl mx-auto space-y-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Registration Page
        </button>

        {!verifiedCode ? (
          <div className="max-w-xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-950/15">
                  <LockKeyhole className="w-6 h-6 text-slate-950" />
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-900/70 uppercase tracking-[0.2em]">
                    Protected Camper List
                  </p>

                  <h1 className="text-xl font-black text-slate-950">
                    Submitted Campers
                  </h1>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleVerify}
              className="p-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="church-code"
                  className="block text-xs font-bold text-slate-300 mb-2"
                >
                  Church Registration Code
                </label>

                <input
                  id="church-code"
                  type="text"
                  value={codeInput}
                  onChange={handleCodeChange}
                  placeholder="CH-XXXXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={9}
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 font-mono text-sm tracking-widest text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />

                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Enter the code provided after your church registration.
                  The code is not included in this page's URL.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-red-950/40 border border-red-700/40 p-3"
                >
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 px-4 py-3 text-sm font-black transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    View Submitted Campers
                  </>
                )}
              </button>

              <div className="flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <p>
                  Camper information is shown only after the code matches a registration for this event.
                </p>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-900/70 uppercase tracking-[0.2em]">
                  Registered Camper List
                </p>

                <h1 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight mt-0.5">
                  {eventTitle}
                </h1>

                {churchName && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Building2 className="w-4 h-4 text-slate-900/70" />
                    <span className="text-sm font-bold text-slate-900/80">
                      {churchName}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleLockList}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-950/15 hover:bg-slate-950/25 px-3 py-2 text-xs font-black text-slate-950 transition"
              >
                <LockKeyhole className="w-3.5 h-3.5" />
                Lock List
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                <p className="text-[11px] text-slate-400">
                  Total Campers
                </p>
                <p className="text-xl font-black text-amber-400">
                  {totalCampers}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                <p className="text-[11px] text-slate-400">
                  Delegations
                </p>
                <p className="text-xl font-black text-emerald-400">
                  {delegations.length}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 col-span-2 sm:col-span-1">
                <p className="text-[11px] text-slate-400">
                  Status
                </p>
                <p className="text-xs font-black text-violet-300 uppercase tracking-wider mt-1">
                  Pre-Registered
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-3 px-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm font-bold text-emerald-300">
                ✓ The following campers are registered for{' '}
                <span className="text-emerald-200">
                  {eventTitle}
                </span>
              </p>
            </div>

            <div className="space-y-6">
              {delegations.map(
                (delegation, delegationIndex) => (
                  <div
                    key={delegation.id}
                    className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-b border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          Delegation #{delegationIndex + 1}
                        </span>

                        <span className="text-xs text-slate-400">
                          {delegation.delegationHead}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-500">
                        {formatDate(
                          delegation.submittedAt
                        )}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-xs">
                        <thead>
                          <tr className="bg-slate-950/50 text-[9px] uppercase tracking-wider text-slate-500">
                            <th className="px-4 py-3 text-left">
                              #
                            </th>
                            <th className="px-4 py-3 text-left">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left">
                              Badge
                            </th>
                            <th className="px-4 py-3 text-center">
                              Age
                            </th>
                            <th className="px-4 py-3 text-left">
                              Level
                            </th>
                            <th className="px-4 py-3 text-center">
                              Sex
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800">
                          {delegation.campers.map(
                            (camper, camperIndex) => {
                              globalIndex += 1;

                              return (
                                <tr
                                  key={`${delegation.id}-${camperIndex}`}
                                  className="hover:bg-slate-800/40"
                                >
                                  <td className="px-4 py-3 text-slate-500 font-mono">
                                    {globalIndex}
                                  </td>

                                  <td className="px-4 py-3 font-semibold text-slate-100">
                                    {camper.fullName || '—'}
                                  </td>

                                  <td className="px-4 py-3 text-slate-400">
                                    {camper.badgeName || '—'}
                                  </td>

                                  <td className="px-4 py-3 text-center text-slate-400">
                                    {camper.age || '—'}
                                  </td>

                                  <td className="px-4 py-3">
                                    <span
                                      className={`text-[9px] font-bold px-2 py-1 rounded border ${
                                        gradeBg(
                                          camper.gradeLevel
                                        )
                                      }`}
                                    >
                                      {GRADE_LABEL[
                                        camper.gradeLevel
                                      ] ??
                                        camper.gradeLevel}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    {camper.gender === 'male'
                                      ? 'M'
                                      : camper.gender === 'female'
                                        ? 'F'
                                        : camper.gender}
                                  </td>
                                </tr>
                              );
                            }
                          )}

                          {delegation.campers.length ===
                            0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-6 text-center text-slate-500 italic"
                              >
                                No camper records found in this delegation.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-center">
              <GraduationCap className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-[11px] text-slate-500">
                Keep your Church Registration Code private.
                Use “Lock List” when you are finished viewing camper information.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CamperListPage;
