import React, { useState } from 'react';
import { RegistrationEvent, CamperItem } from '../types';
import { 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft, 
  Send,
  Link2,
  ExternalLink,
  Building2,
  Users,
  Plus,
  Trash2,
  UserPlus,
  Code,
  Check,
  Copy
} from 'lucide-react';

interface PublicRegistrationPageProps {
  event: RegistrationEvent;
  onBackToDashboard: () => void;
  onSubmitRegistration: (eventId: string, formData: Record<string, any>, campers?: CamperItem[]) => void;
}

export const PublicRegistrationPage: React.FC<PublicRegistrationPageProps> = ({
  event,
  onBackToDashboard,
  onSubmitRegistration
}) => {
  // Part 1 Form Data State
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Part 2 Dynamic Camper Roster State
  const [campers, setCampers] = useState<CamperItem[]>([
    {
      id: `c_${Date.now()}_1`,
      fullName: '',
      badgeName: '',
      age: '',
      gradeLevel: 'junior high',
      gender: 'male'
    }
  ]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [submissionTime, setSubmissionTime] = useState('');
  const [submittedJsonPayload, setSubmittedJsonPayload] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState(false);

  const isYouthCamp = event.category === 'camp' || event.isMultiPart || event.slug.includes('ayos');

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  // Camper Roster Handlers
  const handleAddCamper = () => {
    setCampers([
      ...campers,
      {
        id: `c_${Date.now()}_${campers.length + 1}`,
        fullName: '',
        badgeName: '',
        age: '',
        gradeLevel: 'senior high',
        gender: 'female'
      }
    ]);
  };

  const handleRemoveCamper = (id: string) => {
    if (campers.length <= 1) {
      alert('Your delegation must include at least 1 camper.');
      return;
    }
    setCampers(campers.filter(c => c.id !== id));
  };

  const handleUpdateCamper = (id: string, key: keyof CamperItem, value: string) => {
    setCampers(campers.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation: Part 1
    const part1Fields = isYouthCamp 
      ? event.fields.filter(f => f.section === 'part1' || !f.section)
      : event.fields;

    for (const field of part1Fields) {
      if (field.required && !formData[field.id]) {
        alert(`Validation Error: Please fill in the required field "${field.label}".`);
        return;
      }
    }

    // Client-side validation: Part 2 Camper Roster
    if (isYouthCamp) {
      for (let i = 0; i < campers.length; i++) {
        const c = campers[i];
        if (!c.fullName.trim()) {
          alert(`Validation Error: Please enter Full Name for Camper #${i + 1}.`);
          return;
        }
        if (!c.badgeName.trim()) {
          alert(`Validation Error: Please enter Preferred Badge Name for Camper #${i + 1}.`);
          return;
        }
        if (!c.age.trim() || isNaN(Number(c.age))) {
          alert(`Validation Error: Please enter a valid numeric Age for Camper #${i + 1}.`);
          return;
        }
      }
    }

    const subId = `AYOS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowTime = new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Format Structured Submission JSON Payload
    const payload = {
      event_id: event.id,
      event_title: event.title,
      reference_code: subId,
      submitted_at: new Date().toISOString(),
      part1_church_and_delegation: {
        church_details: {
          name: formData.f_church_name || '',
          address: formData.f_church_address || '',
          city_province: formData.f_city_province || ''
        },
        pastor_details: {
          full_name: formData.f_pastor_fullname || '',
          contact_number: formData.f_pastor_contact || '',
          email_address: formData.f_pastor_email || ''
        },
        delegation_head_details: {
          full_name: formData.f_delegation_fullname || '',
          role_position: formData.f_delegation_role || '',
          mobile_number: formData.f_delegation_mobile || '',
          email_address: formData.f_delegation_email || ''
        }
      },
      part2_camper_roster: isYouthCamp ? campers.map((c, index) => ({
        camper_no: index + 1,
        full_name: c.fullName,
        preferred_badge_name: c.badgeName,
        age: Number(c.age),
        grade_level: c.gradeLevel,
        gender: c.gender
      })) : [],
      total_campers_count: campers.length
    };

    setSubmissionId(subId);
    setSubmissionTime(nowTime);
    setSubmittedJsonPayload(JSON.stringify(payload, null, 2));

    onSubmitRegistration(event.id, formData, isYouthCamp ? campers : undefined);
    setIsSubmitted(true);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(submittedJsonPayload);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 animate-fadeIn font-sans">
      
      {/* Top Admin Back Bar */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-gold-300 text-xs font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to System Dashboard</span>
        </button>

        <span className="text-xs text-gold-400 font-mono">
          AYOS YOUTH CAMP 2026 Pre-Registration Mode
        </span>
      </div>

      <div className="max-w-4xl mx-auto">
        {!isSubmitted ? (
          <div className="rounded-3xl glass-panel border border-gold-500/40 p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />

            {/* Event Banner Header */}
            <div className="border-b border-slate-800 pb-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gold-500/10 border border-gold-500/30 text-gold-300 uppercase tracking-wider">
                  {event.type}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-400 capitalize">
                  {event.category}
                </span>
                {isYouthCamp && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-950 border border-slate-700 text-slate-300">
                    2-Part Delegation Form
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 font-display leading-tight">
                {event.title}
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {event.description}
              </p>

              {/* Banner Guidelines Link */}
              {event.externalLink && event.externalLink.url && (
                <div className="pt-2">
                  <a
                    href={event.externalLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 border border-gold-500/40 text-gold-300 hover:text-gold-200 text-xs font-bold transition-all shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4 text-gold-400" />
                    <span>{event.externalLink.label || 'View Camp Info & Guidelines'}</span>
                  </a>
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
                {event.eventDate && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                    <Calendar className="w-4 h-4 text-gold-400" />
                    <span>{event.eventDate}</span>
                  </span>
                )}
                {event.location && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                    <MapPin className="w-4 h-4 text-gold-400" />
                    <span>{event.location}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic 2-Part Form */}
            <form onSubmit={handleSubmit} className="space-y-10">
              
              {/* PART 1: CHURCH & DELEGATION INFORMATION */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30">
                      <Building2 className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-gold-400 uppercase tracking-wider">
                        PART 1 OF 2
                      </span>
                      <h3 className="text-lg font-bold text-slate-100 font-display">
                        Church & Delegation Information
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Church Details Subsection */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gold-300 uppercase tracking-wider">1. Church Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Church Name <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Grace Fellowship Church"
                        value={formData['f_church_name'] || ''}
                        onChange={(e) => handleInputChange('f_church_name', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Church Address <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Street / Barangay"
                        value={formData['f_church_address'] || ''}
                        onChange={(e) => handleInputChange('f_church_address', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        City / Province <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Quezon City, Metro Manila"
                        value={formData['f_city_province'] || ''}
                        onChange={(e) => handleInputChange('f_city_province', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>
                  </div>
                </div>

                {/* Pastor Details Subsection */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-gold-300 uppercase tracking-wider">2. Pastor Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Full Name <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ptr. Samuel Cruz"
                        value={formData['f_pastor_fullname'] || ''}
                        onChange={(e) => handleInputChange('f_pastor_fullname', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Contact Number <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+63 917 123 4567"
                        value={formData['f_pastor_contact'] || ''}
                        onChange={(e) => handleInputChange('f_pastor_contact', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Email Address <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="pastor@church.org"
                        value={formData['f_pastor_email'] || ''}
                        onChange={(e) => handleInputChange('f_pastor_email', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>
                  </div>
                </div>

                {/* Delegation Head Details Subsection */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-gold-300 uppercase tracking-wider">3. Delegation Head Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Full Name <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="David Reyes"
                        value={formData['f_delegation_fullname'] || ''}
                        onChange={(e) => handleInputChange('f_delegation_fullname', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Role / Position <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Youth Leader / Youth Director"
                        value={formData['f_delegation_role'] || ''}
                        onChange={(e) => handleInputChange('f_delegation_role', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Mobile Number <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+63 918 987 6543"
                        value={formData['f_delegation_mobile'] || ''}
                        onChange={(e) => handleInputChange('f_delegation_mobile', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Email Address <span className="text-gold-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="delegation.head@church.org"
                        value={formData['f_delegation_email'] || ''}
                        onChange={(e) => handleInputChange('f_delegation_email', e.target.value)}
                        className="field-input-dark"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* PART 2: CAMPER ROSTER (DYNAMIC MULTI-ENTRY) */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30">
                      <Users className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-gold-400 uppercase tracking-wider">
                        PART 2 OF 2
                      </span>
                      <h3 className="text-lg font-bold text-slate-100 font-display">
                        Camper Roster (Dynamic Multi-Entry)
                      </h3>
                    </div>
                  </div>

                  {/* AUTOMATED TOTAL CAMPER COUNTER DISPLAY */}
                  <div className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-1.5">
                    <span>Total Campers:</span>
                    <span className="text-sm">{campers.length}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">
                  Add all campers under your church delegation. Each entry requires Full Name, Preferred Badge Name, Age, Grade Level, and Gender.
                </p>

                {/* Camper Dynamic List Cards */}
                <div className="space-y-5">
                  {campers.map((camper, index) => (
                    <div
                      key={camper.id}
                      className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-gold-500/40 transition-all space-y-4 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-lg bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold">
                          Camper #{index + 1}
                        </span>

                        {campers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCamper(camper.id)}
                            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded bg-slate-900 border border-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Full Name <span className="text-gold-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="First Name, Middle Initial, Last Name"
                            value={camper.fullName}
                            onChange={(e) => handleUpdateCamper(camper.id, 'fullName', e.target.value)}
                            className="field-input-dark"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Preferred Badge Name <span className="text-gold-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Badge print name (e.g. Timmy)"
                            value={camper.badgeName}
                            onChange={(e) => handleUpdateCamper(camper.id, 'badgeName', e.target.value)}
                            className="field-input-dark"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Age <span className="text-gold-400">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            required
                            placeholder="e.g. 17"
                            value={camper.age}
                            onChange={(e) => handleUpdateCamper(camper.id, 'age', e.target.value)}
                            className="field-input-dark"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Grade Level <span className="text-gold-400">*</span>
                          </label>
                          <select
                            value={camper.gradeLevel}
                            onChange={(e) => handleUpdateCamper(camper.id, 'gradeLevel', e.target.value)}
                            className="field-input-dark"
                          >
                            <option value="elementary">Elementary</option>
                            <option value="junior high">Junior High</option>
                            <option value="senior high">Senior High</option>
                            <option value="college">College</option>
                            <option value="working">Working / Professional</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Gender <span className="text-gold-400">*</span>
                          </label>
                          <div className="flex items-center gap-4 pt-1.5">
                            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                              <input
                                type="radio"
                                name={`gender_${camper.id}`}
                                value="male"
                                checked={camper.gender === 'male'}
                                onChange={(e) => handleUpdateCamper(camper.id, 'gender', e.target.value)}
                                className="accent-gold-500"
                              />
                              <span>Male</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                              <input
                                type="radio"
                                name={`gender_${camper.id}`}
                                value="female"
                                checked={camper.gender === 'female'}
                                onChange={(e) => handleUpdateCamper(camper.id, 'female' as any, e.target.value)}
                                className="accent-gold-500"
                              />
                              <span>Female</span>
                            </label>
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddCamper}
                  className="w-full py-3.5 rounded-xl border border-dashed border-gold-500/40 text-gold-300 hover:bg-gold-500/10 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <UserPlus className="w-4 h-4 text-gold-400" />
                  <span>+ Add Another Camper</span>
                </button>

              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-500 via-gold-400 to-gold-400 text-slate-950 font-bold text-base hover:brightness-110 active:scale-[0.99] transition-all shadow-xl shadow-gold-500/25 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span>Submit AYOS Youth Camp Pre-Registration</span>
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation Ticket Card & Structured JSON Payload Viewer */
          <div className="rounded-3xl glass-panel border border-gold-500/50 p-8 sm:p-10 text-center shadow-2xl space-y-6 relative overflow-hidden animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-gold-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-3xl font-bold text-slate-100 font-display">
              Pre-Registration Submitted!
            </h2>

            <p className="text-gold-300 text-sm max-w-md mx-auto leading-relaxed">
              Praise God! Your AYOS YOUTH CAMP 2026 pre-registration payload has been processed.
            </p>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 max-w-xl mx-auto text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400">Reference Code</span>
                <span className="text-xs font-mono font-bold text-gold-400">{submissionId}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400">Total Registered Campers</span>
                <span className="text-xs font-bold text-emerald-400">{campers.length} Campers</span>
              </div>

              {/* STRUCTURED JSON PAYLOAD VIEWER */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gold-300 flex items-center gap-1.5 font-mono">
                    <Code className="w-4 h-4 text-gold-400" /> Structured JSON Payload:
                  </span>

                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[11px] text-gold-300 hover:text-white px-2.5 py-1 rounded bg-slate-900 border border-slate-800"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied JSON!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-gold-200 font-mono overflow-x-auto max-h-56">
                  {submittedJsonPayload}
                </pre>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Register Another Delegation
              </button>
              <button
                onClick={onBackToDashboard}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gold-500 text-slate-950 font-bold text-xs shadow-md"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};