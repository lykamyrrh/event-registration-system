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
        return <Sparkles className="w-6 h-6 text-amber-500" />;
      case 'Building2':
        return <Building2 className="w-6 h-6 text-amber-500" />;
      case 'GraduationCap':
        return <GraduationCap className="w-6 h-6 text-amber-500" />;
      case 'Award':
        return <Award className="w-6 h-6 text-amber-500" />;
      default:
        return <Layers className="w-6 h-6 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 md:p-10 shadow-sm">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            No Coding Required
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Choose Your <span className="text-amber-500">Registration Template</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Select one of our professionally crafted templates to launch your registration site in seconds. Customize form fields, branding, and response messages effortlessly.
          </p>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {STARTER_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="group relative flex flex-col justify-between rounded-2xl bg-slate-900 p-6 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  {getTemplateIcon(template.iconName)}
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                  {template.badge}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                {template.name}
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                {template.description}
              </p>

              {/* Fields Overview */}
              <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-amber-500" />
                  Includes {template.fields.length} Configured Fields:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {template.fields.map((f) => (
                    <span
                      key={f.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-gold-300" />
                      {f.label} {f.required && <span className="text-amber-500">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPreviewTemplate(template)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-sm transition-all"
              >
                <Eye className="w-4 h-4 text-slate-300" />
                <span>Preview</span>
              </button>

              <button
                onClick={() => onSelectTemplate(template)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all border border-amber-600/30 shadow-md shadow-amber-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-slate-100">
            <button
              onClick={() => setPreviewTemplate(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                {getTemplateIcon(previewTemplate.iconName)}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Template Preview
                </span>
                <h3 className="text-2xl font-bold text-white">
                  {previewTemplate.name}
                </h3>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 mb-6">
              <div>
                <h4 className="text-xl font-bold text-white mb-1">
                  {previewTemplate.defaultTitle}
                </h4>
                <p className="text-slate-400 text-sm">
                  {previewTemplate.defaultDescription}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                {previewTemplate.fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <div className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-sm">
                        {field.placeholder || 'Long answer text input...'}
                      </div>
                    ) : field.type === 'select' ? (
                      <div className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-sm">
                        Select option: {field.options?.join(', ')}
                      </div>
                    ) : field.type === 'radio' ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {field.options?.map((opt) => (
                          <span key={opt} className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                            ○ {opt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-sm">
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
                className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  onSelectTemplate(t);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm border border-amber-600/30 shadow-md shadow-amber-500/20 transition"
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