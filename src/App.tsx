import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RegistrationEvent,
  RegistrationSubmission,
  SystemLog,
  SupabaseConfig,
  FormTemplate,
  CamperItem
} from './types';
import type { SubmissionStatus } from './types';
import { getSupabaseClient, getSavedSupabaseConfig } from './lib/supabase';

// Components
import { Navbar } from './components/Navbar';
import { EventsView } from './components/EventsView';
import { TemplatesView } from './components/TemplatesView';
import { SubmissionsView } from './components/SubmissionsView';
import { EventDataView } from './components/EventDataView';
import { ArchiveView } from './components/ArchiveView';
import { FormBuilderModal } from './components/FormBuilderModal';
import { PublicRegistrationPage } from './components/PublicRegistrationPage';
import { SupabaseModal } from './components/SupabaseModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { CamperListPage } from './components/CamperListPage';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PUBLIC_FORM_HASH_RE = /^#\/form\/([a-zA-Z0-9-]+)$/;
const CAMPER_LIST_HASH_RE = /^#\/campers\/([a-zA-Z0-9-]+)\/([A-Z0-9-]+)$/;


const safeRandomUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const makeLogId = (): string =>
  `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ═════════════════════════════════════════════════════════════
// Camper mapper + persistence helpers
// ═════════════════════════════════════════════════════════════
const mapCamperRow = (c: any): CamperItem => ({
  id: c.id,
  fullName: c.full_name || '',
  badgeName: c.badge_name || '',
  age: c.age != null ? String(c.age) : '',
  gradeLevel: c.grade_level || 'junior high',
  gender: c.gender || 'male'
});

/**
 * Replaces all camper rows for a given submission.
 * Safe to call with an empty array (clears rows).
 * No-ops silently when the Supabase client is unavailable.
 */
const persistCampers = async (
  client: ReturnType<typeof getSupabaseClient> | null,
  submissionId: string,
  eventId: string,
  campers: CamperItem[]
) => {
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
  // Camper list route: { eventId, churchCode } when #/campers/... is active
  const [camperListRoute, setCamperListRoute] = useState<{
    eventId: string;
    churchCode: string;
  } | null>(null);

  // ── Per-Event Data Page ─────────────────────────────────────
  // When set, the main content area shows the dedicated per-event
  // editor page instead of the tabbed views.
  const [eventDataViewId, setEventDataViewId] = useState<string | null>(null);

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

  // ═══════════════════════════════════════════════════════════
  // Load from Supabase + join campers
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let cancelled = false;

    const loadFromSupabase = async () => {
      const [
        { data: eventRows, error: eventError },
        { data: registrationRows, error: registrationError }
      ] = await Promise.all([
        client
          .from('events')
          .select('*')
          .order('created_at', { ascending: false }),

        client
          .from('registrations')
          .select(`
            *,
            campers (
              id,
              submission_id,
              full_name,
              badge_name,
              age,
              grade_level,
              gender,
              sort_order
            )
          `)
          .order('submitted_at', { ascending: false })
      ]);

      if (cancelled) return;

      // ── Events ─────────────────────────────────────────────
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

        setEvents(prev => {
          const serverIds = new Set(mappedEvents.map(e => e.id));
          const localOnly = prev.filter(e => !serverIds.has(e.id));
          if (!hasSyncedRef.current) hasSyncedRef.current = true;
          return [...localOnly, ...mappedEvents];
        });
      }

      // ── Registrations + campers ────────────────────────────
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
            notes: row.notes || undefined,
            campers: Array.isArray(row.campers)
              ? row.campers
                  .slice()
                  .sort(
                    (a: any, b: any) =>
                      (a.sort_order ?? 0) - (b.sort_order ?? 0)
                  )
                  .map(mapCamperRow)
              : []
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
      prev.map(e =>
        e.id === eventId ? { ...e, status: 'archived' as const } : e
      )
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
      }
    }
  };

  // ── Handler: Restore Event ────────────────────────────────
  const handleRestoreEvent = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    setEvents(prev =>
      prev.map(e =>
        e.id === eventId ? { ...e, status: 'active' as const } : e
      )
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

      if (error) console.warn('Supabase restore error:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Update Submission Data (used by EventDataView)
  //   Handles data, notes, status, and campers.
  // ═══════════════════════════════════════════════════════════
  const handleUpdateSubmissionData = async (
    submissionId: string,
    updatedData: Record<string, any>,
    updatedNotes?: string,
    updatedStatus?: SubmissionStatus,
    updatedCampers?: CamperItem[]
  ) => {
    // 1. Local state
    setSubmissions(prev =>
      prev.map(s => {
        if (s.id !== submissionId) return s;
        return {
          ...s,
          data: updatedData,
          notes: updatedNotes ?? s.notes,
          status: updatedStatus ?? s.status,
          campers: updatedCampers ?? s.campers
        };
      })
    );

    // 2. Supabase — registrations row
    const client = getSupabaseClient();
    if (!client) return;

    const patch: Record<string, any> = { data: updatedData };
    if (updatedNotes !== undefined) patch.notes = updatedNotes;
    if (updatedStatus !== undefined) patch.status = updatedStatus;

    const { error } = await client
      .from('registrations')
      .update(patch)
      .eq('id', submissionId);

    if (error) {
      console.warn('Supabase submission update error:', error);
    }

    // 3. Supabase — campers rows (only when the caller passed them in)
    if (updatedCampers !== undefined) {
      const sub = submissions.find(s => s.id === submissionId);
      const eventId = sub?.eventId || '';
      await persistCampers(client, submissionId, eventId, updatedCampers);
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
  const handleDeleteSubmission = async (submissionId: string) => {
    const client = getSupabaseClient();

    // 1. Explicit camper cleanup (belt-and-suspenders; FK CASCADE usually
    //    handles this automatically).
    if (client) {
      const { error: camperErr } = await client
        .from('campers')
        .delete()
        .eq('submission_id', submissionId);
      if (camperErr) {
        console.warn('Supabase campers delete error:', camperErr);
      }
    }

    // 2. Delete the registration row.
    if (client) {
      const { error: regErr } = await client
        .from('registrations')
        .delete()
        .eq('id', submissionId);

      if (regErr) {
        console.error('Supabase submission delete error:', regErr);
        alert(
          `Could not delete this registration from Supabase.\n\n${regErr.message}`
        );
        return;
      }
    }

    // 3. Only now remove from local state.
    setSubmissions(prev => prev.filter(s => s.id !== submissionId));
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
      setEventDataViewId(null);
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

  // ── Selected event for the per-event data page ────────────
  const eventDataViewEvent = eventDataViewId
    ? events.find(e => e.id === eventDataViewId) || null
    : null;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar
        activeTab={activeTab}
        setActiveTab={tab => {
          // Leaving the tabbed views always closes the per-event page.
          setEventDataViewId(null);
          setActiveTab(tab);
        }}
        onOpenNewEvent={() => {
          setEditingEvent(undefined);
          setIsFormBuilderOpen(true);
        }}
        onToggleAIAssistant={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
        supabaseConfig={supabaseConfig}
        eventsCount={events.filter(e => e.status !== 'archived').length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Per-Event Data Page overrides the tab switch ─── */}
        {eventDataViewEvent ? (
          <EventDataView
            event={eventDataViewEvent}
            submissions={submissions.filter(
              s => s.eventId === eventDataViewEvent.id
            )}
            onBack={() => setEventDataViewId(null)}
            onUpdateSubmissionStatus={handleUpdateSubmissionStatus}
            onUpdateSubmissionData={handleUpdateSubmissionData}
            onDeleteSubmission={handleDeleteSubmission}
          />
        ) : (
          <>
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
                  // Opens the dedicated per-event data page.
                  setEventDataViewId(eventId);
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
          </>
        )}
      </main>

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

      <AIAssistantDrawer
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        events={events}
        totalSubmissions={submissions.length}
        onSelectAction={handleAIAction}
      />

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
            <span>Lyka Colinares</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;