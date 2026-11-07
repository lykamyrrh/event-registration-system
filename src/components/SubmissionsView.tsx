import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RegistrationEvent,
  RegistrationSubmission,
  SubmissionStatus,
  CamperItem
} from '../types';
import { Pagination } from './Pagination';
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

export const getCampersForSubmission = (
  sub: RegistrationSubmission
): CamperItem[] => {
  if (sub.campers && sub.campers.length > 0) return sub.campers;

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 my-8 text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-black text-white">
              Delegation Details
            </h2>
            <p className="text-xs text-slate-400">
              Ref #{sub.id.slice(-6)} · Event: {event?.title || 'Unknown'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 border border-slate-700 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Church + Pastor + Delegation Head */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:divide-x md:divide-slate-800">
              {/* Church */}
              <div className="space-y-2 md:pr-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Church Information
                </p>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <span className="font-semibold text-white">{church}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <span>
                      {String(sub.data.f_church_address || '—')}
                      {sub.data.f_city_province
                        ? `, ${sub.data.f_city_province}`
                        : ''}
                    </span>
                  </div>
                  {sub.data.f_church_registration_code && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono font-bold text-gold-300">
                        {String(sub.data.f_church_registration_code)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pastor */}
              <div className="space-y-2 md:px-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pastor
                </p>
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="font-semibold text-white">
                      {pastor || '—'}
                    </span>
                  </div>
                  {sub.data.f_pastor_contact && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{String(sub.data.f_pastor_contact)}</span>
                    </div>
                  )}
                  {sub.data.f_pastor_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {String(sub.data.f_pastor_email)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delegation Head */}
              <div className="space-y-2 md:pl-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Delegation Head
                </p>
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="font-semibold text-white">
                      {leader}
                      {sub.data.f_delegation_role && (
                        <span className="text-slate-400 font-normal">
                          {' '}
                          ({String(sub.data.f_delegation_role)})
                        </span>
                      )}
                    </span>
                  </div>
                  {leaderPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{leaderPhone}</span>
                    </div>
                  )}
                  {sub.data.f_delegation_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
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
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Additional Fields
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {extras.map(([key, val]) => (
                  <div key={key} className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider capitalize">
                      {key.replace(/^f_/, '').replace(/_/g, ' ')}
                    </span>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
                      {key.includes('link') &&
                      String(val).startsWith('http') ? (
                        <a
                          href={String(val)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-500 hover:text-amber-400 underline font-mono flex items-center gap-1 font-bold break-all"
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
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Camper Roster ({campers.length})
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-900">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2 font-black">#</th>
                    <th className="px-3 py-2 font-black">Full Name</th>
                    <th className="px-3 py-2 font-black">Badge Name</th>
                    <th className="px-3 py-2 font-black">Age</th>
                    <th className="px-3 py-2 font-black">Grade Level</th>
                    <th className="px-3 py-2 font-black">Gender</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {campers.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-slate-800/50">
                      <td className="px-3 py-2 text-slate-500 font-mono">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-semibold text-white">
                        {c.fullName || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {c.badgeName || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {c.age || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-300 capitalize">
                        {c.gradeLevel || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            c.gender === 'male'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : c.gender === 'female'
                              ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detailSubmissionId, setDetailSubmissionId] = useState<string | null>(null);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const detailSubmission = useMemo(
    () => submissions.find(s => s.id === detailSubmissionId) || null,
    [submissions, detailSubmissionId]
  );

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

  useEffect(() => {
    setPage(1);
  }, [
    selectedEventId,
    statusFilter,
    churchFilter,
    roleFilter,
    academicFilter,
    searchQuery,
    pageSize
  ]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, page, pageSize]);

  useEffect(() => {
    if (listTopRef.current) {
      const top = listTopRef.current.offsetTop - 24;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [page]);

  const getEvent = (eventId: string) => events.find(e => e.id === eventId);

  const totalCampersInView = filteredSubmissions.reduce(
    (acc, sub) => acc + getCampersForSubmission(sub).length,
    0
  );

  const totalPaidCount = filteredSubmissions.filter(
    s => s.status === 'paid'
  ).length;

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

  return (
    <div className="space-y-8 animate-fadeIn font-sans text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
            <Table className="w-3.5 h-3.5" />
            Global Master Table · Read-Only
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            All Submissions &amp;{' '}
            <span className="text-amber-500">Data</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Cross-event read-only overview. Open any event from the Events tab
            to edit or delete records.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition border border-amber-600/30"
        >
          <Download className="w-4 h-4" />
          <span>Export Unified CSV</span>
        </button>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-amber-500">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Churches Count</div>
            <div className="text-xl font-black text-white">
              {availableChurches.length}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Confirmed Paid</div>
            <div className="text-xl font-black text-amber-500">
              {totalPaidCount}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-gold-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Delegations</div>
            <div className="text-xl font-black text-white">
              {filteredSubmissions.length}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-gold-300">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Campers Listed</div>
            <div className="text-xl font-black text-white">
              {totalCampersInView}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search camper name, badge, church, or pastor..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none placeholder-slate-600"
            />
          </div>

          <div className="sm:col-span-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
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
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none font-medium"
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
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Churches Filter
            </label>
            <select
              value={churchFilter}
              onChange={e => setChurchFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none font-medium"
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
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Role / Attendee Type
            </label>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none font-medium"
            >
              <option value="all">All Roles</option>
              <option value="camper">Campers Only</option>
              <option value="pastor">Pastors Only</option>
              <option value="delegation_head">Delegation Head Only</option>
              <option value="youth_director">Youth Director Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Grade Level / Age Group
            </label>
            <select
              value={academicFilter}
              onChange={e => setAcademicFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none font-medium"
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

      <div ref={listTopRef} />

      {/* Submissions Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-100">
            <thead className="bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Church &amp; Delegation</th>
                <th className="px-5 py-3.5">Camper Roster Listing</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Organizer Notes</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">View</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No pre-registration records match the current filter
                    selection.
                  </td>
                </tr>
              ) : (
                paginated.map(sub => {
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
                      className="cursor-pointer hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Church & Delegation */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-white flex items-center gap-1.5 text-base">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{church}</span>
                        </div>
                        {pastor && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            Pastor: {pastor}
                          </div>
                        )}
                        <div className="text-xs text-slate-300 mt-1">
                          Head: <span className="font-bold text-white">{leader}</span>{' '}
                          {leaderPhone ? `(${leaderPhone})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">
                          Ref #{sub.id.slice(-6)} · {ev?.title || 'Unknown'}
                        </div>
                      </td>

                      {/* Camper summary */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2 max-w-md">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500">
                            {campersList.length} Camper
                            {campersList.length !== 1 ? 's' : ''}
                          </span>
                          <div className="text-[11px] text-slate-500 italic">
                            Click row to view full roster
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            sub.status === 'paid'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-sm'
                              : sub.status === 'confirmed'
                              ? 'bg-slate-800 border-slate-700 text-slate-300'
                              : sub.status === 'checked-in'
                              ? 'bg-gold-300/10 border-gold-300/20 text-gold-300'
                              : sub.status === 'pending'
                              ? 'bg-slate-800 border-slate-700 text-slate-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}
                        >
                          {sub.status === 'paid' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          {sub.status.charAt(0).toUpperCase() +
                            sub.status.slice(1)}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-5 py-4 align-top max-w-xs">
                        {sub.notes ? (
                          <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-medium line-clamp-3">
                            {sub.notes}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 italic">
                            No notes attached
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-4 align-top text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
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

      {/* Pagination */}
      {filteredSubmissions.length > 0 && (
        <Pagination
          totalItems={filteredSubmissions.length}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="submissions"
          pageSizeOptions={[10, 25, 50, 100]}
        />
      )}

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