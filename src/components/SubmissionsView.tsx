import React, { useState } from 'react';
import { RegistrationEvent, RegistrationSubmission, SubmissionStatus, CamperItem } from '../types';
import { 
  Table, 
  Search, 
  Download, 
  Clock, 
  Trash2, 
  Eye, 
  X, 
  Calendar, 
  FileSpreadsheet,
  AlertCircle,
  Building2,
  DollarSign,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Users,
  Link2,
  UserPlus
} from 'lucide-react';

interface SubmissionsViewProps {
  events: RegistrationEvent[];
  submissions: RegistrationSubmission[];
  selectedEventId?: string;
  onUpdateSubmissionStatus: (submissionId: string, newStatus: SubmissionStatus) => void;
  onUpdateSubmissionData: (submissionId: string, updatedData: Record<string, any>, updatedNotes?: string, updatedStatus?: SubmissionStatus, updatedCampers?: CamperItem[]) => void;
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
  const [selectedEventId, setSelectedEventId] = useState<string>(initialSelectedEventId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [churchFilter, setChurchFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [academicFilter, setAcademicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Record Modals
  const [viewRecord, setViewRecord] = useState<RegistrationSubmission | null>(null);
  const [editingRecord, setEditingRecord] = useState<RegistrationSubmission | null>(null);

  // Editable record form state
  const [editFieldsData, setEditFieldsData] = useState<Record<string, any>>({});
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<SubmissionStatus>('confirmed');
  const [editCampers, setEditCampers] = useState<CamperItem[]>([]);

  // Extract unique Church Names across all submissions
  const availableChurches = Array.from(
    new Set(
      submissions
        .map(s => String(s.data.f_church_name || s.data.f_company || ''))
        .filter(Boolean)
    )
  );

  // Filter Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (selectedEventId !== 'all' && sub.eventId !== selectedEventId) return false;
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

    if (churchFilter !== 'all') {
      const subChurch = String(sub.data.f_church_name || sub.data.f_company || '');
      if (subChurch !== churchFilter) return false;
    }

    if (roleFilter !== 'all') {
      const subRole = String(sub.data.f_attendee_role || sub.data.f_role || '').toLowerCase();
      const camperRoles = (sub.campers || []).map(c => 'camper').join(' ');
      const combined = `${subRole} ${camperRoles}`;
      if (roleFilter === 'camper' && !combined.includes('camper')) return false;
      if (roleFilter === 'pastor' && !combined.includes('pastor')) return false;
      if (roleFilter === 'delegation_head' && !combined.includes('delegation head') && !combined.includes('leader')) return false;
      if (roleFilter === 'youth_director' && !combined.includes('youth director')) return false;
    }

    if (academicFilter !== 'all') {
      const subLevel = String(sub.data.f_academic_level || '');
      const camperLevels = (sub.campers || []).map(c => c.gradeLevel).join(' ');
      const combined = `${subLevel} ${camperLevels}`;
      if (!combined.includes(academicFilter)) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const dataValues = Object.values(sub.data).join(' ').toLowerCase();
      const campersText = (sub.campers || []).map(c => `${c.fullName} ${c.badgeName} ${c.gradeLevel}`).join(' ').toLowerCase();
      const notesText = (sub.notes || '').toLowerCase();
      const statusText = sub.status.toLowerCase();
      return dataValues.includes(query) || campersText.includes(query) || notesText.includes(query) || statusText.includes(query);
    }

    return true;
  });

  const getEvent = (eventId: string) => events.find(e => e.id === eventId);

  const totalCampersInView = filteredSubmissions.reduce((acc, sub) => {
    return acc + (sub.campers ? sub.campers.length : 1);
  }, 0);

  const totalPaidCount = filteredSubmissions.filter(s => s.status === 'paid').length;

  const handleOpenEdit = (sub: RegistrationSubmission) => {
    setEditingRecord(sub);
    setEditFieldsData({ ...sub.data });
    setEditNotes(sub.notes || '');
    setEditStatus(sub.status);
    setEditCampers(sub.campers ? [...sub.campers] : []);
  };

  const handleUpdateEditCamper = (id: string, key: keyof CamperItem, val: string) => {
    setEditCampers(editCampers.map(c => c.id === id ? { ...c, [key]: val } : c));
  };

  const handleAddEditCamper = () => {
    setEditCampers([
      ...editCampers,
      {
        id: `c_edit_${Date.now()}`,
        fullName: 'New Camper',
        badgeName: 'Badge',
        age: '16',
        gradeLevel: 'Junior High',
        gender: 'male'
      }
    ]);
  };

  const handleRemoveEditCamper = (id: string) => {
    setEditCampers(editCampers.filter(c => c.id !== id));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    onUpdateSubmissionData(editingRecord.id, editFieldsData, editNotes, editStatus, editCampers.length > 0 ? editCampers : undefined);
    setEditingRecord(null);
  };

  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) {
      alert('No records available to export.');
      return;
    }

