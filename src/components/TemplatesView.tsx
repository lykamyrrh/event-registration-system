import React, { useState } from 'react';
import { STARTER_TEMPLATES } from '../data/templates';
import { FormTemplate } from '../types';
import { 
  Sparkles, 
  Building2, 
  GraduationCap, 
  Award, 
  Check, 
  ArrowRight, 
  Eye, 
  X, 
  Layers,
  FileCheck
} from 'lucide-react';

interface TemplatesViewProps {
  onSelectTemplate: (template: FormTemplate) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onSelectTemplate }) => {
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-navy-900" />;
      case 'Building2':
        return <Building2 className="w-6 h-6 text-navy-900" />;
      case 'GraduationCap':
        return <GraduationCap className="w-6 h-6 text-navy-900" />;
      case 'Award':
        return <Award className="w-6 h-6 text-navy-900" />;
      default:
        return <Layers className="w-6 h-6 text-navy-900" />;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-navy-900">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-navy-200 p-8 md:p-10 shadow-sm">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-100 border border-navy-200 text-navy-900 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            No Coding Required
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mb-3">
            Choose Your <span className="text-gold-600">Registration Template</span>
          </h1>
          <p className="text-navy-900/80 text-base leading-relaxed">
            Select one of our professionally crafted templates to launch your registration site in seconds. Customize form fields, branding, and response messages effortlessly.
          </p>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {STARTER_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 border border-navy-200 hover:border-gold-500 transition-all duration-300 hover:shadow-md"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-gold-100 border border-navy-200">
                  {getTemplateIcon(template.iconName)}
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-ivory border border-navy-200 text-navy-900">
                  {template.badge}
                </span>
              </div>

              <h2 className="text-xl font-bold text-navy-900 mb-2 group-hover:text-gold-600 transition-colors">
                {template.name}
              </h2>
              <p className="text-navy-900/80 text-sm mb-6 leading-relaxed">
                {template.description}
              </p>

              {/* Fields Overview */}
              <div className="mb-6 p-4 rounded-xl bg-ivory border border-navy-200">
                <div className="text-xs font-semibold text-navy-900/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-navy-900" />
                  Includes {template.fields.length} Configured Fields:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {template.fields.map((f) => (
                    <span
                      key={f.id}
                      className="px-2.5 py-1 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {f.label} {f.required && <span className="text-rose-600">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPreviewTemplate(template)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ivory hover:bg-white border border-navy-200 text-navy-900 font-medium text-sm transition-all"
              >
                <Eye className="w-4 h-4 text-navy-900" />
                <span>Preview</span>
              </button>

              <button
                onClick={() => onSelectTemplate(template)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 hover:text-white text-navy-950 font-bold text-sm transition-all border border-gold-600/30 shadow-sm"
              >
                <span>Use Template</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-navy-200 p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setPreviewTemplate(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-ivory border border-navy-200 text-navy-900/70 hover:text-navy-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gold-100 border border-navy-200">
                {getTemplateIcon(previewTemplate.iconName)}
              </div>
              <div>
                <span className="text-xs font-semibold text-navy-900/70 uppercase tracking-wider">
                  Template Preview
                </span>
                <h3 className="text-2xl font-bold text-navy-900">
                  {previewTemplate.name}
                </h3>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-ivory border border-navy-200 space-y-6 mb-6">
              <div>
                <h4 className="text-xl font-bold text-navy-900 mb-1">
                  {previewTemplate.defaultTitle}
                </h4>
                <p className="text-navy-900/80 text-sm">
                  {previewTemplate.defaultDescription}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-navy-200">
                {previewTemplate.fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider">
                      {field.label} {field.required && <span className="text-rose-600">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <div className="w-full px-3 py-2 rounded-xl bg-white border border-navy-200 text-navy-900/60 text-sm">
                        {field.placeholder || 'Long answer text input...'}
                      </div>
                    ) : field.type === 'select' ? (
                      <div className="w-full px-3 py-2.5 rounded-xl bg-white border border-navy-200 text-navy-900/60 text-sm">
                        Select option: {field.options?.join(', ')}
                      </div>
                    ) : field.type === 'radio' ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {field.options?.map((opt) => (
                          <span key={opt} className="px-3 py-1 rounded-lg bg-white border border-navy-200 text-navy-900 text-xs">
                            ○ {opt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2.5 rounded-xl bg-white border border-navy-200 text-navy-900/60 text-sm">
                        {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-5 py-2.5 rounded-xl bg-ivory border border-navy-200 text-navy-900 text-sm font-medium hover:bg-white"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  onSelectTemplate(t);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 hover:text-white text-navy-950 font-bold text-sm border border-gold-600/30 shadow-sm"
              >
                <span>Use This Template</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};