import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RegistrationEvent,
  RegistrationSubmission,
  SubmissionStatus,
  CamperItem
} from '../types';
import * as XLSX from 'xlsx';
import { getSupabaseClient } from '../lib/supabase';
import { Pagination } from './Pagination';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Users,
  X
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Excel export helpers
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
// Local camper resolver
// ═══════════════════════════════════════════════════════════════
const resolveCampers = (sub: RegistrationSubmission): CamperItem[] => {
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
      badgeName: String(sub.data.f_preferred_badge_name || '—'),
      age: String(sub.data.f_dob_age || sub.data.f_age || '—'),
      gradeLevel: String(sub.data.f_academic_level || 'General'),
      gender: String(sub.data.f_gender || '—')
    }
  ];
};

// ═══════════════════════════════════════════════════════════════
// Supabase persistence for camper rows
// ═══════════════════════════════════════════════════════════════
const persistCampers = async (
  submissionId: string,
  eventId: string,
  campers: CamperItem[]
) => {
  const client = getSupabaseClient();
  if (!client) return;

  const { error: delErr } = await client
    .from('campers')
    .delete()
    .eq('submission_id', submissionId);
  if (delErr) {
    console.warn('Supabase campers delete error:', delErr);
    return;
  }

  if (!campers?.length) return;

  const rows = campers.map((c, idx) => ({
    submission_id: submissionId,
    event_id: eventId,
    full_name: c.fullName || 'Unnamed',
    badge_name: c.badgeName || null,
    age: c.age || null,
    grade_level: c.gradeLevel || null,
    gender: c.gender || null,
    sort_order: idx
  }));

  const { error: insErr } = await client.from('campers').insert(rows);
  if (insErr) console.warn('Supabase campers insert error:', insErr);
};

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════
interface EventDataViewProps {
  event: RegistrationEvent;
  submissions: RegistrationSubmission[];
  onBack: () => void;
  onUpdateSubmissionStatus: (
    submissionId: string,
    newStatus: SubmissionStatus
  ) => void;
  onUpdateSubmissionData: (
    submissionId: string,
    updatedData: Record<string, any>,
    updatedNotes?: string,
    updatedStatus?: SubmissionStatus,
    updatedCampers?: CamperItem[]
  ) => void;
  onDeleteSubmission: (submissionId: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export const EventDataView: React.FC<EventDataViewProps> = ({
  event,
  submissions,
  onBack,
  onUpdateSubmissionStatus,
  onUpdateSubmissionData,
  onDeleteSubmission
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inline editor state — one card at a time
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFieldsData, setEditFieldsData] = useState<Record<string, any>>({});
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<SubmissionStatus>('confirmed');
  const [editCampers, setEditCampers] = useState<CamperItem[]>([]);

  const listTopRef = useRef<HTMLDivElement | null>(null);

  // ── Group submissions by church code ──────────────────────
  const groupedSubmissions = useMemo(() => {
    const groups: Record<string, RegistrationSubmission[]> = {};
    
    // Sort ascending first so the "primary" sub is the oldest (to keep church details stable)
    const sortedSubs = [...submissions].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    sortedSubs.forEach(sub => {
      const code = sub.data.church_registration_code || sub.data.f_church_name || sub.id;
      if (!groups[code]) groups[code] = [];
      groups[code].push(sub);
    });

    return Object.values(groups).map(group => {
      const primarySub = group[0];
      const latestSub = group[group.length - 1];
      const allCampers = group.flatMap(sub => resolveCampers(sub));
      
      return {
        id: primarySub.id,
        churchCode: String(primarySub.data.church_registration_code || primarySub.data.f_church_name || primarySub.id),
        primarySub,
        submissions: group,
        allCampers,
        latestDate: new Date(latestSub.submitted_at).getTime()
      };
    }).sort((a, b) => b.latestDate - a.latestDate); // Newest church at top
  }, [submissions]);

  // ── Filter groups ─────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedSubmissions;
    const q = searchQuery.toLowerCase();

    return groupedSubmissions.filter(group => {
      const sub = group.primarySub;
      const church = String(sub.data.f_church_name || sub.data.f_company || '').toLowerCase();
      const pastor = String(sub.data.f_church_pastor || sub.data.f_pastor_fullname || '').toLowerCase();
      const leader = String(sub.data.f_delegation_head_name || sub.data.f_delegation_fullname || sub.data.f_name || '').toLowerCase();
      const campersText = group.allCampers.map(c => `${c.fullName} ${c.badgeName}`).join(' ').toLowerCase();

      return (
        church.includes(q) ||
        pastor.includes(q) ||
        leader.includes(q) ||
        campersText.includes(q)
      );
    });
  }, [groupedSubmissions, searchQuery]);