    const dataKeys = Array.from(
      new Set(filteredSubmissions.flatMap(s => Object.keys(s.data)))
    );

    const headers = ['Submission ID', 'Event Title', 'Church Name', 'Delegation Head', 'Camper Roster Summary', 'Status', 'Notes', 'Submitted At', ...dataKeys];
    
    const csvRows = [
      headers.join(','),
      ...filteredSubmissions.map(s => {
        const ev = getEvent(s.eventId);
        const church = String(s.data.f_church_name || s.data.f_company || 'Independent Church');
        const head = String(s.data.f_delegation_head_name || s.data.f_name || 'Leader');
        const roster = s.campers ? s.campers.map(c => `${c.fullName} (${c.badgeName}, Age ${c.age}, ${c.gradeLevel})`).join('; ') : 'Single Registrant';

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
    link.setAttribute('download', `registrations-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            Foresee all church pre-registrations, camper rosters, pastors, grade levels, and payment statuses.
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
            <div className="text-xl font-black text-navy-900">{availableChurches.length}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
            <DollarSign className="w-5 h-5 text-emerald-700" />
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
            <div className="text-xl font-black text-navy-900">{filteredSubmissions.length}</div>
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
        
        {/* Row 1: Search & Occasion */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-navy-900/60 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search camper name, badge, church, or pastor..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none placeholder-navy-900/50"
            />
          </div>

          <div className="sm:col-span-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-navy-900/70 shrink-0" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none"
            >
              <option value="all">All Events ({events.length})</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({submissions.filter(s => s.eventId === ev.id).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Status, Church, Role, & Grade Level Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          
          <div>
            <label className="block text-[11px] font-bold text-navy-900/70 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              onChange={(e) => setChurchFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-xs focus:border-gold-500 focus:outline-none font-medium"
            >
              <option value="all">All Churches ({availableChurches.length})</option>
              {availableChurches.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-navy-900/70 uppercase tracking-wider mb-1">
              Role / Attendee Type
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
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
              onChange={(e) => setAcademicFilter(e.target.value)}
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
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-sm text-navy-900">
            <thead className="sticky top-0 z-10 bg-navy-900 text-xs font-bold text-navy-100 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Church & Delegation</th>
                <th className="px-5 py-3.5">Camper Roster Listing (Part 2)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Organizer Notes</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Main Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-navy-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-navy-900/70">
                    <AlertCircle className="w-8 h-8 text-navy-900/40 mx-auto mb-2" />
                    No pre-registration records match the current filter selection.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const ev = getEvent(sub.eventId);
                  const church = sub.data.f_church_name || sub.data.f_company || 'Independent Church';
                  const pastor = sub.data.f_church_pastor || sub.data.f_pastor_fullname || '';
                  const leader = sub.data.f_delegation_head_name || sub.data.f_delegation_fullname || sub.data.f_name || 'Delegation Head';
                  const leaderPhone = sub.data.f_delegation_head_phone || sub.data.f_delegation_mobile || sub.data.f_phone || '';
                  
                  const campersList = sub.campers && sub.campers.length > 0 
                    ? sub.campers 
                    : [{
                        id: 'single',
                        fullName: String(sub.data.f_camper_full_name || sub.data.f_name || sub.data.f_fullname || 'Registrant'),
                        badgeName: String(sub.data.f_preferred_badge_name || 'Badge'),
                        age: String(sub.data.f_dob_age || sub.data.f_age || 'N/A'),
                        gradeLevel: String(sub.data.f_academic_level || 'General'),
                        gender: String(sub.data.f_gender || 'N/A')
                      }];

                  const submittedDate = new Date(sub.submitted_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={sub.id} className="odd:bg-white even:bg-ivory hover:bg-gold-50 transition-colors">
                      
                      {/* Part 1: Church & Delegation */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-navy-900 flex items-center gap-1.5 text-base">
                          <Building2 className="w-4 h-4 text-navy-900/70 shrink-0" />
                          <span>{String(church)}</span>
                        </div>
                        {pastor && <div className="text-xs text-navy-900/70 mt-0.5">Pastor: {String(pastor)}</div>}
                        <div className="text-xs text-navy-900 mt-1">
                          Head: <span className="font-bold">{String(leader)}</span> {leaderPhone ? `(${String(leaderPhone)})` : ''}
                        </div>
                        <div className="text-[11px] text-navy-900/70 font-mono mt-1">Ref #{sub.id.slice(-6)}</div>
                      </td>

                      {/* Part 2: Camper Roster Listing */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2 max-w-md">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold-100 border border-navy-200 text-navy-900">
                              {campersList.length} Campers Registered
                            </span>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {campersList.map((c, idx) => (
                              <div
                                key={c.id || idx}
                                className="p-2.5 rounded-xl bg-ivory border border-navy-200 text-xs space-y-0.5"
                              >
                                <div className="font-bold text-navy-900 flex items-center justify-between">
                                  <span>{c.fullName} <span className="text-navy-900/60 font-normal">({c.badgeName})</span></span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-navy-200 text-navy-900 uppercase font-semibold">{c.gender}</span>
                                </div>
                                <div className="text-[11px] text-navy-900/70 flex items-center justify-between">
                                  <span>Age: {c.age}</span>
                                  <span className="text-navy-900 font-bold capitalize">{c.gradeLevel}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-top">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          sub.status === 'paid'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-sm'
                            : sub.status === 'confirmed'
                            ? 'bg-gold-100 border-navy-200 text-navy-900'
                            : sub.status === 'checked-in'
                            ? 'bg-purple-100 border-purple-300 text-purple-900'
                            : sub.status === 'pending'
                            ? 'bg-gold-100 border-gold-300 text-gold-900'
                            : 'bg-rose-100 border-rose-300 text-rose-900'
                        }`}>
                          {sub.status === 'paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                          {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </span>
                      </td>

                      {/* Organizer Notes */}
                      <td className="px-5 py-4 align-top max-w-xs">
                        {sub.notes ? (
                          <div className="text-xs text-navy-900 bg-ivory p-2.5 rounded-xl border border-navy-200 font-medium">
                            {sub.notes}
                          </div>
                        ) : (
                          <span className="text-xs text-navy-900/50 italic">No notes attached</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-4 align-top text-xs text-navy-900/70">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-navy-900/70" />
                          <span>{submittedDate}</span>
                        </div>
                      </td>

                      {/* Main Actions */}
                      <td className="px-5 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Confirm Payment Action Button */}
                          <button
                            onClick={() => onUpdateSubmissionStatus(sub.id, sub.status === 'paid' ? 'confirmed' : 'paid')}
                            title={sub.status === 'paid' ? 'Mark as Unpaid' : 'Confirm Payment (Set Paid)'}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                              sub.status === 'paid'
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                                : 'bg-gold-500 hover:bg-gold-600 hover:text-white text-navy-950 border-gold-600/30 shadow-sm'
                            }`}
                          >
                            <DollarSign className="w-3.5 h-3.5 text-navy-900" />
                            <span>{sub.status === 'paid' ? 'Paid' : 'Confirm Pay'}</span>
                          </button>

                          {/* Edit Record Button */}
                          <button
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 hover:bg-gold-100"
                            title="Edit Record Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* View Detail Modal */}
                          <button
                            onClick={() => setViewRecord(sub)}
                            className="p-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 hover:bg-gold-100"
                            title="View Full Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete Record */}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT RECORD MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fadeIn overflow-hidden">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-navy-200 p-6 sm:p-8 shadow-2xl text-navy-900">
            <button
              onClick={() => setEditingRecord(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-ivory border border-navy-200 text-navy-900/70 hover:text-navy-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gold-100 border border-navy-200">
                <Edit3 className="w-6 h-6 text-navy-900" />
              </div>
              <div>
                <span className="text-xs font-bold text-navy-900/70 uppercase tracking-wider">
                  Organizer Record & Roster Editor
                </span>
                <h3 className="text-xl font-black text-navy-900">
                  Edit Pre-Registration #{editingRecord.id.slice(-6)}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-ivory border border-navy-200">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Registration Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as SubmissionStatus)}
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
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g. Paid cash at church, GCash ref #..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-navy-200 text-navy-900 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Part 1 Details */}
              <div className="p-4 rounded-2xl bg-ivory border border-navy-200 space-y-3">
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                  Part 1: Church & Delegation Head Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(editFieldsData).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="block text-[11px] font-bold text-navy-900/70">
                        {key.replace(/^f_/, '').replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(value) ? value.join(', ') : String(value ?? '')}
                        onChange={(e) => setEditFieldsData({ ...editFieldsData, [key]: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs focus:border-gold-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Part 2 Campers Roster Editing */}
              {editCampers.length > 0 && (
                <div className="p-4 rounded-2xl bg-ivory border border-navy-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                      Part 2: Camper Roster Listing ({editCampers.length} Campers)
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddEditCamper}
                      className="flex items-center gap-1 text-xs text-navy-900 font-bold bg-white px-2.5 py-1 rounded-lg border border-navy-200 shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-navy-900/70" /> + Add Camper
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editCampers.map((c, idx) => (
                      <div key={c.id} className="p-3.5 rounded-xl bg-white border border-navy-200 space-y-2 relative shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-navy-900">
                          <span>Camper #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEditCamper(c.id)}
                            className="text-rose-700 text-[11px] font-semibold"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <input
                            type="text"
                            value={c.fullName}
                            placeholder="Full Name"
                            onChange={(e) => handleUpdateEditCamper(c.id, 'fullName', e.target.value)}
                            className="px-2.5 py-1 rounded bg-ivory border border-navy-200 text-navy-900 text-xs"
                          />
                          <input
                            type="text"
                            value={c.badgeName}
                            placeholder="Badge Name"
                            onChange={(e) => handleUpdateEditCamper(c.id, 'badgeName', e.target.value)}
                            className="px-2.5 py-1 rounded bg-ivory border border-navy-200 text-navy-900 text-xs"
                          />
                          <input
                            type="text"
                            value={c.age}
                            placeholder="Age"
                            onChange={(e) => handleUpdateEditCamper(c.id, 'age', e.target.value)}
                            className="px-2.5 py-1 rounded bg-ivory border border-navy-200 text-navy-900 text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <select
                            value={c.gradeLevel}
                            onChange={(e) => handleUpdateEditCamper(c.id, 'gradeLevel', e.target.value)}
                            className="px-2.5 py-1 rounded bg-ivory border border-navy-200 text-navy-900 text-xs font-medium"
                          >
                            <option value="elementary">Elementary</option>
                            <option value="junior high">Junior High</option>
                            <option value="senior high">Senior High</option>
                            <option value="college">College</option>
                            <option value="working">Working / Professional</option>
                          </select>

                          <select
                            value={c.gender}
                            onChange={(e) => handleUpdateEditCamper(c.id, 'gender', e.target.value)}
                            className="px-2.5 py-1 rounded bg-ivory border border-navy-200 text-navy-900 text-xs font-medium"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-5 py-2 rounded-xl bg-ivory border border-navy-200 text-navy-900 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 hover:text-white text-navy-950 font-bold text-sm shadow-md transition border border-gold-600/30"
                >
                  Save Record Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* RECORD VIEW MODAL */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-navy-200 p-6 sm:p-8 shadow-2xl text-navy-900">
            <button
              onClick={() => setViewRecord(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-ivory border border-navy-200 text-navy-900/70 hover:text-navy-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gold-100 border border-navy-200">
                <FileSpreadsheet className="w-6 h-6 text-navy-900" />
              </div>
              <div>
                <span className="text-xs font-bold text-navy-900/70 uppercase tracking-wider">
                  Delegation Pre-Registration View
                </span>
                <h3 className="text-xl font-black text-navy-900">
                  Ref #{viewRecord.id.slice(-6)}
                </h3>
              </div>
            </div>

            <div className="space-y-4 mb-6 p-5 rounded-2xl bg-ivory border border-navy-200">
              <div className="flex items-center justify-between pb-3 border-b border-navy-200">
                <span className="text-xs text-navy-900/70">Payment Status</span>
                <span className="text-xs font-bold text-emerald-800 uppercase">{viewRecord.status}</span>
              </div>

              {viewRecord.notes && (
                <div className="p-3 rounded-xl bg-white border border-navy-200 text-xs text-navy-900">
                  <span className="font-bold text-navy-900/70">Organizer Note: </span>{viewRecord.notes}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Part 1: Church Info</h4>
                {Object.entries(viewRecord.data).map(([key, val]) => (
                  <div key={key} className="space-y-0.5">
                    <span className="text-[10px] font-bold text-navy-900/70 uppercase tracking-wider">
                      {key.replace(/^f_/, '').replace(/_/g, ' ')}
                    </span>
                    <div className="p-2 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs">
                      {key.includes('link') && String(val).startsWith('http') ? (
                        <a href={String(val)} target="_blank" rel="noreferrer" className="text-gold-600 underline font-mono flex items-center gap-1 font-bold">
                          <Link2 className="w-3.5 h-3.5" /> {String(val)}
                        </a>
                      ) : (
                        Array.isArray(val) ? val.join(', ') : String(val)
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {viewRecord.campers && viewRecord.campers.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-navy-200">
                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                    Part 2: Camper Roster ({viewRecord.campers.length} Campers)
                  </h4>
                  <div className="space-y-2">
                    {viewRecord.campers.map((c, i) => (
                      <div key={c.id || i} className="p-2.5 rounded-xl bg-white border border-navy-200 text-xs shadow-sm">
                        <div className="font-bold text-navy-900">{i + 1}. {c.fullName} ({c.badgeName})</div>
                        <div className="text-[11px] text-navy-900/70">Age: {c.age} • Level: {c.gradeLevel} • Gender: {c.gender}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  const rec = viewRecord;
                  setViewRecord(null);
                  handleOpenEdit(rec);
                }}
                className="px-5 py-2.5 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm font-bold"
              >
                Edit Record
              </button>
              <button
                onClick={() => setViewRecord(null)}
                className="px-5 py-2.5 rounded-xl bg-gold-500 text-navy-900 font-bold text-sm shadow-md border border-navy-200"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};