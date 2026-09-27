import React, { useState, useMemo } from 'react';
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
  Trash2,
  Eye,
  EyeOff,
  X,
  Calendar,
  FileSpreadsheet,
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Users,
  Link2,
  UserPlus,
  Save,
  ChevronDown,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck
} from 'lucide-react';

interface SubmissionsViewProps {
  events: RegistrationEvent[];
  submissions: RegistrationSubmission[];
  selectedEventId?: string;
  onUpdateSubmissionStatus: (submissionId: string, newStatus: SubmissionStatus) => void;
  onUpdateSubmissionData: (
    submissionId: string,
    updatedData: Record<string, any>,
    updatedNotes?: string,
    updatedStatus?: SubmissionStatus,
    updatedCampers?: CamperItem[]
  ) => void;
  onDeleteSubmission: (submissionId: string) => void;
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({
  events,
  submissions,
  selectedEventId: initialSelectedEventId,
  onUpdateSubmissionStatus,
  onUpdateSubmissionData,
  onDeleteSubmission
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialSelectedEventId || 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [churchFilter, setChurchFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [academicFilter, setAcademicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline expanded row(s) — allow one open at a time.
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  // Inline edit mode — only one row editable at a time.
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Inline edit form state
  const [editFieldsData, setEditFieldsData] = useState<Record<string, any>>({});
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<SubmissionStatus>('confirmed');
  const [editCampers, setEditCampers] = useState<CamperItem[]>([]);

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
      if (selectedEventId !== 'all' && sub.eventId !== selectedEventId) return false;
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

      if (churchFilter !== 'all') {
        const subChurch = String(sub.data.f_church_name || sub.data.f_company || '');
        if (subChurch !== churchFilter) return false;
      }

      if (roleFilter !== 'all') {
        const subRole = String(
          sub.data.f_attendee_role || sub.data.f_role || ''
        ).toLowerCase();
        const camperRoles = (sub.campers || []).map(() => 'camper').join(' ');
        const combined = `${subRole} ${camperRoles}`;
        if (roleFilter === 'camper' && !combined.includes('camper')) return false;
        if (roleFilter === 'pastor' && !combined.includes('pastor')) return false;
        if (
          roleFilter === 'delegation_head' &&
          !combined.includes('delegation head') &&
          !combined.includes('leader')
        )
          return false;
        if (roleFilter === 'youth_director' && !combined.includes('youth director'))
          return false;
      }

      if (academicFilter !== 'all') {
        const subLevel = String(sub.data.f_academic_level || '');
        const camperLevels = (sub.campers || [])
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
        const campersText = (sub.campers || [])
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
    (acc, sub) => acc + (sub.campers ? sub.campers.length : 1),
    0
  );

  const totalPaidCount = filteredSubmissions.filter(s => s.status === 'paid').length;

  // ── Inline editing ────────────────────────────────────────
  const handleToggleEdit = (sub: RegistrationSubmission) => {
    if (editingRowId === sub.id) {
      setEditingRowId(null);
      return;
    }
    setExpandedRowId(sub.id);
    setEditingRowId(sub.id);
    setEditFieldsData({ ...sub.data });
    setEditNotes(sub.notes || '');
    setEditStatus(sub.status);
    setEditCampers(sub.campers ? sub.campers.map(c => ({ ...c })) : []);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFieldsData({});
    setEditNotes('');
    setEditStatus('confirmed');
    setEditCampers([]);
  };

  const handleUpdateEditCamper = (
    id: string,
    key: keyof CamperItem,
    val: string
  ) => {
    setEditCampers(prev =>
      prev.map(c => (c.id === id ? { ...c, [key]: val } : c))
    );
  };

  const handleAddEditCamper = () => {
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

  const handleRemoveEditCamper = (id: string) => {
    setEditCampers(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveEdit = (submissionId: string) => {
    onUpdateSubmissionData(
      submissionId,
      editFieldsData,
      editNotes,
      editStatus,
      editCampers.length > 0 ? editCampers : undefined
    );
    setEditingRowId(null);
  };

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
        const head = String(
          s.data.f_delegation_head_name ||
            s.data.f_delegation_fullname ||
            s.data.f_name ||
            'Leader'
        );
        const roster = s.campers
          ? s.campers
              .map(
                c =>
                  `${c.fullName} (${c.badgeName}, Age ${c.age}, ${c.gradeLevel})`
              )
              .join('; ')
          : 'Single Registrant';

        const row = [
          `"${s.id}"`,
          `"${ev?.title.replace(/"/g, '""') || 'Unknown Event'}"`,
          `"${church.replace(/"/g, '""')}"`,
          `"${head.replace(/"/g, '""')}"`,
          `"${roster.replace(/"/g, '""')}"`,
          `"${s.status}"`,
          `"${(s.notes || '').replace(/"/g, '""')}"`,
          `"${new Date(s.submitted_at).toLocaleString()}"`,
          ...dataKeys.map(key => {
            const val = s.data[key];
            const strVal = Array.isArray(val) ? val.join('; ') : String(val ?? '');
            return `"${strVal.replace(/"/g, '""')}"`;
          })
        ];
        return row.join(',');
      })
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
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

  // ── Camper fallback (single registrant) ───────────────────
  const getCampersForSubmission = (sub: RegistrationSubmission): CamperItem[] => {
    if (sub.campers && sub.campers.length > 0) return sub.campers;
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

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fadeIn font-sans text-navy-900">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-navy-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-100 border border-navy-200 text-navy-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Table className="w-3.5 h-3.5 text-navy-900" />
            Organizer Master Foresee Table
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900">
            Unified Delegations <span className="text-gold-600">Data Table</span>
          </h1>
          <p className="text-navy-900/70 text-sm mt-1">
            Click any row to expand the church, delegation, and camper roster details.
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
           
          </div>
          <div>
            <div className="text-xs text-navy-900/70">Confirmed Paid</div>
            <div className="text-xl font-black text-emerald-800">{totalPaidCount}</div>
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
            <div className="text-xl font-black text-navy-900">{totalCampersInView}</div>
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
                  {ev.title} ({submissions.filter(s => s.eventId === ev.id).length})
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
              <option value="all">All Churches ({availableChurches.length})</option>
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
                <th className="px-3 py-3.5 w-10"></th>
                <th className="px-5 py-3.5">Church & Delegation</th>
                <th className="px-5 py-3.5">Camper Roster Listing</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Organizer Notes</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Main Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-navy-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-navy-900/70"
                  >
                    <AlertCircle className="w-8 h-8 text-navy-900/40 mx-auto mb-2" />
                    No pre-registration records match the current filter selection.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map(sub => {
                  const ev = getEvent(sub.eventId);
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

                  const campersList = getCampersForSubmission(sub);

                  const submittedDate = new Date(sub.submitted_at).toLocaleString(
                    [],
                    {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }
                  );

                  const isExpanded = expandedRowId === sub.id;
                  const isEditing = editingRowId === sub.id;

                  return (
                    <React.Fragment key={sub.id}>
                      {/* ── MAIN ROW ──────────────────────────── */}
                      <tr
                        className={`transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-gold-50 border-l-4 border-gold-500'
                            : 'odd:bg-white even:bg-ivory hover:bg-gold-50'
                        }`}
                        onClick={() => {
                          if (isEditing) return;
                          setExpandedRowId(isExpanded ? null : sub.id);
                        }}
                      >
                        {/* Expand chevron */}
                        <td className="px-3 py-4 align-top">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gold-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-navy-900/50" />
                          )}
                        </td>

                        {/* Part 1: Church & Delegation */}
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
                            Ref #{sub.id.slice(-6)}
                          </div>
                        </td>

                        {/* Part 2: Camper summary */}
                        <td className="px-5 py-4 align-top">
                          <div className="space-y-2 max-w-md">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold-100 border border-navy-200 text-navy-900">
                              {campersList.length} Camper
                              {campersList.length !== 1 ? 's' : ''}
                            </span>
                            <div className="text-[11px] text-navy-900/70 italic">
                              Click row to expand full roster
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
                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
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

                        {/* Actions */}
                        <td
                          className="px-5 py-4 align-top text-right"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                onUpdateSubmissionStatus(
                                  sub.id,
                                  sub.status === 'paid' ? 'confirmed' : 'paid'
                                )
                              }
                              title={
                                sub.status === 'paid'
                                  ? 'Mark as Unpaid'
                                  : 'Confirm Payment (Set Paid)'
                              }
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                                sub.status === 'paid'
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                                  : 'bg-gold-500 hover:bg-gold-600 hover:text-white text-navy-950 border-gold-600/30 shadow-sm'
                              }`}
                            >
                             
                              <span>{sub.status === 'paid' ? 'Paid' : 'Confirm Pay'}</span>
                            </button>

                            <button
                              onClick={() => handleToggleEdit(sub)}
                              className={`p-1.5 rounded-lg border transition ${
                                isEditing
                                  ? 'bg-gold-500 border-gold-600 text-navy-950'
                                  : 'bg-white border-navy-200 text-navy-900 hover:bg-gold-100'
                              }`}
                              title={isEditing ? 'Cancel Edit' : 'Edit Record Details'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                if (isEditing) {
                                  handleCancelEdit();
                                }
                                setExpandedRowId(isExpanded ? null : sub.id);
                              }}
                              className="p-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 hover:bg-gold-100"
                              title={isExpanded ? 'Hide Details' : 'View Full Record'}
                            >
                              {isExpanded ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              onClick={() => onDeleteSubmission(sub.id)}
                              className="p-1.5 rounded-lg bg-white border border-navy-200 text-navy-900/70 hover:text-rose-700 hover:border-rose-300"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── EXPANDED DETAIL / EDIT PANEL ─────── */}
                      {isExpanded && (
                        <tr className="bg-gold-50/60">
                          <td colSpan={7} className="px-5 py-5">
                            {isEditing ? (
                              /* ── INLINE EDITOR ─────────── */
                              <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-black text-navy-900 flex items-center gap-2">
                                    <Edit3 className="w-4 h-4 text-gold-600" />
                                    Editing Record #{sub.id.slice(-6)}
                                  </h3>
                                  <span className="text-xs text-navy-900/60">
                                    Event: {ev?.title || 'Unknown'}
                                  </span>
                                </div>

                                {/* Status + Notes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white border border-navy-200">
                                  <div>
                                    <label className="block text-xs font-bold text-navy-900 mb-1">
                                      Registration Status
                                    </label>
                                    <select
                                      value={editStatus}
                                      onChange={e =>
                                        setEditStatus(e.target.value as SubmissionStatus)
                                      }
                                      className="w-full px-3 py-2 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none font-bold"
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
                                      className="w-full px-3 py-2 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Part 1 editable fields */}
                                <div className="p-4 rounded-2xl bg-white border border-navy-200 space-y-3">
                                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                                    Part 1: Church & Delegation Head Details
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(editFieldsData).map(([key, value]) => {
                                      // Skip the campers array — that's edited below
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
                                            className="w-full px-3 py-1.5 rounded-lg bg-ivory border border-navy-200 text-navy-900 text-xs focus:border-gold-500 focus:outline-none"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Part 2 campers editor */}
                                <div className="p-4 rounded-2xl bg-white border border-navy-200 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                                      Part 2: Camper Roster ({editCampers.length})
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={handleAddEditCamper}
                                      className="flex items-center gap-1 text-xs text-navy-900 font-bold bg-ivory px-2.5 py-1 rounded-lg border border-navy-200 hover:bg-gold-100"
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
                                          className="p-3.5 rounded-xl bg-ivory border border-navy-200 space-y-2"
                                        >
                                          <div className="flex items-center justify-between text-xs font-bold text-navy-900">
                                            <span>Camper #{idx + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleRemoveEditCamper(c.id)
                                              }
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
                                                handleUpdateEditCamper(
                                                  c.id,
                                                  'fullName',
                                                  e.target.value
                                                )
                                              }
                                              className="px-2.5 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs"
                                            />
                                            <input
                                              type="text"
                                              value={c.badgeName}
                                              placeholder="Badge Name"
                                              onChange={e =>
                                                handleUpdateEditCamper(
                                                  c.id,
                                                  'badgeName',
                                                  e.target.value
                                                )
                                              }
                                              className="px-2.5 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs"
                                            />
                                            <input
                                              type="number"
                                              value={c.age}
                                              placeholder="Age"
                                              onChange={e =>
                                                handleUpdateEditCamper(
                                                  c.id,
                                                  'age',
                                                  e.target.value
                                                )
                                              }
                                              className="px-2.5 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs"
                                            />
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <select
                                              value={c.gradeLevel}
                                              onChange={e =>
                                                handleUpdateEditCamper(
                                                  c.id,
                                                  'gradeLevel',
                                                  e.target.value
                                                )
                                              }
                                              className="px-2.5 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs font-medium"
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
                                                handleUpdateEditCamper(
                                                  c.id,
                                                  'gender',
                                                  e.target.value
                                                )
                                              }
                                              className="px-2.5 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs font-medium"
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
                                    onClick={handleCancelEdit}
                                    className="px-5 py-2 rounded-xl bg-white border border-navy-200 text-navy-900 font-bold text-sm hover:bg-ivory"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(sub.id)}
                                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-sm shadow-md border border-gold-600/30"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                  </button>
                                </div>
                              </div>
                            ) : (
                             
                                <div className="space-y-5">
                                  {/* ── UNIFIED CHURCH + LEADERSHIP CARD ─── */}
                                  <div className="p-4 bg-white rounded-2xl border border-navy-200">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:divide-x md:divide-navy-100">
                                      
                                      {/* Column 1: Church Information */}
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

                                      {/* Column 2: Pastor */}
                                      <div className="space-y-2 md:px-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60 flex items-center gap-1.5">
                                          <ShieldCheck className="w-3.5 h-3.5" />
                                          Pastor
                                        </p>
                                        <div className="space-y-1 text-xs text-navy-900/80">
                                          <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-navy-900/50 shrink-0" />
                                            <span className="font-semibold text-navy-900">{pastor || '—'}</span>
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
                                              <span className="truncate">{String(sub.data.f_pastor_email)}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Column 3: Delegation Head */}
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
                                                  {' '}({String(sub.data.f_delegation_role)})
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
                                {/* Extra custom fields (skip known ones + campers) */}
                                {(() => {
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
                                  const extras = Object.entries(sub.data).filter(
                                    ([k]) => !known.has(k)
                                  );
                                  if (extras.length === 0) return null;
                                  return (
                                    <div className="p-4 bg-white rounded-2xl border border-navy-200 space-y-3">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60">
                                        Additional Fields
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {extras.map(([key, val]) => (
                                          <div key={key} className="space-y-0.5">
                                            <span className="text-[10px] font-bold text-navy-900/60 uppercase tracking-wider capitalize">
                                              {key
                                                .replace(/^f_/, '')
                                                .replace(/_/g, ' ')}
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
                                                  <span className="truncate">
                                                    {String(val)}
                                                  </span>
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
                                  );
                                })()}

                                {/* Camper roster table */}
                                <div className="p-4 bg-white rounded-2xl border border-navy-200 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-navy-900/60 flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5" />
                                      Camper Roster ({campersList.length})
                                    </p>
                                    <span className="text-[10px] text-navy-900/50">
                                      Event: {ev?.title || 'Unknown'}
                                    </span>
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
                                        {campersList.map((c, i) => (
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
                                                    : 'bg-pink-50 text-pink-700 border border-pink-200'
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
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};