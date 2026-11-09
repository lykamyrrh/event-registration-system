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
import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════
interface SubmissionsViewProps {
  events: RegistrationEvent[];
  submissions: RegistrationSubmission[];
  selectedEventId?: string;
}

// ═══════════════════════════════════════════════════════════════
// EXCEL EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════

// Keys that already have dedicated columns (or are internal) so they
// are NOT repeated as raw "f_xxx" columns in the export.
const EXPORT_HIDDEN_KEYS = new Set([
  'campers',
  'church_registration_code',
  'registration_type',
  'parent_registration_id',
  'f_church_name',
  'f_company',
  'f_church_address',
  'f_city_province',
  'f_church_pastor',
  'f_pastor_fullname',
  'f_pastor_contact',
  'f_pastor_email',
  'f_delegation_head_name',
  'f_delegation_fullname',
  'f_name',
  'f_delegation_role',
  'f_delegation_head_phone',
  'f_delegation_mobile',
  'f_phone',
  'f_delegation_email',
  'f_church_registration_code'
]);

// f_pastor_email -> "Pastor Email"
const prettyKey = (k: string) =>
  k
    .replace(/^f_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

// Plain values for the sheet. Strings stay strings, so phone numbers
// keep their leading zeros.
const cellValue = (val: unknown): string | number =>
  val == null
    ? ''
    : Array.isArray(val)
    ? val.join('; ')
    : typeof val === 'object'
    ? JSON.stringify(val)
    : typeof val === 'number'
    ? val
    : String(val);

// 2026-11-09 14:30 (sortable, no locale surprises)
const fmtDate = (d: string | number | Date) => {
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(
    x.getHours()
  )}:${p(x.getMinutes())}`;
};

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
  submissions: RegistrationSubmission[];
  event?: RegistrationEvent;
  onClose: () => void;
}

const SubmissionDetailModal: React.FC<DetailModalProps> = ({
  submissions,
  event,
  onClose
}) => {
  // Use the first submission to get the primary church info
  const primarySub = submissions[0];

  // Combine all campers from all batches
  const campers = submissions.flatMap(sub => getCampersForSubmission(sub));

  const church = String(
    primarySub.data.f_church_name || primarySub.data.f_company || 'Independent Church'
  );
  const pastor = String(
    primarySub.data.f_church_pastor || primarySub.data.f_pastor_fullname || ''
  );
  const leader = String(
    primarySub.data.f_delegation_head_name ||
      primarySub.data.f_delegation_fullname ||
      primarySub.data.f_name ||
      'Delegation Head'
  );
  const leaderPhone = String(
    primarySub.data.f_delegation_head_phone ||
      primarySub.data.f_delegation_mobile ||
      primarySub.data.f_phone ||
      ''
  );

  // Extract custom fields from the primary submission
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
  const extras = Object.entries(primarySub.data).filter(([k]) => !known.has(k));

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
              Ref #{primarySub.id.slice(-6)} · Event: {event?.title || 'Unknown'}
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
                      {String(primarySub.data.f_church_address || '—')}
                      {primarySub.data.f_city_province
                        ? `, ${primarySub.data.f_city_province}`
                        : ''}
                    </span>
                  </div>
                  {primarySub.data.f_church_registration_code && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono font-bold text-gold-300">
                        {String(primarySub.data.f_church_registration_code)}
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
                  {primarySub.data.f_pastor_contact && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{String(primarySub.data.f_pastor_contact)}</span>
                    </div>
                  )}
                  {primarySub.data.f_pastor_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {String(primarySub.data.f_pastor_email)}
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
                      {primarySub.data.f_delegation_role && (
                        <span className="text-slate-400 font-normal">
                          {' '}
                          ({String(primarySub.data.f_delegation_role)})
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
                  {primarySub.data.f_delegation_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {String(primarySub.data.f_delegation_email)}
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
                Total Camper Roster ({campers.length})
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
  const [detailChurchCode, setDetailChurchCode] = useState<string | null>(null);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  // Group submissions by church code
  const groupedSubmissions = useMemo(() => {
    const groups: Record<string, RegistrationSubmission[]> = {};

    // Sort submissions by date ascending first so the "primary" sub is the oldest
    const sortedSubs = [...submissions].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    sortedSubs.forEach(sub => {
      const code = sub.data.church_registration_code || sub.data.f_church_name || sub.id;
      if (!groups[code]) groups[code] = [];
      groups[code].push(sub);
    });

    // Convert to array, calculate latest update, and sort by latest update (newest first)
    return Object.values(groups).map(group => {
      const primarySub = group[0];
      const latestSub = group[group.length - 1];
      const allCampers = group.flatMap(sub => getCampersForSubmission(sub));

      return {
        id: primarySub.id, // Primary ID for keys
        churchCode: String(primarySub.data.church_registration_code || primarySub.data.f_church_name || primarySub.id),
        primarySub,
        submissions: group,
        allCampers,
        latestDate: new Date(latestSub.submitted_at).getTime()
      };
    }).sort((a, b) => b.latestDate - a.latestDate); // Newest church at top
  }, [submissions]);

  const detailSubmissions = useMemo(
    () => groupedSubmissions.find(g => g.churchCode === detailChurchCode)?.submissions || [],
    [groupedSubmissions, detailChurchCode]
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

  const filteredGroups = useMemo(() => {
    return groupedSubmissions.filter(group => {
      const sub = group.primarySub;

      if (selectedEventId !== 'all' && sub.eventId !== selectedEventId)
        return false;

      // Status filter applies if ANY submission in the group matches
      if (statusFilter !== 'all' && !group.submissions.some(s => s.status === statusFilter)) return false;

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
        const camperRoles = group.allCampers
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
        const camperLevels = group.allCampers
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
        const campersText = group.allCampers
          .map(c => `${c.fullName} ${c.badgeName} ${c.gradeLevel}`)
          .join(' ')
          .toLowerCase();
        const notesText = (sub.notes || '').toLowerCase();

        return (
          dataValues.includes(query) ||
          campersText.includes(query) ||
          notesText.includes(query)
        );
      }

      return true;
    });
  }, [
    groupedSubmissions,
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

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);

  useEffect(() => {
    if (listTopRef.current) {
      const top = listTopRef.current.offsetTop - 24;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [page]);

  const getEvent = (eventId: string) => events.find(e => e.id === eventId);

  const totalCampersInView = filteredGroups.reduce(
    (acc, group) => acc + group.allCampers.length,
    0
  );

  const totalPaidCount = filteredGroups.filter(
    group => group.submissions.some(s => s.status === 'paid')
  ).length;

  // ═══════════════════════════════════════════════════════════════
  // EXCEL EXPORT
  // ═══════════════════════════════════════════════════════════════
  const handleExportXLSX = () => {
    if (filteredGroups.length === 0) {
      alert('No records available to export.');
      return;
    }

    // Only custom fields not already shown as dedicated columns
    const extraKeys = Array.from(
      new Set(filteredGroups.flatMap(g => Object.keys(g.primarySub.data)))
    ).filter(k => !EXPORT_HIDDEN_KEYS.has(k));

    const headers = [
      'Event',
      'Church Name',
      'Registration Code',
      'Church Address',
      'City/Province',
      'Pastor',
      'Pastor Contact',
      'Pastor Email',
      'Delegation Head',
      'Delegation Role',
      'Delegation Mobile',
      'Delegation Email',
      'Total Campers',
      'Total Batches',
      'Batch #',
      'Batch Status',
      'Batch Notes',
      'Batch Submitted',
      'Camper #',
      'Full Name',
      'Badge Name',
      'Age',
      'Grade Level',
      'Gender',
      ...extraKeys.map(prettyKey)
    ];

    const rows: (string | number)[][] = [];

    filteredGroups.forEach(group => {
      const d = group.primarySub.data as Record<string, any>;
      const ev = getEvent(group.primarySub.eventId);

      const churchCols = [
        ev?.title || 'Unknown Event',
        d.f_church_name || d.f_company,
        d.church_registration_code || d.f_church_registration_code,
        d.f_church_address,
        d.f_city_province,
        d.f_pastor_fullname || d.f_church_pastor,
        d.f_pastor_contact,
        d.f_pastor_email,
        d.f_delegation_fullname || d.f_delegation_head_name || d.f_name,
        d.f_delegation_role,
        d.f_delegation_mobile || d.f_delegation_head_phone || d.f_phone,
        d.f_delegation_email,
        group.allCampers.length,
        group.submissions.length
      ].map(cellValue);
      const extraCols = extraKeys.map(k => cellValue(d[k]));

      let camperNo = 0;
      group.submissions.forEach((sub, batchIdx) => {
        const batchCols = [
          batchIdx + 1,
          sub.status,
          sub.notes,
          fmtDate(sub.submitted_at)
        ].map(cellValue);

        const campers = getCampersForSubmission(sub);

        if (campers.length === 0) {
          rows.push([...churchCols, ...batchCols, '', '', '', '', '', '', ...extraCols]);
          return;
        }

        campers.forEach(c => {
          camperNo += 1;
          rows.push([
            ...churchCols,
            ...batchCols,
            camperNo,
            cellValue(c.fullName),
            cellValue(c.badgeName),
            cellValue(c.age),
            cellValue(c.gradeLevel),
            cellValue(c.gender),
            ...extraCols
          ]);
        });
      });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-fit column widths (capped so long notes don't create a huge column)
    ws['!cols'] = headers.map((h, i) => {
      const longest = rows.reduce(
        (max, r) => Math.max(max, String(r[i] ?? '').length),
        h.length
      );
      return { wch: Math.min(Math.max(longest + 2, 10), 50) };
    });

    // Filter dropdowns on the header row
    ws['!autofilter'] = { ref: ws['!ref']! };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registrations');
    XLSX.writeFile(
      wb,
      `registrations-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
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
          onClick={handleExportXLSX}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition border border-amber-600/30"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel (.xlsx)</span>
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
              {filteredGroups.length}
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
              {paginatedGroups.length === 0 ? (
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
                paginatedGroups.map(group => {
                  const sub = group.primarySub;
                  const latestSub = group.submissions[group.submissions.length - 1];

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

                  const submittedDate = new Date(
                    latestSub.submitted_at
                  ).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr
                      key={group.id}
                      onClick={() => setDetailChurchCode(group.churchCode)}
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
                            {group.allCampers.length} Total Camper
                            {group.allCampers.length !== 1 ? 's' : ''}
                          </span>
                          {group.submissions.length > 1 && (
                            <div className="text-[11px] font-semibold text-gold-300">
                              ({group.submissions.length} Batches)
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 italic">
                            Click row to view full roster
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            latestSub.status === 'paid'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-sm'
                              : latestSub.status === 'confirmed'
                              ? 'bg-slate-800 border-slate-700 text-slate-300'
                              : latestSub.status === 'checked-in'
                              ? 'bg-gold-300/10 border-gold-300/20 text-gold-300'
                              : latestSub.status === 'pending'
                              ? 'bg-slate-800 border-slate-700 text-slate-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}
                        >
                          {latestSub.status === 'paid' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          {latestSub.status.charAt(0).toUpperCase() +
                            latestSub.status.slice(1)}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-5 py-4 align-top max-w-xs">
                        {latestSub.notes ? (
                          <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-medium line-clamp-3">
                            {latestSub.notes}
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
                            setDetailChurchCode(group.churchCode);
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
      {filteredGroups.length > 0 && (
        <Pagination
          totalItems={filteredGroups.length}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="churches"
          pageSizeOptions={[10, 25, 50, 100]}
        />
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {detailChurchCode && detailSubmissions.length > 0 && (
        <SubmissionDetailModal
          submissions={detailSubmissions}
          event={getEvent(detailSubmissions[0].eventId)}
          onClose={() => setDetailChurchCode(null)}
        />
      )}
    </div>
  );
};

export default SubmissionsView;
