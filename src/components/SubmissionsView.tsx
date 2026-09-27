import React, { useState, useMemo, useEffect } from 'react';
import {
  RegistrationEvent,
  RegistrationSubmission,
  SubmissionStatus,
  CamperItem
} from '../types';
import {
  Table,
  Search,
  Download,
  Clock,
  Eye,
  X,
  Calendar,
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Users,
  Link2,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════
interface SubmissionsViewProps {
  events: RegistrationEvent[];
  submissions: RegistrationSubmission[];
  selectedEventId?: string;
}

// ═══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Resolves the camper list for a submission, trying sources in order:
 *   1. `sub.campers` — mapped camelCase array (from App.tsx join)
 *   2. `sub.campers_raw` — raw snake_case rows from Supabase join
 *   3. `sub.data.campers` — JSON snapshot saved by the public form
 *   4. Placeholder for single-registrant submissions
 *
 * Exported so per-event views can reuse the same fallback logic.
 */
export const getCampersForSubmission = (
  sub: RegistrationSubmission
): CamperItem[] => {
  // 1. Joined + mapped campers table
  if (sub.campers && sub.campers.length > 0) return sub.campers;

  // 2. Raw rows from the Supabase join
  const rawJoined = (sub as any).campers_raw;
  if (Array.isArray(rawJoined) && rawJoined.length > 0) {
    return rawJoined.map((c: any, i: number) => ({
      id: c.id || `joined_${i}`,
      fullName: c.full_name || c.fullName || '',
      badgeName: c.badge_name || c.badgeName || '',
      age: c.age != null ? String(c.age) : '',
      gradeLevel: c.grade_level || c.gradeLevel || 'junior high',
      gender: c.gender || 'male'
    }));
  }

  // 3. JSON snapshot stored inside data.campers
  const fromData = (sub.data as any)?.campers;
  if (Array.isArray(fromData) && fromData.length > 0) {
    return fromData.map((c: any, i: number) => ({
      id: c.id || `data_${i}`,
      fullName: c.fullName || c.full_name || '',
      badgeName: c.badgeName || c.badge_name || '',
      age: c.age != null ? String(c.age) : '',
      gradeLevel: c.gradeLevel || c.grade_level || 'junior high',
      gender: c.gender || 'male'
    }));
  }

  // 4. Last-resort placeholder for single-registrant submissions
  return [
    {
      id: 'single',
      fullName: String(
        sub.data.f_camper_full_name ||
          sub.data.f_name ||
          sub.data.f_fullname ||
          'Registrant'
      ),
      badgeName: String(sub.data.f_preferred_badge_name || 'Badge'),
      age: String(sub.data.f_dob_age || sub.data.f_age || 'N/A'),
      gradeLevel: String(sub.data.f_academic_level || 'General'),
      gender: String(sub.data.f_gender || 'N/A')
    }
  ];
};

// ═══════════════════════════════════════════════════════════════
// DETAIL MODAL (read-only)
// ═══════════════════════════════════════════════════════════════
interface DetailModalProps {
  submission: RegistrationSubmission;
  event?: RegistrationEvent;
  onClose: () => void;
}

const SubmissionDetailModal: React.FC<DetailModalProps> = ({
  submission: sub,
  event,
  onClose
}) => {
  const campers = getCampersForSubmission(sub);

  const church = String(
    sub.data.f_church_name || sub.data.f_company || 'Independent Church'
  );
  const pastor = String(
    sub.data.f_church_pastor || sub.data.f_pastor_fullname || ''
  );
  const leader = String(
    sub.data.f_delegation_head_name ||
      sub.data.f_delegation_fullname ||
      sub.data.f_name ||
      'Delegation Head'
  );
  const leaderPhone = String(
    sub.data.f_delegation_head_phone ||
      sub.data.f_delegation_mobile ||
      sub.data.f_phone ||
      ''
  );

  const known = new Set([
    'f_church_name',
    'f_church_address',
    'f_city_province',
    'f_church_pastor',
    'f_pastor_fullname',
    'f_pastor_contact',
    'f_pastor_email',
    'f_delegation_head_name',
    'f_delegation_fullname',
    'f_delegation_role',
    'f_delegation_head_phone',
    'f_delegation_mobile',
    'f_delegation_email',
    'campers',
    'church_registration_code',
    'registration_type',
    'parent_registration_id'
  ]);
  const extras = Object.entries(sub.data).filter(([k]) => !known.has(k));

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-navy-950/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-navy-200 my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 sticky top-0 bg-white rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-black text-navy-900">
              Delegation Details
            </h2>
            <p className="text-xs text-navy-900/60">
              Ref #{sub.id.slice(-6)} · Event: {event?.title || 'Unknown'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-ivory border border-navy-200"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Church + Pastor + Delegation Head */}
          <div className="p-4 bg-white rounded-2xl border border-navy-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:divide-x md:divide-navy-100">
              {/* Church */}
              <div className="space-y-2 md:pr-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Church Information
                </p>
                <div className="space-y-1.5 text-xs text-navy-900">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-navy-900/50 mt-0.5 shrink-0" />
                    <span className="font-semibold">{church}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-navy-900/50 mt-0.5 shrink-0" />
                    <span>
                      {String(sub.data.f_church_address || '—')}
                      {sub.data.f_city_province
                        ? `, ${sub.data.f_city_province}`
                        : ''}
                    </span>
                  </div>
                  {sub.data.f_church_registration_code && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-navy-900/50 shrink-0" />
                      <span className="font-mono font-bold text-gold-700">
                        {String(sub.data.f_church_registration_code)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pastor */}
              <div className="space-y-2 md:px-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pastor
                </p>
                <div className="space-y-1 text-xs text-navy-900/80">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-navy-900/50 shrink-0" />
                    <span className="font-semibold text-navy-900">
                      {pastor || '—'}
                    </span>
                  </div>
                  {sub.data.f_pastor_contact && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-navy-900/50 shrink-0" />
                      <span>{String(sub.data.f_pastor_contact)}</span>
                    </div>
                  )}
                  {sub.data.f_pastor_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-navy-900/50 shrink-0" />
                      <span className="truncate">
                        {String(sub.data.f_pastor_email)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delegation Head */}
              <div className="space-y-2 md:pl-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Delegation Head
                </p>
                <div className="space-y-1 text-xs text-navy-900/80">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-navy-900/50 shrink-0" />
                    <span className="font-semibold text-navy-900">
                      {leader}
                      {sub.data.f_delegation_role && (
                        <span className="text-navy-900/60 font-normal">
                          {' '}
                          ({String(sub.data.f_delegation_role)})
                        </span>
                      )}
                    </span>
                  </div>
                  {leaderPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-navy-900/50 shrink-0" />
                      <span>{leaderPhone}</span>
                    </div>
                  )}
                  {sub.data.f_delegation_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-navy-900/50 shrink-0" />
                      <span className="truncate">
                        {String(sub.data.f_delegation_email)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          {extras.length > 0 && (
            <div className="p-4 bg-white rounded-2xl border border-navy-200 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60">
                Additional Fields
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {extras.map(([key, val]) => (
                  <div key={key} className="space-y-0.5">
                    <span className="text-[10px] font-bold text-navy-900/60 uppercase tracking-wider capitalize">
                      {key.replace(/^f_/, '').replace(/_/g, ' ')}
                    </span>
                    <div className="p-2 rounded-lg bg-ivory border border-navy-200 text-navy-900 text-xs">
                      {key.includes('link') &&
                      String(val).startsWith('http') ? (
                        <a
                          href={String(val)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gold-700 underline font-mono flex items-center gap-1 font-bold break-all"
                        >
                          <Link2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{String(val)}</span>
                        </a>
                      ) : Array.isArray(val) ? (
                        val.join(', ')
                      ) : (
                        String(val ?? '—')
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Camper Roster */}
          <div className="p-4 bg-white rounded-2xl border border-navy-200 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Camper Roster ({campers.length})
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-navy-200">
              <table className="w-full text-xs">
                <thead className="bg-ivory">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-navy-900/70">
                    <th className="px-3 py-2 font-black">#</th>
                    <th className="px-3 py-2 font-black">Full Name</th>
                    <th className="px-3 py-2 font-black">Badge Name</th>
                    <th className="px-3 py-2 font-black">Age</th>
                    <th className="px-3 py-2 font-black">Grade Level</th>
                    <th className="px-3 py-2 font-black">Gender</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {campers.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-gold-50/40">
                      <td className="px-3 py-2 text-navy-900/60 font-mono">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-semibold text-navy-900">
                        {c.fullName || '—'}
                      </td>
                      <td className="px-3 py-2 text-navy-900/80">
                        {c.badgeName || '—'}
                      </td>
                      <td className="px-3 py-2 text-navy-900/80">
                        {c.age || '—'}
                      </td>
                      <td className="px-3 py-2 text-navy-900/80 capitalize">
                        {c.gradeLevel || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            c.gender === 'male'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : c.gender === 'female'
                              ? 'bg-pink-50 text-pink-700 border border-pink-200'
                              : 'bg-navy-50 text-navy-700 border border-navy-200'
                          }`}
                        >
                          {c.gender || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN VIEW (read-only)
// ═══════════════════════════════════════════════════════════════
export const SubmissionsView: React.FC<SubmissionsViewProps> = ({
  events,
  submissions,
  selectedEventId: initialSelectedEventId
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialSelectedEventId || 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [churchFilter, setChurchFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [academicFilter, setAcademicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Which submission's detail modal is open
  const [detailSubmissionId, setDetailSubmissionId] = useState<string | null>(
    null
  );

  const detailSubmission = useMemo(
    () => submissions.find(s => s.id === detailSubmissionId) || null,
    [submissions, detailSubmissionId]
  );

  // ── Derived: church list ──────────────────────────────────
  const availableChurches = useMemo(
    () =>
      Array.from(
        new Set(
          submissions
            .map(s => String(s.data.f_church_name || s.data.f_company || ''))
            .filter(Boolean)
        )
      ),
    [submissions]
  );

  // ── Filter submissions ────────────────────────────────────
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      if (selectedEventId !== 'all' && sub.eventId !== selectedEventId)
        return false;
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

      if (churchFilter !== 'all') {
        const subChurch = String(
          sub.data.f_church_name || sub.data.f_company || ''
        );
        if (subChurch !== churchFilter) return false;
      }

      if (roleFilter !== 'all') {
        const subRole = String(
          sub.data.f_attendee_role || sub.data.f_role || ''
        ).toLowerCase();
        const camperRoles = getCampersForSubmission(sub)
          .map(() => 'camper')
          .join(' ');
        const combined = `${subRole} ${camperRoles}`;
        if (roleFilter === 'camper' && !combined.includes('camper')) return false;
        if (roleFilter === 'pastor' && !combined.includes('pastor')) return false;
        if (
          roleFilter === 'delegation_head' &&
          !combined.includes('delegation head') &&
          !combined.includes('leader')
        )
          return false;
        if (
          roleFilter === 'youth_director' &&
          !combined.includes('youth director')
        )
          return false;
      }

      if (academicFilter !== 'all') {
        const subLevel = String(sub.data.f_academic_level || '');
        const camperLevels = getCampersForSubmission(sub)
          .map(c => c.gradeLevel)
          .join(' ');
        const combined = `${subLevel} ${camperLevels}`;
        if (!combined.includes(academicFilter)) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const dataValues = Object.values(sub.data)
          .map(v => (Array.isArray(v) ? v.join(' ') : String(v)))
          .join(' ')
          .toLowerCase();
        const campersText = getCampersForSubmission(sub)
          .map(c => `${c.fullName} ${c.badgeName} ${c.gradeLevel}`)
          .join(' ')
          .toLowerCase();
        const notesText = (sub.notes || '').toLowerCase();
        const statusText = sub.status.toLowerCase();
        return (
          dataValues.includes(query) ||
          campersText.includes(query) ||
          notesText.includes(query) ||
          statusText.includes(query)
        );
      }

      return true;
    });
  }, [
    submissions,
    selectedEventId,
    statusFilter,
    churchFilter,
    roleFilter,
    academicFilter,
    searchQuery
  ]);

  const getEvent = (eventId: string) => events.find(e => e.id === eventId);

  const totalCampersInView = filteredSubmissions.reduce(
    (acc, sub) => acc + getCampersForSubmission(sub).length,
    0
  );

  const totalPaidCount = filteredSubmissions.filter(
    s => s.status === 'paid'
  ).length;

  // ── CSV export ────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) {
      alert('No records available to export.');
      return;
    }

    const dataKeys = Array.from(
      new Set(filteredSubmissions.flatMap(s => Object.keys(s.data)))
    );

    const headers = [
      'Submission ID',
      'Event Title',
      'Church Name',
      'Church Registration Code',
      'Delegation Head',
      'Camper Roster Summary',
      'Status',
      'Notes',
      'Submitted At',
      ...dataKeys
    ];

    const csvRows = [
      headers.join(','),
      ...filteredSubmissions.map(s => {
        const ev = getEvent(s.eventId);
        const church = String(
          s.data.f_church_name || s.data.f_company || 'Independent Church'
        );
        const regCode = String(s.data.church_registration_code || '');
        const head = String(
          s.data.f_delegation_head_name ||
            s.data.f_delegation_fullname ||
            s.data.f_name ||
            'Leader'
        );
        const roster = getCampersForSubmission(s)
          .map(
            c =>
              `${c.fullName} (${c.badgeName}, Age ${c.age}, ${c.gradeLevel}, ${c.gender})`
          )
          .join('; ');

        const row = [
          `"${s.id}"`,
          `"${ev?.title.replace(/"/g, '""') || 'Unknown Event'}"`,
          `"${church.replace(/"/g, '""')}"`,
          `"${regCode.replace(/"/g, '""')}"`,
          `"${head.replace(/"/g, '""')}"`,
          `"${roster.replace(/"/g, '""')}"`,
          `"${s.status}"`,
          `"${(s.notes || '').replace(/"/g, '""')}"`,
          `"${new Date(s.submitted_at).toLocaleString()}"`,
          ...dataKeys.map(key => {
            const val = s.data[key];
            const strVal = Array.isArray(val)
              ? val.join('; ')
              : String(val ?? '');
            return `"${strVal.replace(/"/g, '""')}"`;
          })
        ];
        return row.join(',');
      })
    ];

    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `registrations-export-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 animate-fadeIn font-sans text-navy-900">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-navy-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-100 border border-navy-200 text-navy-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Table className="w-3.5 h-3.5 text-navy-900" />
            Global Master Table · Read-Only
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900">
            All Submissions &amp;{' '}
            <span className="text-gold-600">Data</span>
          </h1>
          <p className="text-navy-900/70 text-sm mt-1">
            Cross-event read-only overview. Open any event from the Events tab
            to edit or delete records.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 hover:text-white text-navy-950 font-bold text-sm shadow-md transition border border-gold-600/30"
        >
          <Download className="w-4 h-4" />
          <span>Export Unified CSV</span>
        </button>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gold-100 text-navy-900">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-navy-900/70">Churches Count</div>
            <div className="text-xl font-black text-navy-900">
              {availableChurches.length}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-navy-900/70">Confirmed Paid</div>
            <div className="text-xl font-black text-emerald-800">
              {totalPaidCount}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gold-100 text-navy-900">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-navy-900/70">Total Delegations</div>
            <div className="text-xl font-black text-navy-900">
              {filteredSubmissions.length}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gold-100 text-navy-900">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-navy-900/70">Total Campers Listed</div>
            <div className="text-xl font-black text-navy-900">
              {totalCampersInView}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-navy-900/60 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search camper name, badge, church, or pastor..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none placeholder-navy-900/50"
            />
          </div>

          <div className="sm:col-span-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-navy-900/70 shrink-0" />
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none"
            >
              <option value="all">All Events ({events.length})</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} (
                  {submissions.filter(s => s.eventId === ev.id).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-navy-900/70 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-xs focus:border-gold-500 focus:outline-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid (Payment Confirmed)</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked-In</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-navy-900/70 uppercase tracking-wider mb-1">
              Churches Filter
            </label>
            <select
              value={churchFilter}
              onChange={e => setChurchFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-xs focus:border-gold-500 focus:outline-none font-medium"
            >
              <option value="all">
                All Churches ({availableChurches.length})
              </option>
              {availableChurches.map(ch => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-navy-900/70 uppercase tracking-wider mb-1">
              Role / Attendee Type
            </label>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-xs focus:border-gold-500 focus:outline-none font-medium"
            >
              <option value="all">All Roles</option>
              <option value="camper">Campers Only</option>
              <option value="pastor">Pastors Only</option>
              <option value="delegation_head">Delegation Head Only</option>
              <option value="youth_director">Youth Director Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-navy-900/70 uppercase tracking-wider mb-1">
              Grade Level / Age Group
            </label>
            <select
              value={academicFilter}
              onChange={e => setAcademicFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-xs focus:border-gold-500 focus:outline-none font-medium"
            >
              <option value="all">All Levels</option>
              <option value="elementary">Elementary</option>
              <option value="junior high">Junior High</option>
              <option value="senior high">Senior High</option>
              <option value="college">College</option>
              <option value="working">Working / Professional</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="rounded-2xl bg-white border border-navy-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-navy-900">
            <thead className="bg-navy-900 text-xs font-bold text-navy-100 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Church &amp; Delegation</th>
                <th className="px-5 py-3.5">Camper Roster Listing</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Organizer Notes</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">View</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-navy-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-navy-900/70"
                  >
                    <AlertCircle className="w-8 h-8 text-navy-900/40 mx-auto mb-2" />
                    No pre-registration records match the current filter
                    selection.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map(sub => {
                  const ev = getEvent(sub.eventId);
                  const church = String(
                    sub.data.f_church_name ||
                      sub.data.f_company ||
                      'Independent Church'
                  );
                  const pastor = String(
                    sub.data.f_church_pastor ||
                      sub.data.f_pastor_fullname ||
                      ''
                  );
                  const leader = String(
                    sub.data.f_delegation_head_name ||
                      sub.data.f_delegation_fullname ||
                      sub.data.f_name ||
                      'Delegation Head'
                  );
                  const leaderPhone = String(
                    sub.data.f_delegation_head_phone ||
                      sub.data.f_delegation_mobile ||
                      sub.data.f_phone ||
                      ''
                  );

                  const campersList = getCampersForSubmission(sub);

                  const submittedDate = new Date(
                    sub.submitted_at
                  ).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setDetailSubmissionId(sub.id)}
                      className="cursor-pointer odd:bg-white even:bg-ivory hover:bg-gold-50 transition-colors"
                    >
                      {/* Church & Delegation */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-navy-900 flex items-center gap-1.5 text-base">
                          <Building2 className="w-4 h-4 text-navy-900/70 shrink-0" />
                          <span>{church}</span>
                        </div>
                        {pastor && (
                          <div className="text-xs text-navy-900/70 mt-0.5">
                            Pastor: {pastor}
                          </div>
                        )}
                        <div className="text-xs text-navy-900 mt-1">
                          Head: <span className="font-bold">{leader}</span>{' '}
                          {leaderPhone ? `(${leaderPhone})` : ''}
                        </div>
                        <div className="text-[11px] text-navy-900/70 font-mono mt-1">
                          Ref #{sub.id.slice(-6)} · {ev?.title || 'Unknown'}
                        </div>
                      </td>

                      {/* Camper summary */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2 max-w-md">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold-100 border border-navy-200 text-navy-900">
                            {campersList.length} Camper
                            {campersList.length !== 1 ? 's' : ''}
                          </span>
                          <div className="text-[11px] text-navy-900/70 italic">
                            Click row to view full roster
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            sub.status === 'paid'
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-sm'
                              : sub.status === 'confirmed'
                              ? 'bg-gold-100 border-navy-200 text-navy-900'
                              : sub.status === 'checked-in'
                              ? 'bg-purple-100 border-purple-300 text-purple-900'
                              : sub.status === 'pending'
                              ? 'bg-gold-100 border-gold-300 text-gold-900'
                              : 'bg-rose-100 border-rose-300 text-rose-900'
                          }`}
                        >
                          {sub.status === 'paid' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          )}
                          {sub.status.charAt(0).toUpperCase() +
                            sub.status.slice(1)}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-5 py-4 align-top max-w-xs">
                        {sub.notes ? (
                          <div className="text-xs text-navy-900 bg-ivory p-2.5 rounded-xl border border-navy-200 font-medium line-clamp-3">
                            {sub.notes}
                          </div>
                        ) : (
                          <span className="text-xs text-navy-900/50 italic">
                            No notes attached
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-4 align-top text-xs text-navy-900/70">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-navy-900/70" />
                          <span>{submittedDate}</span>
                        </div>
                      </td>

                      {/* View action */}
                      <td className="px-5 py-4 align-top text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDetailSubmissionId(sub.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-navy-200 text-navy-900 hover:bg-gold-100"
                          title="View Full Record"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ DETAIL MODAL ═══ */}
      {detailSubmission && (
        <SubmissionDetailModal
          submission={detailSubmission}
          event={getEvent(detailSubmission.eventId)}
          onClose={() => setDetailSubmissionId(null)}
        />
      )}
    </div>
  );
};

export default SubmissionsView;