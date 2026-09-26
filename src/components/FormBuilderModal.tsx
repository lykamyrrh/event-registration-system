import React, { useState } from 'react';
import { RegistrationEvent, FormField, FieldType, EventCategory, EventType, ExternalLink } from '../types';
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
  DollarSign
} from 'lucide-react';

interface FormBuilderModalProps {
  initialEvent?: Partial<RegistrationEvent>;
  onClose: () => void;
  onSave: (event: RegistrationEvent) => void;
}

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  initialEvent,
  onClose,
  onSave
}) => {
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');

  // Form Metadata State
  const [title, setTitle] = useState(initialEvent?.title || 'New Registration Event');
  const [slug, setSlug] = useState(initialEvent?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const [type, setType] = useState<EventType>(initialEvent?.type || 'registration');
  const [category, setCategory] = useState<EventCategory>(initialEvent?.category || 'general');
  const [description, setDescription] = useState(initialEvent?.description || 'Join us for this upcoming occasion. Please complete your registration details below.');
  const [location, setLocation] = useState(initialEvent?.location || 'Main Venue / Retreat Center');
  const [eventDate, setEventDate] = useState(initialEvent?.eventDate || '2026-10-25');
  const [submitButtonText, setSubmitButtonText] = useState(initialEvent?.submitButtonText || 'Confirm Registration');
  const [successMessage, setSuccessMessage] = useState(initialEvent?.successMessage || 'Thank you! Your registration details have been received.');
  
  // External / Banner Link State
  const [externalLinkLabel, setExternalLinkLabel] = useState(initialEvent?.externalLink?.label || '');
  const [externalLinkUrl, setExternalLinkUrl] = useState(initialEvent?.externalLink?.url || '');

  // Fields State
  const [fields, setFields] = useState<FormField[]>(
    initialEvent?.fields || [
      { id: 'f_name', label: 'Full Name', type: 'text', placeholder: 'e.g. John Doe', required: true },
      { id: 'f_email', label: 'Email Address', type: 'email', placeholder: 'john@example.com', required: true }
    ]
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialEvent?.id) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
  };

  const handleAddField = (fieldType: FieldType) => {
    const newField: FormField = {
      id: `f_${Date.now()}`,
      label: fieldType === 'link' ? 'Website / URL Link' : `New ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`,
      type: fieldType,
      required: true,
      placeholder: fieldType === 'select' || fieldType === 'radio' ? undefined : fieldType === 'link' ? 'https://...' : 'Enter response...',
      options: fieldType === 'select' || fieldType === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : undefined
    };
    setFields([...fields, newField]);
  };

  // Custom Field Injector Presets
  const handleInjectPreset = (presetType: 'church' | 'payment' | 'custom_link') => {
    if (presetType === 'church') {
      const churchFields: FormField[] = [
        { id: `f_church_${Date.now()}`, label: 'Church Name', type: 'text', placeholder: 'e.g. Grace Fellowship Church', required: true },
        { id: `f_address_${Date.now()}`, label: 'Church Address', type: 'text', placeholder: 'City, Province / State', required: true },
        { id: `f_pastor_${Date.now()}`, label: 'Church Pastor', type: 'text', placeholder: 'Pastor Name', required: true },
        { id: `f_delegation_${Date.now()}`, label: 'Delegation Head Name & Contact', type: 'text', placeholder: 'Leader Name & Phone', required: true }
      ];
      setFields([...fields, ...churchFields]);
    } else if (presetType === 'payment') {
      const paymentField: FormField = {
        id: `f_pay_link_${Date.now()}`,
        label: 'Payment Receipt / Deposit Slip Link',
        type: 'link',
        placeholder: 'https://drive.google.com/your-payment-receipt',
        required: false,
        helpText: 'Paste link to Google Drive, Dropbox, or Image URL of receipt'
      };
      setFields([...fields, paymentField]);
    } else if (presetType === 'custom_link') {
      const linkField: FormField = {
        id: `f_link_${Date.now()}`,
        label: 'Custom Web Link / Reference URL',
        type: 'link',
        placeholder: 'https://',
        required: false
      };
      setFields([...fields, linkField]);
    }
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
      externalLink: externalLinkObj
    };

    onSave(eventToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-3xl glass-panel border border-gold-500/40 shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-gold-500/30">
              <SlidersHorizontal className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                No-Code Form Builder & Field Injector
              </span>
              <h2 className="text-xl font-bold text-slate-100 font-display">
                {initialEvent?.id ? 'Edit Registration Site' : 'Create New Registration Site'}
              </h2>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => setActiveView('editor')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'editor'
                    ? 'bg-gold-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Form Editor
              </button>
              <button
                onClick={() => setActiveView('preview')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'preview'
                    ? 'bg-gold-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {activeView === 'editor' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Metadata & External Links */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-gold-300 uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gold-400" />
                    Site Information
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Event Title <span className="text-gold-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="field-input-dark"
                      placeholder="e.g. AYOS YOUTH CAMP 2026"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as EventCategory)}
                      className="field-input-dark"
                    >
                      <option value="camp">Youth Camp / Retreat</option>
                      <option value="general">General Event</option>
                      <option value="conference">Conference / Summit</option>
                      <option value="workshop">Workshop / Webinar</option>
                      <option value="gala">Gala / Special Occasion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Event Date & Location
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-300">
                        <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="bg-transparent border-none text-slate-200 text-sm focus:outline-none w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-300">
                        <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Mount Zion Camp Grounds"
                          className="bg-transparent border-none text-slate-200 text-sm focus:outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Description / Overview
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="field-input-dark"
                    />
                  </div>

                  {/* Insert Link Feature */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-xs font-semibold text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-gold-400" />
                      Insert External Banner / Payment Link
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={externalLinkLabel}
                        onChange={(e) => setExternalLinkLabel(e.target.value)}
                        placeholder="Link Label (e.g. Camp Rules & Payment Info)"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-gold-400 focus:outline-none"
                      />
                      <input
                        type="url"
                        value={externalLinkUrl}
                        onChange={(e) => setExternalLinkUrl(e.target.value)}
                        placeholder="https://example.com/payment-guidelines"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-gold-400 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Submit Button Label
                    </label>
                    <input
                      type="text"
                      value={submitButtonText}
                      onChange={(e) => setSubmitButtonText(e.target.value)}
                      className="field-input-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Success Confirmation Message
                    </label>
                    <textarea
                      rows={2}
                      value={successMessage}
                      onChange={(e) => setSuccessMessage(e.target.value)}
                      className="field-input-dark"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Form Fields & Custom Field Injector */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* CUSTOM FIELD INJECTOR TOOLKIT */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-gold-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Syringe className="w-4 h-4 text-gold-400" />
                      Custom Field Injector
                    </span>
                    <span className="text-[11px] text-slate-400">Inject pre-configured field packs</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleInjectPreset('church')}
                      className="p-2.5 rounded-xl bg-slate-950 border border-gold-500/30 hover:border-gold-400 text-slate-200 text-xs text-left transition-all"
                    >
                      <Building2 className="w-4 h-4 text-gold-400 mb-1" />
                      <div className="font-bold">Church & Delegation</div>
                      <div className="text-[10px] text-slate-400">+4 Church fields</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInjectPreset('payment')}
                      className="p-2.5 rounded-xl bg-slate-950 border border-gold-500/30 hover:border-gold-400 text-slate-200 text-xs text-left transition-all"
                    >
                      <DollarSign className="w-4 h-4 text-gold-400 mb-1" />
                      <div className="font-bold">Payment Link</div>
                      <div className="text-[10px] text-slate-400">+1 Deposit URL link</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInjectPreset('custom_link')}
                      className="p-2.5 rounded-xl bg-slate-950 border border-gold-500/30 hover:border-gold-400 text-slate-200 text-xs text-left transition-all"
                    >
                      <Link2 className="w-4 h-4 text-gold-400 mb-1" />
                      <div className="font-bold">Custom Web Link</div>
                      <div className="text-[10px] text-slate-400">+1 Web URL field</div>
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gold-300 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gold-400" />
                      Form Fields ({fields.length})
                    </h3>
                  </div>

                  {/* Add Standard Field Types Toolbar */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Click to add field:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => handleAddField('text')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3 text-gold-400" /> Text
                      </button>
                      <button type="button" onClick={() => handleAddField('email')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3 text-gold-400" /> Email
                      </button>
                      <button type="button" onClick={() => handleAddField('select')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3 text-gold-400" /> Dropdown
                      </button>
                      <button type="button" onClick={() => handleAddField('radio')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3 text-gold-400" /> Radio
                      </button>
                      <button type="button" onClick={() => handleAddField('link')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-gold-500/40 text-gold-300 text-xs font-medium flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-gold-400" /> Link URL
                      </button>
                      <button type="button" onClick={() => handleAddField('checkbox')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3 text-gold-400" /> Checkbox
                      </button>
                    </div>
                  </div>

                  {/* List of Configured Fields */}
                  <div className="space-y-4 pt-2">
                    {fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-gold-500/30 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-900 border border-gold-500/40 text-gold-400 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold uppercase text-gold-300 px-2 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">
                              {field.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 'down')}
                              disabled={idx === fields.length - 1}
                              className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(field.id)}
                              className="p-1 rounded bg-slate-900 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Field Renaming & Placeholder */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Field Name / Label (Editable)</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-gold-400 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Placeholder Text</label>
                            <input
                              type="text"
                              value={field.placeholder || ''}
                              onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-gold-400 focus:outline-none"
                              placeholder="e.g. Enter value..."
                            />
                          </div>
                        </div>

                        {/* Options for Select / Radio */}
                        {(field.type === 'select' || field.type === 'radio') && (
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Choices / Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => handleUpdateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-gold-400 focus:outline-none"
                              placeholder="e.g. Camper, Delegation Head, Pastor"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                              className="rounded accent-gold-500"
                            />
                            <span>Required Field</span>
                          </label>
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
              <div className="rounded-3xl glass-panel border border-gold-500/40 p-8 shadow-2xl space-y-6">
                <div className="border-b border-slate-800 pb-6">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gold-500/10 border border-gold-500/30 text-gold-300 uppercase tracking-wider">
                    {type}
                  </span>
                  <h1 className="text-3xl font-extrabold text-slate-100 font-display mt-3 mb-2">
                    {title}
                  </h1>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">
                    {description}
                  </p>

                  {externalLinkLabel && externalLinkUrl && (
                    <div className="mb-4">
                      <a
                        href={externalLinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 border border-gold-500/40 text-gold-300 hover:text-gold-200 text-xs font-bold"
                      >
                        <Link2 className="w-4 h-4 text-gold-400" />
                        <span>{externalLinkLabel}</span>
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gold-400" />
                      {eventDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gold-400" />
                      {location}
                    </span>
                  </div>
                </div>

                <div className="space-y-5">
                  {fields.map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                        {f.label} {f.required && <span className="text-gold-400">*</span>}
                      </label>

                      {f.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          disabled
                          placeholder={f.placeholder || 'Enter response...'}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm"
                        />
                      ) : f.type === 'select' ? (
                        <select disabled className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm">
                          <option>-- Select option --</option>
                          {f.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.type === 'radio' ? (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {f.options?.map((o) => (
                            <label key={o} className="flex items-center gap-2 text-xs text-slate-300">
                              <input type="radio" disabled name={f.id} className="accent-gold-500" />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type={f.type === 'link' ? 'url' : f.type}
                          disabled
                          placeholder={f.placeholder || (f.type === 'link' ? 'https://...' : 'Enter response...')}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    disabled
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-slate-950 font-bold text-sm shadow-lg shadow-gold-500/20 mt-4 cursor-not-allowed opacity-90"
                  >
                    {submitButtonText}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 via-gold-400 to-gold-400 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-gold-500/25"
          >
            <Check className="w-4 h-4" />
            <span>Publish & Save Site</span>
          </button>
        </div>

      </div>
    </div>
  );
};