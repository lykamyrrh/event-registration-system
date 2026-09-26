import React, { useState, useEffect } from 'react';
import { RegistrationEvent, FormField, FieldType, EventCategory, EventType, ExternalLink, CustomInjectorPack } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  SlidersHorizontal, 
  Check, 
  Layers,
  Calendar,
  MapPin,
  Tag,
  Link2,
  Syringe,
  Building2,
  DollarSign,
  PackagePlus,
  Sparkles,
  HeartPulse,
  Shirt,
  Save,
  FolderPlus
} from 'lucide-react';

interface FormBuilderModalProps {
  initialEvent?: Partial<RegistrationEvent>;
  onClose: () => void;
  onSave: (event: RegistrationEvent) => void;
}

const DEFAULT_INJECTOR_PACKS: CustomInjectorPack[] = [
  {
    id: 'pack_church',
    name: 'Church & Delegation',
    description: 'Church name, address, pastor, and delegation head',
    iconName: 'Building2',
    fields: [
      { id: 'f_church_name', label: 'Church Name', type: 'text', placeholder: 'e.g. Grace Fellowship Church', required: true, section: 'part1' },
      { id: 'f_church_address', label: 'Church Address', type: 'text', placeholder: 'City, Province / Region', required: true, section: 'part1' },
      { id: 'f_church_pastor', label: 'Church Pastor', type: 'text', placeholder: 'Pastor Full Name & Contact', required: true, section: 'part1' },
      { id: 'f_delegation_head', label: 'Delegation Head Name & Mobile', type: 'text', placeholder: 'Leader Full Name & Phone #', required: true, section: 'part1' }
    ]
  },
  {
    id: 'pack_payment',
    name: 'GCash / Bank Payment',
    description: 'Deposit slip reference and URL upload field',
    iconName: 'DollarSign',
    fields: [
      { id: 'f_pay_ref', label: 'GCash / Bank Reference Number', type: 'text', placeholder: 'e.g. 100293848123', required: true, section: 'part1' },
      { id: 'f_pay_link', label: 'Payment Receipt Link (Drive / Imgur)', type: 'link', placeholder: 'https://drive.google.com/file/d/...', required: true, helpText: 'Upload image to Google Drive or Imgur and paste link', section: 'part1' }
    ]
  },
  {
    id: 'pack_medical',
    name: 'Medical & Emergency',
    description: 'Allergies, medical conditions & emergency contact',
    iconName: 'HeartPulse',
    fields: [
      { id: 'f_allergies', label: 'Known Allergies / Medical Conditions', type: 'textarea', placeholder: 'List any food allergies, asthma, or medical needs...', required: false, section: 'part2' },
      { id: 'f_emergency_contact', label: 'Emergency Contact Person & Number', type: 'text', placeholder: 'Name - Relation - Phone #', required: true, section: 'part2' }
    ]
  },
  {
    id: 'pack_swag',
    name: 'Camp Merchandise & T-Shirt',
    description: 'Shirt size preference and meal preferences',
    iconName: 'Shirt',
    fields: [
      { id: 'f_shirt_size', label: 'T-Shirt Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], required: true, section: 'part2' },
      { id: 'f_diet', label: 'Dietary Preference', type: 'select', options: ['Regular / No Restriction', 'Vegetarian', 'Halal', 'No Pork / Shellfish'], required: false, section: 'part2' }
    ]
  }
];

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  initialEvent,
  onClose,
  onSave
}) => {
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');

  // Form Metadata State
  const [title, setTitle] = useState(initialEvent?.title || 'AYOS YOUTH CAMP 2026');
  const [slug, setSlug] = useState(initialEvent?.slug || 'ayos-youth-camp-2026');
  const [type, setType] = useState<EventType>(initialEvent?.type || 'pre-registration');
  const [category, setCategory] = useState<EventCategory>(initialEvent?.category || 'camp');
  const [description, setDescription] = useState(initialEvent?.description || 'Official pre-registration system for AYOS Youth Camp 2026. Register delegation details and camper rosters below.');
  const [location, setLocation] = useState(initialEvent?.location || 'Camp Assembly Grounds');
  const [eventDate, setEventDate] = useState(initialEvent?.eventDate || '2026-10-25');
  const [submitButtonText, setSubmitButtonText] = useState(initialEvent?.submitButtonText || 'Submit Delegation Registration');
  const [successMessage, setSuccessMessage] = useState(initialEvent?.successMessage || 'Thank you! Your delegation registration and camper list have been recorded.');
  
  // External / Banner Link State
  const [externalLinkLabel, setExternalLinkLabel] = useState(initialEvent?.externalLink?.label || '');
  const [externalLinkUrl, setExternalLinkUrl] = useState(initialEvent?.externalLink?.url || '');

  // Fields State
  const [fields, setFields] = useState<FormField[]>(
    initialEvent?.fields || [
      { id: 'f_church_name', label: 'Church Name', type: 'text', placeholder: 'e.g. Grace Fellowship Church', required: true, section: 'part1' },
      { id: 'f_church_address', label: 'Church Address', type: 'text', placeholder: 'City, Province / Region', required: true, section: 'part1' },
      { id: 'f_church_pastor', label: 'Church Pastor', type: 'text', placeholder: 'Pastor Full Name & Contact', required: true, section: 'part1' },
      { id: 'f_delegation_head', label: 'Delegation Head Name & Mobile', type: 'text', placeholder: 'Leader Full Name & Phone #', required: true, section: 'part1' }
    ]
  );

  // Custom Field Injector Packs State
  const [customPacks, setCustomPacks] = useState<CustomInjectorPack[]>(() => {
    try {
      const saved = localStorage.getItem('aurum_custom_injector_packs');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved custom injector packs', e);
    }
    return DEFAULT_INJECTOR_PACKS;
  });

  // Pack Creation Modal State
  const [isCreatingPack, setIsCreatingPack] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackDesc, setNewPackDesc] = useState('');
  const [newPackFields, setNewPackFields] = useState<Partial<FormField>[]>([
    { label: 'Custom Field 1', type: 'text', placeholder: 'Enter details...', required: true, section: 'part1' }
  ]);

  useEffect(() => {
    localStorage.setItem('aurum_custom_injector_packs', JSON.stringify(customPacks));
  }, [customPacks]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialEvent?.id) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
  };

  const handleAddField = (fieldType: FieldType, defaultSection: 'part1' | 'part2' = 'part1') => {
    const newField: FormField = {
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: fieldType === 'link' ? 'Website / URL Link' : `New ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`,
      type: fieldType,
      required: true,
      placeholder: fieldType === 'select' || fieldType === 'radio' ? undefined : fieldType === 'link' ? 'https://...' : 'Enter response...',
      options: fieldType === 'select' || fieldType === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      section: defaultSection
    };
    setFields([...fields, newField]);
  };

  const handleInjectPack = (pack: CustomInjectorPack) => {
    const injectedFields: FormField[] = pack.fields.map(f => ({
      ...f,
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    }));
    setFields([...fields, ...injectedFields]);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveField = (id: string) => {
    if (fields.length <= 1) {
      alert('Your registration form must have at least 1 field.');
      return;
    }
    setFields(fields.filter(f => f.id !== id));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFields(updated);
  };

  const handleSaveCustomPack = () => {
    if (!newPackName.trim()) {
      alert('Please enter a Pack Name.');
      return;
    }
    if (newPackFields.length === 0) {
      alert('Please add at least one field to your custom pack.');
      return;
    }

    const packToSave: CustomInjectorPack = {
      id: `pack_${Date.now()}`,
      name: newPackName.trim(),
      description: newPackDesc.trim() || 'Custom user-defined field pack',
      iconName: 'Sparkles',
      fields: newPackFields.map((f, idx) => ({
        id: `f_custom_${idx}_${Date.now()}`,
        label: f.label || `Custom Field ${idx + 1}`,
        type: f.type || 'text',
        placeholder: f.placeholder || '',
        required: f.required !== false,
        options: f.options,
        section: f.section || 'part1'
      }))
    };

    setCustomPacks([...customPacks, packToSave]);
    setNewPackName('');
    setNewPackDesc('');
    setNewPackFields([{ label: 'Custom Field 1', type: 'text', placeholder: 'Enter details...', required: true, section: 'part1' }]);
    setIsCreatingPack(false);
  };

  const handleDeletePack = (packId: string) => {
    if (confirm('Are you sure you want to delete this custom injector pack?')) {
      setCustomPacks(customPacks.filter(p => p.id !== packId));
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please provide an Event Title.');
      return;
    }

    const now = new Date().toISOString();
    const externalLinkObj: ExternalLink | undefined = externalLinkLabel.trim() && externalLinkUrl.trim() ? {
      label: externalLinkLabel.trim(),
      url: externalLinkUrl.trim()
    } : undefined;

    const eventToSave: RegistrationEvent = {
      id: initialEvent?.id || `evt-${Date.now()}`,
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type,
      category,
      description,
      location,
      eventDate,
      status: initialEvent?.status || 'active',
      fields,
      created_at: initialEvent?.created_at || now,
      last_used_at: now,
      submitButtonText,
      successMessage,
      externalLink: externalLinkObj,
      isMultiPart: type === 'pre-registration'
    };

    onSave(eventToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-hidden">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-sm">
              <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  No-Code Form Builder & Field Injector
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  SUPABASE READY
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                {initialEvent?.id ? 'Edit Registration Site' : 'Create Registration Site'}
              </h2>
            </div>
          </div>

          {/* View Mode Toggle & Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 rounded-xl bg-slate-200/80 border border-slate-300/60">
              <button
                onClick={() => setActiveView('editor')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'editor'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Form Editor
              </button>
              <button
                onClick={() => setActiveView('preview')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'preview'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-8">
          {activeView === 'editor' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Metadata & Links */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Tag className="w-4 h-4 text-slate-600" />
                    Event Metadata
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Event Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition shadow-sm"
                      placeholder="e.g. AYOS YOUTH CAMP 2026"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Event Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as EventCategory)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-800 transition shadow-sm"
                      >
                        <option value="camp">Youth Camp / Retreat</option>
                        <option value="general">General Event</option>
                        <option value="conference">Conference / Summit</option>
                        <option value="workshop">Workshop / Webinar</option>
                        <option value="gala">Gala / Special Occasion</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Registration Type
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as EventType)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-800 transition shadow-sm"
                      >
                        <option value="pre-registration">Two-Part Pre-Registration</option>
                        <option value="registration">Standard Registration</option>
                        <option value="waitlist">Waitlist</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Event Date & Location
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="bg-transparent border-none text-slate-800 text-xs font-semibold focus:outline-none w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 shadow-sm">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Mount Zion Camp Grounds"
                          className="bg-transparent border-none text-slate-800 text-xs font-medium focus:outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Description / Banner Overview
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:border-slate-800 transition shadow-sm"
                    />
                  </div>

                  {/* Insert Link Feature */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-amber-600" />
                      Insert External Link / Guidelines URL
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={externalLinkLabel}
                        onChange={(e) => setExternalLinkLabel(e.target.value)}
                        placeholder="Link Label (e.g. Camp Guidelines & GCash QR)"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:border-slate-800 focus:outline-none font-medium shadow-sm"
                      />
                      <input
                        type="url"
                        value={externalLinkUrl}
                        onChange={(e) => setExternalLinkUrl(e.target.value)}
                        placeholder="https://example.com/camp-payment-info"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:border-slate-800 focus:outline-none font-mono shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Submit Button Label
                    </label>
                    <input
                      type="text"
                      value={submitButtonText}
                      onChange={(e) => setSubmitButtonText(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-800 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Success Confirmation Message
                    </label>
                    <textarea
                      rows={2}
                      value={successMessage}
                      onChange={(e) => setSuccessMessage(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Form Fields & Customizable Injector */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* CUSTOMIZABLE FIELD INJECTOR SYSTEM */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-amber-600" />
                        Customizable Field Injector
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Select a pre-configured pack or create custom re-usable field packs.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCreatingPack(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
                    >
                      <PackagePlus className="w-3.5 h-3.5 text-amber-400" />
                      + Create Custom Pack
                    </button>
                  </div>

                  {/* Injector Pack Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition-all flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-xs">
                              {pack.iconName === 'Building2' && <Building2 className="w-4 h-4 text-slate-700" />}
                              {pack.iconName === 'DollarSign' && <DollarSign className="w-4 h-4 text-amber-600" />}
                              {pack.iconName === 'HeartPulse' && <HeartPulse className="w-4 h-4 text-rose-500" />}
                              {pack.iconName === 'Shirt' && <Shirt className="w-4 h-4 text-emerald-600" />}
                              {pack.iconName === 'Sparkles' && <Sparkles className="w-4 h-4 text-purple-600" />}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900">{pack.name}</div>
                              <div className="text-[10px] text-slate-500 line-clamp-1">{pack.description}</div>
                            </div>
                          </div>

                          {!DEFAULT_INJECTOR_PACKS.some(p => p.id === pack.id) && (
                            <button
                              type="button"
                              onClick={() => handleDeletePack(pack.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                              title="Delete custom pack"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {pack.fields.length} {pack.fields.length === 1 ? 'Field' : 'Fields'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInjectPack(pack)}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-700 text-[11px] font-extrabold transition flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-amber-500" />
                            Inject Fields
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Create New Pack Inline Builder */}
                  {isCreatingPack && (
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <FolderPlus className="w-4 h-4 text-amber-600" />
                          New Custom Injector Pack Builder
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingPack(false)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={newPackName}
                          onChange={(e) => setNewPackName(e.target.value)}
                          placeholder="Pack Name (e.g. Medical & Health Consent)"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-800"
                        />
                        <input
                          type="text"
                          value={newPackDesc}
                          onChange={(e) => setNewPackDesc(e.target.value)}
                          placeholder="Short description..."
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">Pack Fields:</span>
                        {newPackFields.map((f, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={f.label || ''}
                              onChange={(e) => {
                                const updated = [...newPackFields];
                                updated[idx].label = e.target.value;
                                setNewPackFields(updated);
                              }}
                              placeholder="Field Name / Label"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-medium"
                            />
                            <select
                              value={f.type || 'text'}
                              onChange={(e) => {
                                const updated = [...newPackFields];
                                updated[idx].type = e.target.value as FieldType;
                                setNewPackFields(updated);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-medium"
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="select">Dropdown</option>
                              <option value="link">URL Link</option>
                              <option value="number">Number</option>
                            </select>
                            <select
                              value={f.section || 'part1'}
                              onChange={(e) => {
                                const updated = [...newPackFields];
                                updated[idx].section = e.target.value as 'part1' | 'part2';
                                setNewPackFields(updated);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-medium"
                            >
                              <option value="part1">Part 1 (Church)</option>
                              <option value="part2">Part 2 (Camper)</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setNewPackFields(newPackFields.filter((_, i) => i !== idx))}
                              disabled={newPackFields.length <= 1}
                              className="p-1.5 text-rose-500 hover:text-rose-700 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setNewPackFields([...newPackFields, { label: '', type: 'text', required: true, section: 'part1' }])}
                            className="text-xs font-bold text-slate-800 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Field to Pack
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveCustomPack}
                            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5 text-amber-400" /> Save Pack
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Main Form Fields List */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-600" />
                      Active Form Fields ({fields.length})
                    </h3>
                  </div>

                  {/* Add Standard Single Field Toolbar */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Add Single Standard Field:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => handleAddField('text')} className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-xs">
                        <Plus className="w-3 h-3 text-amber-600" /> Text
                      </button>
                      <button type="button" onClick={() => handleAddField('email')} className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-xs">
                        <Plus className="w-3 h-3 text-amber-600" /> Email
                      </button>
                      <button type="button" onClick={() => handleAddField('select')} className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-xs">
                        <Plus className="w-3 h-3 text-amber-600" /> Dropdown
                      </button>
                      <button type="button" onClick={() => handleAddField('radio')} className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-xs">
                        <Plus className="w-3 h-3 text-amber-600" /> Radio
                      </button>
                      <button type="button" onClick={() => handleAddField('link')} className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1 shadow-xs">
                        <Link2 className="w-3 h-3 text-amber-600" /> URL Link
                      </button>
                      <button type="button" onClick={() => handleAddField('textarea')} className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-xs">
                        <Plus className="w-3 h-3 text-amber-600" /> Textarea
                      </button>
                    </div>
                  </div>

                  {/* Configured Fields List */}
                  <div className="space-y-3 pt-2">
                    {fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase text-slate-700 px-2 py-0.5 rounded bg-slate-200 border border-slate-300">
                              {field.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 'down')}
                              disabled={idx === fields.length - 1}
                              className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(field.id)}
                              className="p-1 rounded bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 ml-2 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Field Renaming & Placeholder */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Field Label</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:border-slate-800 focus:outline-none shadow-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Placeholder Text</label>
                            <input
                              type="text"
                              value={field.placeholder || ''}
                              onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:border-slate-800 focus:outline-none shadow-xs"
                              placeholder="e.g. Enter value..."
                            />
                          </div>
                        </div>

                        {/* Options for Select / Radio */}
                        {(field.type === 'select' || field.type === 'radio') && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Choices / Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => handleUpdateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:border-slate-800 focus:outline-none shadow-xs"
                              placeholder="e.g. Option A, Option B, Option C"
                            />
                          </div>
                        )}

                        {/* Section Target & Required Checkbox */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Deploy Section Target
                            </label>
                            <select
                              value={field.section || 'part1'}
                              onChange={(e) => handleUpdateField(field.id, { section: e.target.value as 'part1' | 'part2' })}
                              className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:border-slate-800 focus:outline-none shadow-xs"
                            >
                              <option value="part1">Part 1: Church & Delegation Information</option>
                              <option value="part2">Part 2: Camper Roster Listing</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 pt-5">
                            <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                              />
                              <span>Required Field</span>
                            </label>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                </div>
              </div>

            </div>
          ) : (
            /* Live Form Preview View */
            <div className="max-w-2xl mx-auto py-4">
              <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-xl space-y-6 font-sans">
                <div className="border-b border-slate-200 pb-6">
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 border border-slate-200 text-slate-700 uppercase tracking-wider">
                    {type}
                  </span>
                  <h1 className="text-3xl font-extrabold text-slate-900 font-display mt-3 mb-2">
                    {title}
                  </h1>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    {description}
                  </p>

                  {externalLinkLabel && externalLinkUrl && (
                    <div className="mb-4">
                      <a
                        href={externalLinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-bold transition"
                      >
                        <Link2 className="w-4 h-4 text-amber-600" />
                        <span>{externalLinkLabel}</span>
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {eventDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {location}
                    </span>
                  </div>
                </div>

                <div className="space-y-5">
                  {fields.map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {f.label} {f.required && <span className="text-rose-500">*</span>}
                        </label>
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-100">
                          {f.section === 'part2' ? 'Part 2 (Camper)' : 'Part 1 (Church)'}
                        </span>
                      </div>

                      {f.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          disabled
                          placeholder={f.placeholder || 'Enter response...'}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm"
                        />
                      ) : f.type === 'select' ? (
                        <select disabled className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                          <option>-- Select option --</option>
                          {f.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.type === 'radio' ? (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {f.options?.map((o) => (
                            <label key={o} className="flex items-center gap-2 text-xs text-slate-700">
                              <input type="radio" disabled name={f.id} />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type={f.type === 'link' ? 'url' : f.type}
                          disabled
                          placeholder={f.placeholder || (f.type === 'link' ? 'https://...' : 'Enter response...')}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    disabled
                    className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md mt-4 cursor-not-allowed opacity-90"
                  >
                    {submitButtonText}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-100 transition shadow-xs"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition"
          >
            <Check className="w-4 h-4 text-amber-400" />
            <span>Publish & Save Site</span>
          </button>
        </div>

      </div>
    </div>
  );
};