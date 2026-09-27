import React, { useEffect, useState } from 'react';
import { RegistrationEvent, CamperItem } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import {
  Calendar,
  MapPin,
  CheckCircle2,
  Send,
  ExternalLink,
  Building2,
  Users,
  Trash2,
  UserPlus,
  Code,
  Check,
  Copy,
  ShieldCheck
} from 'lucide-react';

interface PublicRegistrationPageProps {
  eventId: string;
  onBackToDashboard: () => void;
}

export const PublicRegistrationPage: React.FC<PublicRegistrationPageProps> = ({
  eventId,
  onBackToDashboard
}) => {
  const [event, setEvent] = useState<RegistrationEvent | null>(null);
  const [isReturningChurch, setIsReturningChurch] = useState(false);
  const [isAddingDelegation, setIsAddingDelegation] = useState(false);
  const [existingChurchFormData, setExistingChurchFormData] = useState<Record<string, any> | null>(null);
  const [existingRegistrationId, setExistingRegistrationId] = useState<string | null>(null);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [churchRegistrationCode, setChurchRegistrationCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

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
  const [submittedJsonPayload, setSubmittedJsonPayload] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    const loadEventAndRegistration = async () => {
      setIsCheckingRegistration(true);

      const client = getSupabaseClient();
      let loadedEvent: RegistrationEvent | null = null;

      if (client) {
        const { data, error } = await client
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

        if (!error && data) {
          loadedEvent = {
            id: data.id,
            title: data.title,
            slug: data.slug,
            type: data.type,
            category: data.category,
            description: data.description || '',
            location: data.location || undefined,
            eventDate: data.event_date || undefined,
            status: data.status,
            fields: data.fields || [],
            created_at: data.created_at,
            last_used_at: data.last_used_at,
            maxRegistrations: data.max_registrations || undefined,
            submitButtonText: data.submit_button_text || undefined,
            successMessage: data.success_message || undefined
          };
        }
      }

      if (!loadedEvent) {
        const savedEvents = localStorage.getItem('aurum_events');
        if (savedEvents) {
          try {
            const parsed = JSON.parse(savedEvents);
            loadedEvent = parsed.find((e: RegistrationEvent) => e.id === eventId) || null;
          } catch {
            loadedEvent = null;
          }
        }
      }

      setEvent(loadedEvent);

      if (loadedEvent) {
        const registrationKey = `aurum_registered_church_${eventId}`;
        const savedRegistration = localStorage.getItem(registrationKey);

        if (savedRegistration) {
          try {
            const saved = JSON.parse(savedRegistration);
            let registrationData: Record<string, any> | null = null;
            const registrationId: string | null = saved.registrationId || null;

            if (client && registrationId) {
              const { data } = await client
                .from('registrations')
                .select('id,data')
                .eq('id', registrationId)
                .eq('event_id', eventId)
                .maybeSingle();

              if (data?.data) registrationData = data.data;
            }

            if (!registrationData && saved.formData) {
              registrationData = saved.formData;
            }

            if (registrationData) {
              setExistingChurchFormData(registrationData);
              setExistingRegistrationId(registrationId);
              setChurchRegistrationCode(registrationData.church_registration_code || '');
              setFormData(registrationData);
              setIsReturningChurch(true);
            }
          } catch {
            localStorage.removeItem(registrationKey);
          }
        }
      }

      setIsCheckingRegistration(false);
    };

    loadEventAndRegistration();
  }, [eventId]);

  if (!event || isCheckingRegistration) {
    return <div className="p-10 text-center">Loading form...</div>;
  }

  const isYouthCamp =
    event.category === 'camp' ||
    (event as any).isMultiPart ||
    event.slug.includes('ayos');

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
    setCampers(prevCampers =>
      prevCampers.map(c => (c.id === id ? { ...c, [key]: value } : c))
    );
  };

  const generateChurchRegistrationCode = async (client: ReturnType<typeof getSupabaseClient>) => {
    const makeCode = () => {
      const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
      return `CH-${randomPart}`;
    };

    if (!client) return makeCode();

    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = makeCode();
      const { data, error } = await client
        .from('registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('data->>church_registration_code', candidate)
        .limit(1);

      if (error) {
        console.warn('Could not verify Church Registration Code uniqueness:', error);
        return candidate;
      }

      if (!data || data.length === 0) return candidate;
    }

    return `CH-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  };

  const handleVerifyChurchCode = async () => {
    const normalizedCode = codeInput.trim().toUpperCase();

    if (!normalizedCode) {
      setCodeError('Please enter your Church Registration Code.');
      return;
    }

    setIsVerifyingCode(true);
    setCodeError('');

    try {
      const client = getSupabaseClient();

      if (!client) {
        setCodeError('The registration database is not available right now. Please try again later.');
        return;
      }

      const { data, error } = await client
        .from('registrations')
        .select('id,data')
        .eq('event_id', eventId)
        .eq('data->>church_registration_code', normalizedCode)
        .eq('data->>registration_type', 'church')
        .order('submitted_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Church Registration Code lookup error:', error);
        setCodeError('We could not verify the code. Please try again.');
        return;
      }

      if (!data?.data) {
        setCodeError('Invalid Church Registration Code. Please check the code and try again.');
        return;
      }

      const registrationData = data.data as Record<string, any>;
      setExistingChurchFormData(registrationData);
      setExistingRegistrationId(data.id);
      setChurchRegistrationCode(normalizedCode);
      setFormData(registrationData);
      setCampers([
        {
          id: `c_${Date.now()}_1`,
          fullName: '',
          badgeName: '',
          age: '',
          gradeLevel: 'junior high',
          gender: 'male'
        }
      ]);
      setIsReturningChurch(true);
      setIsAddingDelegation(false);
      setCodeInput('');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation: Part 1 is only required for the first church registration.
    if (!isAddingDelegation) {
      const part1Fields = isYouthCamp
        ? event.fields.filter(f => f.section === 'part1' || !f.section)
        : event.fields;

      for (const field of part1Fields) {
        if (field.required && !formData[field.id] && formData[field.id] !== 0) {
          alert(`Validation Error: Please complete required field "${field.label}".`);
          return;
        }
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
        },
        additional_deployed_fields: formData
      },
      part2_camper_roster: isYouthCamp
        ? campers.map((c, index) => ({
            camper_no: index + 1,
            full_name: c.fullName,
            preferred_badge_name: c.badgeName,
            age: Number(c.age),
            grade_level: c.gradeLevel,
            gender: c.gender
          }))
        : [],
      total_campers_count: campers.length
    };

    setSubmissionId(subId);
    setSubmittedJsonPayload(JSON.stringify(payload, null, 2));

    const client = getSupabaseClient();
    const registrationCode = isAddingDelegation
      ? existingChurchFormData?.church_registration_code || churchRegistrationCode
      : await generateChurchRegistrationCode(client);

    const submissionData: Record<string, any> = isAddingDelegation
      ? {
          ...(existingChurchFormData || {}),
          ...formData,
          campers,
          church_registration_code: registrationCode,
          registration_type: 'delegation',
          parent_registration_id: existingRegistrationId
        }
      : {
          ...formData,
          campers,
          church_registration_code: registrationCode,
          registration_type: 'church',
          parent_registration_id: null
        };

    // Persist to Supabase if available
    let savedRegistrationId: string | null = existingRegistrationId;

    if (client) {
      try {
        const { data: inserted, error: insertError } = await client
          .from('registrations')
          .insert({
            event_id: event.id,
            data: submissionData,
            submitted_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Registration insert error:', insertError);
        } else if (inserted) {
          savedRegistrationId = inserted.id;
        }
      } catch (err) {
        console.error('Supabase registration error:', err);
      }
    }

    // Remember this browser's church registration so reopening the same public link
    // goes directly to the Add Delegation panel.
    if (!isAddingDelegation) {
      localStorage.setItem(
        `aurum_registered_church_${event.id}`,
        JSON.stringify({
          registrationId: savedRegistrationId,
          formData: submissionData,
          churchName: submissionData.f_church_name || ''
        })
      );
      setExistingChurchFormData(submissionData);
      setExistingRegistrationId(savedRegistrationId);
      setChurchRegistrationCode(registrationCode);
      setIsReturningChurch(true);
    }

    const savedEvents = localStorage.getItem('aurum_events');
    if (savedEvents) {
      try {
        const events = JSON.parse(savedEvents);
        const updatedEvents = events.map((e: RegistrationEvent) =>
          e.id === event.id ? { ...e, last_used_at: new Date().toISOString() } : e
        );
        localStorage.setItem('aurum_events', JSON.stringify(updatedEvents));
      } catch {
        // Supabase is the source of truth; local cache is optional.
      }
    }

    setIsSubmitted(true);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(submittedJsonPayload);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyChurchCode = () => {
    navigator.clipboard.writeText(churchRegistrationCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Separate standard vs custom deployed fields
  const standardPart1FieldIds = [
    'f_church_name',
    'f_church_address',
    'f_city_province',
    'f_pastor_fullname',
    'f_pastor_contact',
    'f_pastor_email',
    'f_delegation_fullname',
    'f_delegation_role',
    'f_delegation_mobile',
    'f_delegation_email'
  ];

  const customPart1Fields = event.fields.filter(
    f => (f.section === 'part1' || !f.section) && !standardPart1FieldIds.includes(f.id)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 animate-fadeIn font-sans">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <span className="text-xs text-amber-400 font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          AYOS YOUTH CAMP 2026 Pre-Registration Mode
        </span>
      </div>

      <div className="max-w-4xl mx-auto">
        {isReturningChurch && !isAddingDelegation && !isSubmitted ? (
          <div className="rounded-3xl bg-slate-900/90 border border-amber-500/40 p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden animate-fadeIn">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Church Registration Found
              </span>
              <h2 className="text-3xl font-bold text-slate-100 font-display">
                Welcome Back, {existingChurchFormData?.f_church_name || 'Church'}
              </h2>
              <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
                Your church, pastor, and delegation head are already registered for this event. You do
                not need to enter those details again.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-slate-400">Registered Church</p>
                  <p className="font-bold text-slate-100">
                    {existingChurchFormData?.f_church_name || 'Church'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">Pastor</p>
                  <p className="text-slate-100 font-semibold mt-1">
                    {existingChurchFormData?.f_pastor_fullname || '—'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                    Delegation Head
                  </p>
                  <p className="text-slate-100 font-semibold mt-1">
                    {existingChurchFormData?.f_delegation_fullname || '—'}
                  </p>
                </div>
              </div>

              {churchRegistrationCode && (
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                    Church Registration Code
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {churchRegistrationCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyChurchCode}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                      title="Copy Church Registration Code"
                    >
                      {codeCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setFormData(existingChurchFormData || {});
                setCampers([
                  {
                    id: `c_${Date.now()}_1`,
                    fullName: '',
                    badgeName: '',
                    age: '',
                    gradeLevel: 'junior high',
                    gender: 'male'
                  }
                ]);
                setIsAddingDelegation(true);
              }}
              className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Delegation</span>
            </button>

            <p className="text-center text-xs text-slate-400">
              Use this button to register another group of campers under the same church.
            </p>
          </div>
        ) : !isSubmitted ? (
          <div className="rounded-3xl bg-slate-900/90 border border-amber-500/40 p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Cross-device Church Registration Code Access */}
            {!isReturningChurch && !isAddingDelegation && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-100">
                      Already registered your church?
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Enter your Church Registration Code to open your church panel and add another
                      delegation without registering the church, pastor, or delegation head again.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={e => {
                      setCodeInput(e.target.value.toUpperCase());
                      setCodeError('');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifyChurchCode();
                      }
                    }}
                    placeholder="CH-XXXXXX"
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm uppercase outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyChurchCode}
                    disabled={isVerifyingCode}
                    className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-sm"
                  >
                    {isVerifyingCode ? 'Checking...' : 'Open Church Panel'}
                  </button>
                </div>

                {codeError && <p className="text-xs text-red-400 font-medium">{codeError}</p>}
              </div>
            )}

            {/* Event Banner Header */}
            <div className="border-b border-slate-800 pb-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase tracking-wider">
                  {event.type}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-950 border border-slate-800 text-slate-400 capitalize">
                  {event.category}
                </span>
                {isYouthCamp && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-950 border border-slate-700 text-slate-200">
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
              {(event as any).externalLink && (event as any).externalLink.url && (
                <div className="pt-2">
                  <a
                    href={(event as any).externalLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4 text-amber-400" />
                    <span>
                      {(event as any).externalLink.label || 'View Camp Info & Guidelines'}
                    </span>
                  </a>
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
                {event.eventDate && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>{event.eventDate}</span>
                  </span>
                )}
                {event.location && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>{event.location}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic 2-Part Form */}
            <form onSubmit={handleSubmit} className="space-y-10">
              {!isAddingDelegation && (
                <>
                  {/* PART 1: CHURCH & DELEGATION INFORMATION */}
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <Building2 className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
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
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        1. Church Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Church Name <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Grace Fellowship Church"
                            value={formData['f_church_name'] || ''}
                            onChange={e => handleInputChange('f_church_name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Church Address <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Street / Barangay"
                            value={formData['f_church_address'] || ''}
                            onChange={e => handleInputChange('f_church_address', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            City / Province <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Quezon City, Metro Manila"
                            value={formData['f_city_province'] || ''}
                            onChange={e => handleInputChange('f_city_province', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pastor Details Subsection */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        2. Pastor Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Full Name <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ptr. Samuel Cruz"
                            value={formData['f_pastor_fullname'] || ''}
                            onChange={e => handleInputChange('f_pastor_fullname', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Contact Number <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="+63 917 123 4567"
                            value={formData['f_pastor_contact'] || ''}
                            onChange={e => handleInputChange('f_pastor_contact', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Email Address <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="pastor@church.org"
                            value={formData['f_pastor_email'] || ''}
                            onChange={e => handleInputChange('f_pastor_email', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delegation Head Details Subsection */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        3. Delegation Head Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Full Name <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="David Reyes"
                            value={formData['f_delegation_fullname'] || ''}
                            onChange={e => handleInputChange('f_delegation_fullname', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Role / Position <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Youth Leader / Youth Director"
                            value={formData['f_delegation_role'] || ''}
                            onChange={e => handleInputChange('f_delegation_role', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Mobile Number <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="+63 918 987 6543"
                            value={formData['f_delegation_mobile'] || ''}
                            onChange={e => handleInputChange('f_delegation_mobile', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1">
                            Email Address <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="delegation.head@church.org"
                            value={formData['f_delegation_email'] || ''}
                            onChange={e => handleInputChange('f_delegation_email', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Deployed Custom Part 1 Fields */}
                    {customPart1Fields.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-800">
                        <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                          4. Additional Delegation Fields
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {customPart1Fields.map(f => (
                            <div key={f.id} className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-200">
                                {f.label} {f.required && <span className="text-amber-400">*</span>}
                              </label>

                              {f.type === 'textarea' ? (
                                <textarea
                                  rows={2}
                                  required={f.required}
                                  placeholder={f.placeholder || 'Enter details...'}
                                  value={formData[f.id] || ''}
                                  onChange={e => handleInputChange(f.id, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                                />
                              ) : f.type === 'select' ? (
                                <select
                                  required={f.required}
                                  value={formData[f.id] || ''}
                                  onChange={e => handleInputChange(f.id, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                >
                                  <option value="">-- Select option --</option>
                                  {f.options?.map(o => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={f.type === 'link' ? 'url' : f.type}
                                  required={f.required}
                                  placeholder={f.placeholder || 'Enter details...'}
                                  value={formData[f.id] || ''}
                                  onChange={e => handleInputChange(f.id, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* PART 2: CAMPER ROSTER (DYNAMIC MULTI-ENTRY) */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <Users className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        PART 2 OF 2
                      </span>
                      <h3 className="text-lg font-bold text-slate-100 font-display">
                        Camper Roster (Dynamic Multi-Entry)
                      </h3>
                    </div>
                  </div>

                  {/* AUTOMATED TOTAL CAMPER COUNTER DISPLAY */}
                  <div className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-1.5">
                    <span>Total Campers:</span>
                    <span className="text-sm">{campers.length}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">
                  Add all campers under your church delegation. Each entry requires Full Name,
                  Preferred Badge Name, Age, Grade Level, and Gender.
                </p>

                {/* Camper Dynamic List Cards */}
                <div className="space-y-5">
                  {campers.map((camper, index) => (
                    <div
                      key={camper.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all space-y-4 relative shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                          Camper #{index + 1}
                        </span>

                        {campers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCamper(camper.id)}
                            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded bg-slate-950 border border-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Full Name <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="First Name, Middle Initial, Last Name"
                            value={camper.fullName}
                            onChange={e => handleUpdateCamper(camper.id, 'fullName', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Preferred Badge Name <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Badge print name (e.g. Timmy)"
                            value={camper.badgeName}
                            onChange={e => handleUpdateCamper(camper.id, 'badgeName', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Age <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            required
                            placeholder="e.g. 17"
                            value={camper.age}
                            onChange={e => handleUpdateCamper(camper.id, 'age', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Grade Level <span className="text-amber-400">*</span>
                          </label>
                          <select
                            value={camper.gradeLevel}
                            onChange={e => handleUpdateCamper(camper.id, 'gradeLevel', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                          >
                            <option value="elementary">Elementary</option>
                            <option value="junior high">Junior High</option>
                            <option value="senior high">Senior High</option>
                            <option value="college">College</option>
                            <option value="working">Working / Professional</option>
                          </select>
                        </div>

                        {/* Interactive Working Male / Female Radio Buttons */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Gender <span className="text-amber-400">*</span>
                          </label>
                          <div className="flex items-center gap-3 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCamper(camper.id, 'gender', 'male')}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                camper.gender === 'male'
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`gender_${camper.id}`}
                                value="male"
                                checked={camper.gender === 'male'}
                                onChange={() => handleUpdateCamper(camper.id, 'gender', 'male')}
                                className="accent-amber-500 cursor-pointer"
                              />
                              <span>Male</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateCamper(camper.id, 'gender', 'female')}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                camper.gender === 'female'
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`gender_${camper.id}`}
                                value="female"
                                checked={camper.gender === 'female'}
                                onChange={() => handleUpdateCamper(camper.id, 'gender', 'female')}
                                className="accent-amber-500 cursor-pointer"
                              />
                              <span>Female</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddCamper}
                  className="w-full py-3.5 rounded-xl border border-dashed border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>+ Add Another Camper</span>
                </button>
              </div>

              {isAddingDelegation && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingDelegation(false);
                    setFormData(existingChurchFormData || {});
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white font-bold text-sm"
                >
                  Cancel and Return to Church Panel
                </button>
              )}

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-5 h-5 text-slate-950" />
                <span>
                  {isAddingDelegation
                    ? 'Submit New Delegation'
                    : 'Submit AYOS Youth Camp Pre-Registration'}
                </span>
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation Ticket Card & Structured JSON Payload Viewer */
          <div className="rounded-3xl bg-slate-900 border border-amber-500/50 p-8 sm:p-10 text-center shadow-2xl space-y-6 relative overflow-hidden animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-3xl font-bold text-slate-100 font-display">
              Pre-Registration Submitted!
            </h2>

            <p className="text-amber-300 text-sm max-w-md mx-auto leading-relaxed">
              Praise God! Your AYOS YOUTH CAMP 2026 pre-registration has been submitted. Thank you and
            </p>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 max-w-xl mx-auto text-left space-y-4">
              {/* Reference Code Row */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400">Reference Code</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">{submissionId}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(submissionId)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copy Reference Code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Church Registration Code — HIGHLIGHTED & COPYABLE */}
              {!isAddingDelegation && churchRegistrationCode && (
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5 border-2 border-amber-400/60 space-y-3 shadow-lg shadow-amber-500/20 animate-pulse-slow">
                  {/* Attention badge */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black animate-bounce">
                      !
                    </span>
                    <span className="text-[11px] font-black text-amber-300 uppercase tracking-widest">
                      ⚠ Save This Code — Important!
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
                      Church Registration Code
                    </p>

                    <div className="flex items-center gap-3">
                      <span
                        onClick={handleCopyChurchCode}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCopyChurchCode();
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        title="Click to copy"
                        className="flex-1 text-3xl sm:text-4xl font-mono font-black text-amber-300 tracking-[0.25em] break-all select-all drop-shadow-[0_0_12px_rgba(251,191,36,0.6)] cursor-pointer"
                      >
                        {churchRegistrationCode}
                      </span>

                      <button
                        type="button"
                        onClick={handleCopyChurchCode}
                        className={`shrink-0 px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-md ${
                          codeCopied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        }`}
                      >
                        {codeCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-400/20">
                    <p className="text-[11px] text-amber-100/80 leading-relaxed">
                       <strong>Click the code so save this down now.</strong> Use it with this event link to reopen your church panel and add
                      another delegation without re-entering church details. 
                    </p>
                  </div>
                </div>
              )}

              {/* Total Campers Row */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400">Total Registered Campers</span>
                <span className="text-xs font-bold text-emerald-400">
                  {campers.length} Campers
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setIsAddingDelegation(false);
                  setIsReturningChurch(true);
                  setFormData(existingChurchFormData || formData);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Add Another Delegation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};