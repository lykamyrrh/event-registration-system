import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RegistrationEvent,
  RegistrationSubmission,
  SubmissionStatus,
  CamperItem
} from '../types';
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

  // Used to scroll back to the top of the list when the page changes
  const listTopRef = useRef<HTMLDivElement | null>(null);

  // ── Filter submissions ────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return submissions;
    const q = searchQuery.toLowerCase();

    return submissions.filter(sub => {
      const church = String(
        sub.data.f_church_name || sub.data.f_company || ''
      ).toLowerCase();
      const pastor = String(
        sub.data.f_church_pastor || sub.data.f_pastor_fullname || ''
      ).toLowerCase();
      const leader = String(
        sub.data.f_delegation_head_name ||
          sub.data.f_delegation_fullname ||
          sub.data.f_name ||
          ''
      ).toLowerCase();
      const campersText = resolveCampers(sub)
        .map(c => `${c.fullName} ${c.badgeName}`)
        .join(' ')
        .toLowerCase();

      return (
        church.includes(q) ||
        pastor.includes(q) ||
        leader.includes(q) ||
        campersText.includes(q)
      );
    });
  }, [submissions, searchQuery]);

  // ── Reset to page 1 when filters change ───────────────────
  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  // ── Paginated slice ───────────────────────────────────────
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ── Scroll-to-top when page changes ───────────────────────
  useEffect(() => {
    if (listTopRef.current) {
      const top = listTopRef.current.offsetTop - 24;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ── Derived stats (full set, not paginated) ───────────────
  const totalCampers = useMemo(
    () => submissions.reduce((acc, s) => acc + resolveCampers(s).length, 0),
    [submissions]
  );
  const totalPaid = useMemo(
    () => submissions.filter(s => s.status === 'paid').length,
    [submissions]
  );
  const uniqueChurches = useMemo(
    () =>
      new Set(
        submissions.map(s =>
          String(s.data.f_church_name || s.data.f_company || '')
        )
      ).size,
    [submissions]
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

  // ── CSV export (this event only, entire filtered set) ─────
  const exportCSV = () => {
    if (filtered.length === 0) {
      alert('No records to export.');
      return;
    }

    const dataKeys = Array.from(
      new Set(filtered.flatMap(s => Object.keys(s.data)))
    );

    const headers = [
      'Submission ID',
      'Church Name',
      'Registration Code',
      'Pastor',
      'Pastor Contact',
      'Pastor Email',
      'Delegation Head',
      'Delegation Role',
      'Delegation Mobile',
      'Delegation Email',
      'Status',
      'Notes',
      'Submitted At',
      'Camper #',
      'Camper Full Name',
      'Camper Badge',
      'Camper Age',
      'Camper Grade Level',
      'Camper Gender',
      ...dataKeys
    ];

    const csvRows = [headers.join(',')];

    filtered.forEach(sub => {
      const campers = resolveCampers(sub);
      const shared = [
        `"${sub.id}"`,
        `"${String(sub.data.f_church_name || '').replace(/"/g, '""')}"`,
        `"${String(sub.data.church_registration_code || '').replace(/"/g, '""')}"`,
        `"${String(sub.data.f_pastor_fullname || sub.data.f_church_pastor || '').replace(/"/g, '""')}"`,
        `"${String(sub.data.f_pastor_contact || '').replace(/"/g, '""')}"`,
        `"${String(sub.data.f_pastor_email || '').replace(/"/g, '""')}"`,
        `"${String(sub.data.f_delegation_fullname || '').replace(/"/g, '""')}"`,
        `"${String(sub.data.f_delegation_role || '').replace(/"/g, '""')}"`,
        `"${String(sub.data.f_delegation_mobile || '').replace(/"/g, '""')}"`,
        `"${String(sub.data.f_delegation_email || '').replace(/"/g, '""')}"`,
        `"${sub.status}"`,
        `"${(sub.notes || '').replace(/"/g, '""')}"`,
        `"${new Date(sub.submitted_at).toLocaleString()}"`
      ];

      campers.forEach((c, idx) => {
        const camperCells = [
          `"${idx + 1}"`,
          `"${(c.fullName || '').replace(/"/g, '""')}"`,
          `"${(c.badgeName || '').replace(/"/g, '""')}"`,
          `"${(c.age || '').replace(/"/g, '""')}"`,
          `"${(c.gradeLevel || '').replace(/"/g, '""')}"`,
          `"${(c.gender || '').replace(/"/g, '""')}"`
        ];

        const extras = dataKeys.map(key => {
          const val = sub.data[key];
          const str = Array.isArray(val) ? val.join('; ') : String(val ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        });

        csvRows.push([...shared, ...camperCells, ...extras].join(','));
      });

      if (campers.length === 0) {
        const emptyCamper = ['""', '""', '""', '""', '""', '""'];
        const extras = dataKeys.map(() => '""');
        csvRows.push([...shared, ...emptyCamper, ...extras].join(','));
      }
    });

    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${event.slug || 'event'}-roster-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fadeIn font-sans text-navy-900">
      {/* ── Header banner ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-navy-200 shadow-sm">
        <div className="space-y-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900/70 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Events
          </button>

          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-gold-100 border border-navy-200 text-navy-900 text-[10px] font-black uppercase tracking-widest mb-2">
              Per-Event Data
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-3 pt-2 text-xs text-navy-900/70">
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
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 hover:text-white text-navy-950 font-bold text-sm shadow-md transition border border-gold-600/30"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV (this event)</span>
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
          value={submissions.length}
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
      <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-navy-900/60 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search church, pastor, delegation head, or camper name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none placeholder-navy-900/50"
          />
        </div>
      </div>

      {/* ── Empty states ─────────────────────────────────── */}
      {submissions.length === 0 ? (
        <div className="rounded-2xl bg-white border border-navy-200 p-12 text-center shadow-sm">
          <Users className="w-10 h-10 text-navy-900/40 mx-auto mb-3" />
          <h3 className="text-lg font-black text-navy-900">
            No registrations yet
          </h3>
          <p className="text-sm text-navy-900/60 mt-1 max-w-md mx-auto">
            Share the public form link for this event to start collecting
            delegations.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-navy-200 p-12 text-center shadow-sm">
          <Search className="w-10 h-10 text-navy-900/40 mx-auto mb-3" />
          <h3 className="text-lg font-black text-navy-900">
            No matching records
          </h3>
          <p className="text-sm text-navy-900/60 mt-1">
            Try a different search term.
          </p>
        </div>
      ) : (
        <>
          {/* Marker used for scroll-to-top on page change */}
          <div ref={listTopRef} />

          <div className="space-y-6">
            {paginated.map(sub => {
              const campers = resolveCampers(sub);
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
              const submittedDate = new Date(sub.submitted_at).toLocaleString(
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
                  key={sub.id}
                  className="rounded-2xl bg-white border border-navy-200 shadow-sm overflow-hidden"
                >
                  {/* ── Card header ─────────────────────────── */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-navy-100 bg-ivory-dark">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-navy-900 text-base truncate">
                          {church}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            sub.status === 'paid'
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                              : sub.status === 'checked-in'
                              ? 'bg-purple-100 border-purple-300 text-purple-900'
                              : sub.status === 'pending'
                              ? 'bg-gold-100 border-gold-300 text-gold-900'
                              : sub.status === 'cancelled'
                              ? 'bg-rose-100 border-rose-300 text-rose-900'
                              : 'bg-gold-100 border-navy-200 text-navy-900'
                          }`}
                        >
                          {sub.status}
                        </span>
                        <span className="text-[11px] text-navy-900/60 font-mono">
                          Ref #{sub.id.slice(-6)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-navy-900/60">
                        <Clock className="w-3 h-3" />
                        <span>{submittedDate}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          onUpdateSubmissionStatus(
                            sub.id,
                            sub.status === 'paid' ? 'confirmed' : 'paid'
                          )
                        }
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                          sub.status === 'paid'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-gold-500 hover:bg-gold-600 hover:text-white text-navy-950 border-gold-600/30 shadow-sm'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {sub.status === 'paid' ? 'Paid' : 'Confirm Pay'}
                        </span>
                      </button>

                      {isEditing ? (
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-navy-200 hover:bg-ivory"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => beginEdit(sub)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-navy-200 hover:bg-gold-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Delete this delegation?\n\nChurch: ${church}\nCampers: ${campers.length}\n\nThis also removes all camper rows and cannot be undone.`
                            )
                          ) {
                            if (isEditing) cancelEdit();
                            onDeleteSubmission(sub.id);
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-navy-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* ── Detail row ──────────────────────────── */}
                  {!isEditing && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-navy-100">
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
                              <ShieldCheck className="w-3 h-3 text-navy-900/50 shrink-0" />
                              <span className="font-mono font-black text-gold-700 tracking-wider">
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

                      {/* ── Camper roster ──────────────────── */}
                      <div className="px-5 py-4 border-t border-navy-100">
                        <div className="flex items-center justify-between mb-3">
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
                            <tbody className="divide-y divide-navy-100">
                              {campers.map((c, i) => (
                                <tr
                                  key={c.id || i}
                                  className="hover:bg-gold-50/40"
                                >
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
                    </>
                  )}

                  {/* ── Inline editor ─────────────────────── */}
                  {isEditing && (
                    <div className="p-5 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-ivory border border-navy-200">
                        <div>
                          <label className="block text-xs font-bold text-navy-900 mb-1">
                            Registration Status
                          </label>
                          <select
                            value={editStatus}
                            onChange={e =>
                              setEditStatus(
                                e.target.value as SubmissionStatus
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none font-bold"
                          >
                            <option value="paid">Paid (Payment Verified)</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked-in">Checked-In</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-navy-900 mb-1">
                            Organizer Notes
                          </label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="e.g. Paid cash at church, GCash ref #..."
                            className="w-full px-3 py-2 rounded-xl bg-white border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-ivory border border-navy-200 space-y-3">
                        <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                          Delegation Fields
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(editFieldsData).map(
                            ([key, value]) => {
                              if (key === 'campers') return null;
                              return (
                                <div key={key} className="space-y-1">
                                  <label className="block text-[11px] font-bold text-navy-900/70 capitalize">
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
                                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs focus:border-gold-500 focus:outline-none"
                                  />
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-ivory border border-navy-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                            Camper Roster ({editCampers.length})
                          </h4>
                          <button
                            type="button"
                            onClick={addEditCamper}
                            className="flex items-center gap-1 text-xs text-navy-900 font-bold bg-white px-2.5 py-1 rounded-lg border border-navy-200 hover:bg-gold-100"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Camper
                          </button>
                        </div>

                        {editCampers.length === 0 ? (
                          <p className="text-xs text-navy-900/50 italic text-center py-3">
                            No campers yet. Click "Add Camper" to add one.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {editCampers.map((c, idx) => (
                              <div
                                key={c.id}
                                className="p-3.5 rounded-xl bg-white border border-navy-200 space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs font-bold text-navy-900">
                                  <span>Camper #{idx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeEditCamper(c.id)}
                                    className="text-rose-700 text-[11px] font-semibold hover:text-rose-900"
                                  >
                                    Remove
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                                    className="px-2.5 py-1.5 rounded-lg bg-ivory border border-navy-200 text-navy-900 text-xs"
                                  />
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
                                    className="px-2.5 py-1.5 rounded-lg bg-ivory border border-navy-200 text-navy-900 text-xs"
                                  />
                                  <input
                                    type="number"
                                    value={c.age}
                                    placeholder="Age"
                                    onChange={e =>
                                      updateEditCamper(
                                        c.id,
                                        'age',
                                        e.target.value
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-ivory border border-navy-200 text-navy-900 text-xs"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <select
                                    value={c.gradeLevel}
                                    onChange={e =>
                                      updateEditCamper(
                                        c.id,
                                        'gradeLevel',
                                        e.target.value
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-ivory border border-navy-200 text-navy-900 text-xs font-medium"
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
                                    <option value="college">College</option>
                                    <option value="working">
                                      Working / Professional
                                    </option>
                                  </select>
                                  <select
                                    value={c.gender}
                                    onChange={e =>
                                      updateEditCamper(
                                        c.id,
                                        'gender',
                                        e.target.value
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-ivory border border-navy-200 text-navy-900 text-xs font-medium"
                                  >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-5 py-2 rounded-xl bg-white border border-navy-200 text-navy-900 font-bold text-sm hover:bg-ivory"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(sub.id)}
                          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-sm shadow-md border border-gold-600/30"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
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
            totalItems={filtered.length}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={editingRowId !== null}
            itemLabel="delegations"
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
    <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-sm flex items-center gap-3">
      <div
        className={`p-2.5 rounded-xl ${
          isEmerald
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-gold-100 text-navy-900'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs text-navy-900/70">{label}</div>
        <div
          className={`text-xl font-black ${
            isEmerald ? 'text-emerald-800' : 'text-navy-900'
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
    <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60 flex items-center gap-1.5">
      {icon}
      {title}
    </p>
    <div className="space-y-1 text-xs text-navy-900/80">{children}</div>
  </div>
);

const DetailLine: React.FC<{
  icon: React.ReactNode;
  label: string;
  strong?: boolean;
}> = ({ icon, label, strong }) => (
  <div className="flex items-start gap-2">
    <span className="text-navy-900/50 mt-0.5 shrink-0">{icon}</span>
    <span
      className={
        strong ? 'font-semibold text-navy-900 break-words' : 'break-words'
      }
    >
      {label}
    </span>
  </div>
);

export default EventDataView;