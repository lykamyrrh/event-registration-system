import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  ShieldCheck,
  Users,
  XCircle
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const GRADE_LABEL: Record<string, string> = {
  elementary: 'Elementary',
  'junior high': 'Junior High',
  'senior high': 'Senior High',
  college: 'College',
  working: 'Working / Professional'
};

const gradeBg = (level: string) => {
  switch (level) {
    case 'elementary':      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'junior high':     return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'senior high':     return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'college':         return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:                return 'bg-slate-100 text-slate-700 border-slate-200';
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

// Normalise a raw row from Supabase into a list of Camper objects
const extractCampers = (rowData: any): Camper[] => {
  // Source 1 — joined `campers` table (preferred)
  if (Array.isArray(rowData?.campers_joined) && rowData.campers_joined.length > 0) {
    return rowData.campers_joined
      .slice()
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((c: any) => ({
        fullName: c.full_name || '',
        badgeName: c.badge_name || '',
        age: c.age != null ? String(c.age) : '',
        gradeLevel: c.grade_level || 'junior high',
        gender: c.gender || 'male'
      }));
  }

  // Source 2 — campers array embedded in the data JSONB
  const data = rowData?.data || {};
  if (Array.isArray(data.campers) && data.campers.length > 0) {
    return data.campers.map((c: any) => ({
      fullName: c.fullName || c.full_name || '',
      badgeName: c.badgeName || c.badge_name || '',
      age: c.age != null ? String(c.age) : '',
      gradeLevel: c.gradeLevel || c.grade_level || 'junior high',
      gender: c.gender || 'male'
    }));
  }

  // Source 3 — single-camper fields (legacy)
  const name =
    data.f_camper_full_name ||
    data.f_name ||
    data.f_fullname ||
    '';
  if (name) {
    return [
      {
        fullName: String(name),
        badgeName: String(data.f_preferred_badge_name || '—'),
        age: String(data.f_dob_age || data.f_age || '—'),
        gradeLevel: String(data.f_academic_level || 'General'),
        gender: String(data.f_gender || '—')
      }
    ];
  }

  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface CamperListPageProps {
  eventId: string;
  churchCode: string;
  onBack: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const CamperListPage: React.FC<CamperListPageProps> = ({
  eventId,
  churchCode,
  onBack
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [churchName, setChurchName] = useState('');
  const [delegations, setDelegations] = useState<DelegationRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      const client = getSupabaseClient();
      if (!client) {
        setError('Database not available. Please check your connection settings.');
        setLoading(false);
        return;
      }

      try {
        // ── Fetch the event title ───────────────────────────────────────────
        const { data: eventRow } = await client
          .from('events')
          .select('title')
          .eq('id', eventId)
          .maybeSingle();

        if (eventRow?.title) setEventTitle(eventRow.title);

        // ── Fetch all registrations matching this church code + event ───────
        // We join the campers table inline so we get structured rows.
        const { data: rows, error: fetchErr } = await client
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
          .eq('data->>church_registration_code', churchCode)
          .order('submitted_at', { ascending: true });

        if (fetchErr) {
          console.error('Camper list fetch error:', fetchErr);
          setError('Could not load the camper list. Please try again.');
          setLoading(false);
          return;
        }

        if (!rows || rows.length === 0) {
          setDelegations([]);
          setLoading(false);
          return;
        }

        // Use church name from the first record
        const firstData = rows[0]?.data as any;
        setChurchName(firstData?.f_church_name || '');

        // Map rows → DelegationRecord[]
        const mapped: DelegationRecord[] = rows.map((row: any) => {
          const d = row.data || {};
          // Normalise joined campers under a temporary key
          const withJoined = { ...row, campers_joined: row.campers };
          return {
            id: row.id,
            submittedAt: row.submitted_at,
            delegationHead:
              d.f_delegation_fullname ||
              d.f_delegation_head_name ||
              d.f_name ||
              '—',
            registrationType: d.registration_type || 'church',
            campers: extractCampers(withJoined)
          };
        });

        setDelegations(mapped);
      } catch (err) {
        console.error(err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId, churchCode]);

  const totalCampers = delegations.reduce((sum, d) => sum + d.campers.length, 0);
  let globalIndex = 0; // running camper number across all delegations

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 font-sans animate-fadeIn">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Back button + header ───────────────────────────────── */}
        <div className="space-y-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Registration Page
          </button>

          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-6 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-900/70 uppercase tracking-[0.2em]">
                Registered Camper List
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight mt-0.5">
                {eventTitle || 'Youth Camp 2026'}
              </h1>
              {churchName && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Building2 className="w-4 h-4 text-slate-900/70" />
                  <span className="text-sm font-bold text-slate-900/80">{churchName}</span>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold text-slate-900/60 uppercase tracking-wider">
                Church Code
              </p>
              <span className="font-mono font-black text-slate-950 text-sm tracking-widest">
                {churchCode}
              </span>
            </div>
          </div>
        </div>

        {/* ── Loading / Error / Empty states ─────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading registered campers…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-950/40 border border-red-700/40 p-8 flex flex-col items-center gap-3 text-center">
            <XCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-semibold text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && delegations.length === 0 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-base font-bold text-slate-300">No campers found</p>
            <p className="text-sm text-slate-500">
              No registrations were found for church code{' '}
              <span className="font-mono text-amber-400">{churchCode}</span> in this event.
            </p>
          </div>
        )}

        {/* ── Summary bar ─────────────────────────────────────────── */}
        {!loading && !error && delegations.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Total Campers</p>
                  <p className="text-xl font-black text-amber-400">{totalCampers}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Delegations</p>
                  <p className="text-xl font-black text-emerald-400">{delegations.length}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30">
                  <ShieldCheck className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Status</p>
                  <p className="text-xs font-black text-violet-300 uppercase tracking-wider">
                    Pre-Registered
                  </p>
                </div>
              </div>
            </div>

            {/* ── Confirmation badge ─────────────────────────────────── */}
            <div className="flex items-center gap-3 py-3 px-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm font-bold text-emerald-300">
                ✓ The following campers are officially in the{' '}
                <span className="text-emerald-200">
                  {eventTitle || 'YOUTH CAMP 2026'}
                </span>{' '}
                registration list
              </p>
            </div>

            {/* ── Delegation cards ───────────────────────────────────── */}
            <div className="space-y-6">
              {delegations.map((delegation, dIdx) => (
                <div
                  key={delegation.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
                >
                  {/* Delegation header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 bg-slate-900/80 border-b border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300">
                        Delegation #{dIdx + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-100">
                        {delegation.delegationHead}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          delegation.registrationType === 'church'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        }`}
                      >
                        {delegation.registrationType === 'church'
                          ? 'Initial Registration'
                          : 'Add-On Delegation'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(delegation.submittedAt)}</span>
                    </div>
                  </div>

                  {/* Camper table */}
                  <div className="overflow-x-auto">
                    {delegation.campers.length === 0 ? (
                      <p className="px-5 py-4 text-xs text-slate-600 italic">
                        No campers recorded in this delegation.
                      </p>
                    ) : (
                      <table className="w-full text-xs min-w-[520px]">
                        <thead>
                          <tr className="text-[9px] uppercase tracking-wider text-slate-500 bg-slate-950/60">
                            <th className="px-4 py-2 font-black text-left w-10">#</th>
                            <th className="px-4 py-2 font-black text-left">Full Name</th>
                            <th className="px-4 py-2 font-black text-left">Badge Name</th>
                            <th className="px-4 py-2 font-black text-center w-14">Age</th>
                            <th className="px-4 py-2 font-black text-left">Grade Level</th>
                            <th className="px-4 py-2 font-black text-left w-16">Gender</th>
                            <th className="px-4 py-2 font-black text-center w-20">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {delegation.campers.map((c, cIdx) => {
                            globalIndex += 1;
                            const gIdx = globalIndex;
                            return (
                              <tr
                                key={cIdx}
                                className={
                                  cIdx % 2 === 0
                                    ? 'bg-transparent'
                                    : 'bg-slate-900/40'
                                }
                              >
                                <td className="px-4 py-2.5 text-slate-500 font-mono font-bold">
                                  {gIdx}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-slate-100">
                                  {c.fullName || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-slate-400">
                                  {c.badgeName || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-center text-slate-400">
                                  {c.age || '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${gradeBg(c.gradeLevel)}`}
                                  >
                                    {GRADE_LABEL[c.gradeLevel] ?? c.gradeLevel}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                      c.gender === 'male'
                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                        : c.gender === 'female'
                                        ? 'bg-pink-100 text-pink-700 border-pink-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {c.gender === 'male'
                                      ? 'Male'
                                      : c.gender === 'female'
                                      ? 'Female'
                                      : c.gender || '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 uppercase tracking-wider">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Listed
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Delegation footer */}
                  <div className="px-5 py-2 border-t border-slate-800 bg-slate-950/30 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      <GraduationCap className="w-3 h-3 inline mr-1" />
                      {delegation.campers.length}{' '}
                      {delegation.campers.length === 1 ? 'camper' : 'campers'} in this delegation
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">
                      Ref: {delegation.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer back button ─────────────────────────────────── */}
            <div className="flex justify-center pt-4 pb-8">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Registration Page
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CamperListPage;