  // ── Reset to page 1 when filters change ───────────────────
  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  // ── Paginated slice ───────────────────────────────────────
  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);

  // ── Scroll-to-top when page changes ───────────────────────
  useEffect(() => {
    if (listTopRef.current) {
      const top = listTopRef.current.offsetTop - 24;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [page]);

  // ── Derived stats ─────────────────────────────────────────
  const totalCampers = useMemo(
    () => groupedSubmissions.reduce((acc, g) => acc + g.allCampers.length, 0),
    [groupedSubmissions]
  );
  const totalPaid = useMemo(
    () => groupedSubmissions.filter(g => g.submissions.some(s => s.status === 'paid')).length,
    [groupedSubmissions]
  );
  const uniqueChurches = useMemo(
    () => groupedSubmissions.length,
    [groupedSubmissions]
  );

  // ── Edit handlers ─────────────────────────────────────────
  const beginEdit = (sub: RegistrationSubmission) => {
    setEditingRowId(sub.id);
    setEditFieldsData({ ...sub.data });
    setEditNotes(sub.notes || '');
    setEditStatus(sub.status);
    setEditCampers(resolveCampers(sub).map(c => ({ ...c })));
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditFieldsData({});
    setEditNotes('');
    setEditStatus('confirmed');
    setEditCampers([]);
  };

  const updateEditCamper = (
    id: string,
    key: keyof CamperItem,
    val: string
  ) => {
    setEditCampers(prev =>
      prev.map(c => (c.id === id ? { ...c, [key]: val } : c))
    );
  };

  const addEditCamper = () => {
    setEditCampers(prev => [
      ...prev,
      {
        id: `c_edit_${Date.now()}_${prev.length + 1}`,
        fullName: '',
        badgeName: '',
        age: '',
        gradeLevel: 'junior high',
        gender: 'male'
      }
    ]);
  };

  const removeEditCamper = (id: string) => {
    setEditCampers(prev => prev.filter(c => c.id !== id));
  };

  const saveEdit = async (submissionId: string) => {
    onUpdateSubmissionData(
      submissionId,
      editFieldsData,
      editNotes,
      editStatus,
      editCampers.length > 0 ? editCampers : undefined
    );

    try {
      await persistCampers(submissionId, event.id, editCampers);
    } catch (err) {
      console.error('Failed to save campers to Supabase:', err);
    }

    setEditingRowId(null);
  };

  // ── Excel export (this event only, entire filtered set) ───
  const exportXLSX = () => {
    if (filteredGroups.length === 0) {
      alert('No records to export.');
      return;
    }

    // Only custom fields not already shown as dedicated columns
    const extraKeys = Array.from(
      new Set(filteredGroups.flatMap(g => Object.keys(g.primarySub.data)))
    ).filter(k => !EXPORT_HIDDEN_KEYS.has(k));

    const headers = [
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

      const churchCols = [
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

        const campers = resolveCampers(sub);

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
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(
      wb,
      `${event.slug || 'event'}-roster-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fadeIn font-sans text-slate-100">
      {/* ── Header banner ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="space-y-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Events
          </button>

          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest mb-2">
              Per-Event Data
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-3 pt-2 text-xs text-slate-400">
              {event.eventDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {event.eventDate}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={exportXLSX}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition border border-amber-600/30"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel (this event)</span>
        </button>
      </div>

      {/* ── Quick stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Building2 className="w-5 h-5" />}
          label="Churches"
          value={uniqueChurches}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Delegations"
          value={submissions.length} // Counts individual batches
        />
        <StatCard
          icon={<GraduationCap className="w-5 h-5" />}
          label="Total Campers"
          value={totalCampers}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Paid"
          value={totalPaid}
          accent="emerald"
        />
      </div>

      {/* ── Search ───────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search church, pastor, delegation head, or camper name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none placeholder-slate-600"
          />
        </div>
      </div>

      {/* ── Empty states ─────────────────────────────────── */}
      {submissions.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center shadow-sm">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-black text-white">
            No registrations yet
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Share the public form link for this event to start collecting
            delegations.
          </p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center shadow-sm">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-black text-white">
            No matching records
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Try a different search term.
          </p>
        </div>
      ) : (
        <>
          {/* Marker used for scroll-to-top on page change */}
          <div ref={listTopRef} />

          <div className="space-y-6">
            {paginatedGroups.map(group => {
              const sub = group.primarySub;
              const latestSub = group.submissions[group.submissions.length - 1];
              
              const church = String(
                sub.data.f_church_name ||
                  sub.data.f_company ||
                  'Independent Church'
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
              const leaderRole = String(sub.data.f_delegation_role || '');
              const leaderPhone = String(
                sub.data.f_delegation_head_phone ||
                  sub.data.f_delegation_mobile ||
                  sub.data.f_phone ||
                  ''
              );
              const regCode = String(
                sub.data.church_registration_code || ''
              );
              
              const submittedDate = new Date(latestSub.submitted_at).toLocaleString(
                [],
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }
              );

              const isEditing = editingRowId === sub.id;

              return (
                <div
                  key={group.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden"
                >
                  {/* ── Card header ─────────────────────────── */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950/50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-white text-base truncate">
                          {church}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            latestSub.status === 'paid'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                              : latestSub.status === 'checked-in'
                              ? 'bg-gold-300/10 border-gold-300/20 text-gold-300'
                              : latestSub.status === 'pending'
                              ? 'bg-slate-800 border-slate-700 text-slate-400'
                              : latestSub.status === 'cancelled'
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          {latestSub.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Ref #{sub.id.slice(-6)}
                        </span>
                        {group.submissions.length > 1 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">
                            {group.submissions.length} Batches
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{submittedDate}</span>
                      </div>
                    </div>

                    {/* Actions - these edit/delete the LATEST batch */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          onUpdateSubmissionStatus(
                            latestSub.id,
                            latestSub.status === 'paid' ? 'confirmed' : 'paid'
                          )
                        }
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                          latestSub.status === 'paid'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600/30 shadow-sm'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {latestSub.status === 'paid' ? 'Paid' : 'Confirm Pay'}
                        </span>
                      </button>

                      {isEditing ? (
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => beginEdit(latestSub)} // Edit latest batch
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Latest
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Delete this batch?\n\nChurch: ${church}\nCampers in this batch: ${resolveCampers(latestSub).length}\n\nThis also removes these camper rows.`
                            )
                          ) {
                            if (isEditing) cancelEdit();
                            onDeleteSubmission(latestSub.id);
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-red-400 hover:bg-red-950/30 hover:border-red-900/50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Latest
                      </button>
                    </div>
                  </div>

                  {/* ── Detail row ──────────────────────────── */}
                  {!isEditing && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-slate-800">
                        <DetailBlock
                          icon={<Building2 className="w-3.5 h-3.5" />}
                          title="Church Information"
                        >
                          <DetailLine
                            icon={<Building2 className="w-3 h-3" />}
                            label={church}
                            strong
                          />
                          <DetailLine
                            icon={<MapPin className="w-3 h-3" />}
                            label={
                              String(sub.data.f_church_address || '—') +
                              (sub.data.f_city_province
                                ? `, ${sub.data.f_city_province}`
                                : '')
                            }
                          />
                          {regCode && (
                            <div className="flex items-center gap-2 mt-1">
                              <ShieldCheck className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="font-mono font-black text-gold-300 tracking-wider">
                                {regCode}
                              </span>
                            </div>
                          )}
                        </DetailBlock>

                        <DetailBlock
                          icon={<ShieldCheck className="w-3.5 h-3.5" />}
                          title="Pastor"
                        >
                          <DetailLine
                            icon={<User className="w-3 h-3" />}
                            label={pastor || '—'}
                            strong
                          />
                          {sub.data.f_pastor_contact && (
                            <DetailLine
                              icon={<Phone className="w-3 h-3" />}
                              label={String(sub.data.f_pastor_contact)}
                            />
                          )}
                          {sub.data.f_pastor_email && (
                            <DetailLine
                              icon={<Mail className="w-3 h-3" />}
                              label={String(sub.data.f_pastor_email)}
                            />
                          )}
                        </DetailBlock>

                        <DetailBlock
                          icon={<ShieldCheck className="w-3.5 h-3.5" />}
                          title="Delegation Head"
                        >
                          <DetailLine
                            icon={<User className="w-3 h-3" />}
                            label={
                              leader + (leaderRole ? ` (${leaderRole})` : '')
                            }
                            strong
                          />
                          {leaderPhone && (
                            <DetailLine
                              icon={<Phone className="w-3 h-3" />}
                              label={leaderPhone}
                            />
                          )}
                          {sub.data.f_delegation_email && (
                            <DetailLine
                              icon={<Mail className="w-3 h-3" />}
                              label={String(sub.data.f_delegation_email)}
                            />
                          )}
                        </DetailBlock>
                      </div>

                      {/* ── Camper roster (read-only) ──────── */}
                      <div className="px-5 py-4 border-t border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Total Combined Roster ({group.allCampers.length})
                          </p>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-950">
                              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                                <th className="px-3 py-2 font-black">#</th>
                                <th className="px-3 py-2 font-black">
                                  Full Name
                                </th>
                                <th className="px-3 py-2 font-black">
                                  Badge Name
                                </th>
                                <th className="px-3 py-2 font-black">Age</th>
                                <th className="px-3 py-2 font-black">
                                  Grade Level
                                </th>
                                <th className="px-3 py-2 font-black">
                                  Gender
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {group.allCampers.map((c, i) => (
                                <tr
                                  key={c.id || i}
                                  className="hover:bg-slate-800/40"
                                >
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
                                  <td className="px-3 py-2 text-slate-300 uppercase">
                                    {c.gender || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Inline editor (Edits the LATEST batch) ─────────────────────── */}
                  {isEditing && (
                    <div className="p-5 space-y-5">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 mb-2">
                        You are editing the most recent batch (Ref #{latestSub.id.slice(-6)}) for this church.
                      </div>

                      {/* Status + notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Registration Status
                          </label>
                          <select
                            value={editStatus}
                            onChange={e =>
                              setEditStatus(
                                e.target.value as SubmissionStatus
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none font-bold"
                          >
                            <option value="paid">Paid (Payment Verified)</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked-in">Checked-In</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Organizer Notes
                          </label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="e.g. Paid cash at church, GCash ref #..."
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none placeholder-slate-600"
                          />
                        </div>
                      </div>

                      {/* Delegation fields */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Delegation Fields
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(editFieldsData).map(
                            ([key, value]) => {
                              if (key === 'campers') return null;
                              return (
                                <div key={key} className="space-y-1">
                                  <label className="block text-[11px] font-bold text-slate-400 capitalize">
                                    {key
                                      .replace(/^f_/, '')
                                      .replace(/_/g, ' ')}
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      Array.isArray(value)
                                        ? value.join(', ')
                                        : String(value ?? '')
                                    }
                                    onChange={e =>
                                      setEditFieldsData({
                                        ...editFieldsData,
                                        [key]: e.target.value
                                      })
                                    }
                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                                  />
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* ── Camper roster editor (TABLE) ──── */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Batch Roster ({editCampers.length})
                          </h4>
                          <button
                            type="button"
                            onClick={addEditCamper}
                            className="flex items-center gap-1 text-xs text-white font-bold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 transition"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Camper
                          </button>
                        </div>

                        {editCampers.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
                            <p className="text-xs text-slate-500 italic">
                              No campers yet. Click "Add Camper" to add one.
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs min-w-[820px]">
                                <thead className="bg-slate-950">
                                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                                    <th className="px-3 py-2 font-black w-12">
                                      #
                                    </th>
                                    <th className="px-3 py-2 font-black min-w-[200px]">
                                      Full Name
                                    </th>
                                    <th className="px-3 py-2 font-black min-w-[160px]">
                                      Badge Name
                                    </th>
                                    <th className="px-3 py-2 font-black w-24">
                                      Age
                                    </th>
                                    <th className="px-3 py-2 font-black min-w-[140px]">
                                      Grade Level
                                    </th>
                                    <th className="px-3 py-2 font-black min-w-[120px]">
                                      Gender
                                    </th>
                                    <th className="px-3 py-2 font-black w-20 text-right">
                                      {/* actions */}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                  {editCampers.map((c, idx) => (
                                    <tr
                                      key={c.id}
                                      className="hover:bg-slate-800/40"
                                    >
                                      <td className="px-3 py-2 text-slate-500 font-mono align-middle">
                                        {idx + 1}
                                      </td>
                                      <td className="px-3 py-2 align-middle">
                                        <input
                                          type="text"
                                          value={c.fullName}
                                          placeholder="Full Name"
                                          onChange={e =>
                                            updateEditCamper(
                                              c.id,
                                              'fullName',
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none placeholder-slate-600"
                                        />
                                      </td>
                                      <td className="px-3 py-2 align-middle">
                                        <input
                                          type="text"
                                          value={c.badgeName}
                                          placeholder="Badge Name"
                                          onChange={e =>
                                            updateEditCamper(
                                              c.id,
                                              'badgeName',
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none placeholder-slate-600"
                                        />
                                      </td>
                                      <td className="px-3 py-2 align-middle">
                                        <input
                                          type="number"
                                          min="1"
                                          max="99"
                                          value={c.age}
                                          placeholder="Age"
                                          onChange={e =>
                                            updateEditCamper(
                                              c.id,
                                              'age',
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none placeholder-slate-600"
                                        />
                                      </td>
                                      <td className="px-3 py-2 align-middle">
                                        <select
                                          value={c.gradeLevel}
                                          onChange={e =>
                                            updateEditCamper(
                                              c.id,
                                              'gradeLevel',
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:border-amber-500 focus:outline-none"
                                        >
                                          <option value="elementary">
                                            Elementary
                                          </option>
                                          <option value="junior high">
                                            Junior High
                                          </option>
                                          <option value="senior high">
                                            Senior High
                                          </option>
                                          <option value="college">
                                            College
                                          </option>
                                          <option value="working">
                                            Working / Professional
                                          </option>
                                        </select>
                                      </td>
                                      <td className="px-3 py-2 align-middle">
                                        <select
                                          value={c.gender}
                                          onChange={e =>
                                            updateEditCamper(
                                              c.id,
                                              'gender',
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:border-amber-500 focus:outline-none"
                                        >
                                          <option value="male">Male</option>
                                          <option value="female">Female</option>
                                        </select>
                                      </td>
                                      <td className="px-3 py-2 align-middle text-right">
                                        <button
                                          type="button"
                                          onClick={() => removeEditCamper(c.id)}
                                          title="Remove camper"
                                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-red-400 hover:bg-red-950/30 hover:border-red-900/50 transition"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(sub.id)}
                          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md border border-amber-600/30"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes to Latest Batch
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Pagination ────────────────────────────────── */}
          <Pagination
            totalItems={filteredGroups.length}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={editingRowId !== null}
            itemLabel="churches"
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Small presentational helpers
// ═══════════════════════════════════════════════════════════════
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: 'emerald' | 'default';
}> = ({ icon, label, value, accent = 'default' }) => {
  const isEmerald = accent === 'emerald';
  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
      <div
        className={`p-2.5 rounded-xl ${
          isEmerald
            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            : 'bg-slate-800 text-gold-300'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div
          className={`text-xl font-black ${
            isEmerald ? 'text-amber-500' : 'text-white'
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

const DetailBlock: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="p-5 space-y-2">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
      {icon}
      {title}
    </p>
    <div className="space-y-1 text-xs text-slate-300">{children}</div>
  </div>
);

const DetailLine: React.FC<{
  icon: React.ReactNode;
  label: string;
  strong?: boolean;
}> = ({ icon, label, strong }) => (
  <div className="flex items-start gap-2">
    <span className="text-slate-500 mt-0.5 shrink-0">{icon}</span>
    <span
      className={
        strong ? 'font-semibold text-white break-words' : 'break-words'
      }
    >
      {label}
    </span>
  </div>
);

export default EventDataView;