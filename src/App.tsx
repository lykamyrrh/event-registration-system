import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RegistrationEvent,
  RegistrationSubmission,
  SystemLog,
  SupabaseConfig,
  FormTemplate
} from './types';
import type { SubmissionStatus } from './types';
import { getSavedSupabaseConfig, getSupabaseClient } from './lib/supabase';

// Components
import { Navbar } from './components/Navbar';
import { EventsView } from './components/EventsView';
import { TemplatesView } from './components/TemplatesView';
import { SubmissionsView } from './components/SubmissionsView';
import { ArchiveView } from './components/ArchiveView';
import { FormBuilderModal } from './components/FormBuilderModal';
import { PublicRegistrationPage } from './components/PublicRegistrationPage';
import { SupabaseModal } from './components/SupabaseModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PUBLIC_FORM_HASH_RE = /^#\/form\/([a-zA-Z0-9-]+)$/;

const safeRandomUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const makeLogId = (): string =>
  `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────
export function App() {
  const [activeTab, setActiveTab] = useState<
    'events' | 'templates' | 'submissions' | 'archive' | 'supabase'
  >('events');

  // ── Persistent State ────────────────────────────────────────
  const [events, setEvents] = useState<RegistrationEvent[]>(() => {
    const saved = localStorage.getItem('aurum_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [submissions, setSubmissions] = useState<RegistrationSubmission[]>(() => {
    const saved = localStorage.getItem('aurum_submissions');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem('aurum_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(
    getSavedSupabaseConfig
  );

  // ── Modals & Navigation ─────────────────────────────────────
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<
    Partial<RegistrationEvent> | undefined
  >(undefined);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [publicEventId, setPublicEventId] = useState<string | null>(null);
  const [selectedSubmissionsEventId, setSelectedSubmissionsEventId] = useState<
    string | undefined
  >(undefined);

  // Track whether the user has already synced once, so we don't wipe
  // local-only data on the initial connect.
  const hasSyncedRef = useRef(false);

  // ── Log helper ─────────────────────────────────────────────
  const pushLog = useCallback(
    (
      action: string,
      details: string,
      type: SystemLog['type'],
      eventId?: string
    ) => {
      const newLog: SystemLog = {
        id: makeLogId(),
        timestamp: new Date().toISOString(),
        action,
        details,
        eventId,
        type
      };
      setLogs(prev => [newLog, ...prev]);
    },
    []
  );

  // ── Persist local cache ────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('aurum_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('aurum_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('aurum_logs', JSON.stringify(logs));
  }, [logs]);

  // ── Load from Supabase when config changes ─────────────────
  useEffect(() => {
    const client = getSupabaseClient();

    // No client → user disconnected. Leave local data alone so they
    // can keep working offline. Do not clear anything.
    if (!client) return;

    let cancelled = false;

    const loadFromSupabase = async () => {
      const [
        { data: eventRows, error: eventError },
        { data: registrationRows, error: registrationError }
      ] = await Promise.all([
        client.from('events').select('*').order('created_at', { ascending: false }),
        client
          .from('registrations')
          .select('*')
          .order('submitted_at', { ascending: false })
      ]);

      if (cancelled) return;

      if (eventError) {
        console.warn('Supabase events load error:', eventError);
      } else if (eventRows) {
        const mappedEvents: RegistrationEvent[] = eventRows.map((row: any) => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          type: row.type,
          category: row.category,
          description: row.description || '',
          location: row.location || undefined,
          eventDate: row.event_date || undefined,
          status: row.status,
          themeBanner: row.theme_banner || undefined,
          fields: Array.isArray(row.fields) ? row.fields : [],
          created_at: row.created_at,
          last_used_at: row.last_used_at,
          maxRegistrations: row.max_registrations ?? undefined,
          submitButtonText: row.submit_button_text ?? undefined,
          successMessage: row.success_message ?? undefined,
          externalLink: row.external_link ?? undefined,
          isMultiPart: row.is_multi_part ?? undefined
        }));

        // Merge strategy:
        // - Supabase is authoritative for any ID it already knows.
        // - Keep local-only events that have never been synced (they'll
        //   get pushed on next save).
        // - On the very first sync we still prefer Supabase's full set
        //   so the dashboard reflects the server, but we never drop
        //   a local event whose ID isn't present on the server.
        setEvents(prev => {
          if (!hasSyncedRef.current) {
            hasSyncedRef.current = true;
            const serverIds = new Set(mappedEvents.map(e => e.id));
            const localOnly = prev.filter(e => !serverIds.has(e.id));
            return [...localOnly, ...mappedEvents];
          }
          const serverIds = new Set(mappedEvents.map(e => e.id));
          const localOnly = prev.filter(e => !serverIds.has(e.id));
          return [...localOnly, ...mappedEvents];
        });
      }

      if (registrationError) {
        console.warn('Supabase registrations load error:', registrationError);
      } else if (registrationRows) {
        const mappedSubmissions: RegistrationSubmission[] = registrationRows.map(
          (row: any) => ({
            id: row.id,
            eventId: row.event_id,
            submitted_at: row.submitted_at,
            status: row.status,
            data: row.data || {},
            notes: row.notes || undefined
          })
        );

        setSubmissions(prev => {
          const serverIds = new Set(mappedSubmissions.map(s => s.id));
          const localOnly = prev.filter(s => !serverIds.has(s.id));
          return [...localOnly, ...mappedSubmissions];
        });
      }
    };

    loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [supabaseConfig?.url, supabaseConfig?.anonKey]);

  // ── Hash routing for public form ──────────────────────────
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '';
      const match = hash.match(PUBLIC_FORM_HASH_RE);
      setPublicEventId(match ? match[1] : null);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ── Handler: Add or Update Event ──────────────────────────
  const handleSaveEvent = async (savedEvent: RegistrationEvent) => {
    const client = getSupabaseClient();
    const existingEvent = events.find(e => e.id === savedEvent.id);
    const existingIndex = events.findIndex(e => e.id === savedEvent.id);
    const now = new Date().toISOString();

    const eventId =
      existingEvent?.id ||
      (savedEvent.id && UUID_RE.test(savedEvent.id)
        ? savedEvent.id
        : safeRandomUUID());

    const eventToSave: RegistrationEvent = {
      ...savedEvent,
      id: eventId,
      created_at: savedEvent.created_at || now,
      last_used_at: savedEvent.last_used_at || now
    };

    setEvents(prev =>
      existingIndex >= 0
        ? prev.map(e => (e.id === savedEvent.id ? eventToSave : e))
        : [eventToSave, ...prev]
    );

    setIsFormBuilderOpen(false);
    setEditingEvent(undefined);

    pushLog(
      existingIndex >= 0 ? 'Event Updated' : 'Event Created',
      existingIndex >= 0
        ? `Updated registration site "${eventToSave.title}"`
        : `Created new registration site "${eventToSave.title}"`,
      'info',
      eventToSave.id
    );

    if (client) {
      const { error } = await client.from('events').upsert(
        {
          id: eventToSave.id,
          title: eventToSave.title,
          slug: eventToSave.slug,
          type: eventToSave.type,
          category: eventToSave.category,
          description: eventToSave.description,
          location: eventToSave.location || null,
          event_date: eventToSave.eventDate || null,
          status: eventToSave.status,
          fields: eventToSave.fields || [],
          max_registrations: eventToSave.maxRegistrations ?? null,
          submit_button_text: eventToSave.submitButtonText || null,
          success_message: eventToSave.successMessage || null,
          created_at: eventToSave.created_at,
          last_used_at: eventToSave.last_used_at
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Supabase event save error:', error);
        alert(
          `Event was saved locally, but Supabase could not save it.\n\n${error.message}`
        );
      } else {
        console.log('Event saved to Supabase:', eventToSave.id);
      }
    }
  };

  // ── Handler: Select Template ──────────────────────────────
  const handleSelectTemplate = (template: FormTemplate) => {
    const draft: Partial<RegistrationEvent> = {
      title: template.defaultTitle,
      type: template.defaultType,
      category: template.category,
      description: template.defaultDescription,
      fields: template.fields,
      submitButtonText:
        template.defaultType === 'pre-registration'
          ? 'Submit Pre-Registration'
          : 'Confirm Registration',
      successMessage:
        'Thank you! Your registration details have been received.'
    };
    setEditingEvent(draft);
    setIsFormBuilderOpen(true);
  };

  // ── Handler: Archive Event ────────────────────────────────
  const handleArchiveEvent = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    setEvents(prev =>
      prev.map(e => (e.id === eventId ? { ...e, status: 'archived' as const } : e))
    );

    pushLog(
      'Event Archived',
      `Archived site "${ev.title}" to History Vault`,
      'warning',
      eventId
    );

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client
        .from('events')
        .update({ status: 'archived' })
        .eq('id', eventId);

      if (error) {
        console.warn('Supabase archive error:', error);
        alert(
          `Event was archived locally, but Supabase could not update it.\n\n${error.message}`
        );
      }
    }
  };

  // ── Handler: Restore Event ────────────────────────────────
  const handleRestoreEvent = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    setEvents(prev =>
      prev.map(e => (e.id === eventId ? { ...e, status: 'active' as const } : e))
    );

    pushLog(
      'Event Restored',
      `Restored site "${ev.title}" back to active dashboard`,
      'success',
      eventId
    );

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client
        .from('events')
        .update({ status: 'active' })
        .eq('id', eventId);

      if (error) {
        console.warn('Supabase restore error:', error);
        alert(
          `Event was restored locally, but Supabase could not update it.\n\n${error.message}`
        );
      }
    }
  };

  // ── Handler: Submit Public Registration ───────────────────
  // NOTE: The public form (PublicRegistrationPage) currently writes to
  // Supabase directly. This handler remains for any internal callers
  // that want to funnel through App's state. It uses functional
  // updates and reconciles the Supabase-generated UUID with the
  // local placeholder ID.
  const handleSubmitRegistration = async (
    eventId: string,
    formData: Record<string, any>
  ) => {
    const now = new Date().toISOString();
    const localId = `sub-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const newSubmission: RegistrationSubmission = {
      id: localId,
      eventId,
      submitted_at: now,
      status: 'confirmed',
      data: formData
    };

    setSubmissions(prev => [newSubmission, ...prev]);
    setEvents(prev =>
      prev.map(e => (e.id === eventId ? { ...e, last_used_at: now } : e))
    );

    const ev = events.find(e => e.id === eventId);
    const registrantName =
      formData.f_church_name ||
      formData.f_name ||
      formData.f_fullname ||
      formData.f_guest_name ||
      'Attendee';

    pushLog(
      'New Registration Submitted',
      `${registrantName} registered for ${ev?.title || 'Event'}`,
      'success',
      eventId
    );

    const client = getSupabaseClient();
    if (client) {
      const { data: inserted, error } = await client
        .from('registrations')
        .insert({
          event_id: eventId,
          submitted_at: now,
          status: 'confirmed',
          data: formData
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Supabase submission insert error:', error);
      } else if (inserted) {
        // Replace the local placeholder ID with the real Supabase UUID.
        setSubmissions(prev =>
          prev.map(s =>
            s.id === localId ? { ...s, id: inserted.id } : s
          )
        );
      }
    }
  };

  // ── Handler: Update Submission Data ───────────────────────
  const handleUpdateSubmissionData = (
    submissionId: string,
    updatedData: Record<string, any>
  ) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === submissionId ? { ...s, data: updatedData } : s
      )
    );

    const client = getSupabaseClient();
    if (client) {
      client
        .from('registrations')
        .update({ data: updatedData })
        .eq('id', submissionId)
        .then(({ error }) => {
          if (error) console.warn('Supabase submission update error:', error);
        });
    }
  };

  // ── Handler: Update Submission Status ─────────────────────
  const handleUpdateSubmissionStatus = (
    submissionId: string,
    newStatus: SubmissionStatus
  ) => {
    setSubmissions(prev =>
      prev.map(s => (s.id === submissionId ? { ...s, status: newStatus } : s))
    );

    const client = getSupabaseClient();
    if (client) {
      client
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', submissionId)
        .then(({ error }) => {
          if (error)
            console.warn('Supabase submission status update error:', error);
        });
    }
  };

  // ── Handler: Delete Submission ────────────────────────────
  const handleDeleteSubmission = (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this registration record?')) {
      return;
    }

    setSubmissions(prev => prev.filter(s => s.id !== submissionId));

    const client = getSupabaseClient();
    if (client) {
      client
        .from('registrations')
        .delete()
        .eq('id', submissionId)
        .then(({ error }) => {
          if (error) console.warn('Supabase submission delete error:', error);
        });
    }
  };

  // ── AI Assistant Quick Actions Router ─────────────────────
  const handleAIAction = (actionType: string, payload?: any) => {
    if (
      actionType === 'create_event' &&
      payload &&
      typeof payload === 'object'
    ) {
      setEditingEvent(payload);
      setIsFormBuilderOpen(true);
      setIsAIAssistantOpen(false);
    } else if (actionType === 'open_templates') {
      setActiveTab('templates');
      setIsAIAssistantOpen(false);
    } else if (actionType === 'open_table') {
      setActiveTab('submissions');
      setIsAIAssistantOpen(false);
    } else if (actionType === 'open_archive') {
      setActiveTab('archive');
      setIsAIAssistantOpen(false);
    } else if (actionType === 'open_supabase') {
      setActiveTab('supabase');
      setIsAIAssistantOpen(false);
    }
  };

  // ── Public route short-circuit ────────────────────────────
  if (publicEventId) {
    return (
      <PublicRegistrationPage
        eventId={publicEventId}
        onBackToDashboard={() => {
          window.location.hash = '';
          setPublicEventId(null);
        }}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewEvent={() => {
          setEditingEvent(undefined);
          setIsFormBuilderOpen(true);
        }}
        onToggleAIAssistant={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
        supabaseConfig={supabaseConfig}
        eventsCount={events.filter(e => e.status !== 'archived').length}
      />

      {/* Main Body View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'events' && (
          <EventsView
            events={events}
            submissions={submissions}
            onOpenNewEvent={() => {
              setEditingEvent(undefined);
              setIsFormBuilderOpen(true);
            }}
            onEditEvent={event => {
              setEditingEvent(event);
              setIsFormBuilderOpen(true);
            }}
            onArchiveEvent={handleArchiveEvent}
            onOpenPublicForm={event => {
              window.location.hash = `/form/${event.id}`;
            }}
            onViewSubmissions={eventId => {
              setSelectedSubmissionsEventId(eventId);
              setActiveTab('submissions');
            }}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesView onSelectTemplate={handleSelectTemplate} />
        )}

        {activeTab === 'submissions' && (
          <SubmissionsView
            events={events}
            submissions={submissions}
            selectedEventId={selectedSubmissionsEventId}
            onUpdateSubmissionData={handleUpdateSubmissionData}
            onUpdateSubmissionStatus={handleUpdateSubmissionStatus}
            onDeleteSubmission={handleDeleteSubmission}
          />
        )}

        {activeTab === 'archive' && (
          <ArchiveView
            events={events}
            submissions={submissions}
            logs={logs}
            onRestoreEvent={handleRestoreEvent}
          />
        )}

        {activeTab === 'supabase' && (
          <div className="py-4">
            <SupabaseModal
              config={supabaseConfig}
              onClose={() => setActiveTab('events')}
              onUpdateConfig={newConfig => setSupabaseConfig(newConfig)}
            />
          </div>
        )}
      </main>

      {/* No-Code Form Builder Modal */}
      {isFormBuilderOpen && (
        <FormBuilderModal
          initialEvent={editingEvent}
          onClose={() => {
            setIsFormBuilderOpen(false);
            setEditingEvent(undefined);
          }}
          onSave={handleSaveEvent}
        />
      )}

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        events={events}
        totalSubmissions={submissions.length}
        onSelectAction={handleAIAction}
      />

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-amber-300">
              AURUM REGISTRY
            </span>
            <span>• No-Code Event & Pre-Registration Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Supabase DB Enabled</span>
            <span>Vercel Ready</span>
            <span> Lyka Colinares</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;