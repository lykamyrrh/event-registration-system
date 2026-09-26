import React, { useState, useEffect } from 'react';
import { 
  RegistrationEvent, 
  RegistrationSubmission, 
  SystemLog, 
  SupabaseConfig, 
  FormTemplate, 
  SubmissionStatus 
} from './types';
import { INITIAL_EVENTS, INITIAL_SUBMISSIONS, INITIAL_LOGS } from './data/mockData';
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

export function App() {
  const [activeTab, setActiveTab] = useState<'events' | 'templates' | 'submissions' | 'archive' | 'supabase'>('events');
  
  // Persistent State
  const [events, setEvents] = useState<RegistrationEvent[]>(() => {
    const saved = localStorage.getItem('aurum_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [submissions, setSubmissions] = useState<RegistrationSubmission[]>(() => {
    const saved = localStorage.getItem('aurum_submissions');
    return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
  });

  const [logs, setLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem('aurum_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getSavedSupabaseConfig);

  // Modals & Navigation States
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<RegistrationEvent> | undefined>(undefined);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [publicFormEvent, setPublicFormEvent] = useState<RegistrationEvent | null>(null);
  const [publicEventId, setPublicEventId] = useState<string | null>(null);
  const [selectedSubmissionsEventId, setSelectedSubmissionsEventId] = useState<string | undefined>(undefined);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('aurum_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('aurum_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('aurum_logs', JSON.stringify(logs));
  }, [logs]);

  // Sync with Live Supabase if connected
  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      // Fetch events from Supabase in background
      client.from('events').select('*').then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          console.log('Fetched events from live Supabase:', data);
        }
      });
    }
  }, [supabaseConfig]);

  // Handle public registration hash routes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#/form/')) {
        setPublicEventId(hash.replace('#/form/', ''));
      } else {
        setPublicEventId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handler: Add or Update Event
  const handleSaveEvent = (savedEvent: RegistrationEvent) => {
    const existingIndex = events.findIndex(e => e.id === savedEvent.id);
    const now = new Date().toISOString();

    let updatedEvents: RegistrationEvent[];
    let actionText = '';

    if (existingIndex >= 0) {
      updatedEvents = events.map(e => e.id === savedEvent.id ? savedEvent : e);
      actionText = `Updated registration site "${savedEvent.title}"`;
    } else {
      updatedEvents = [savedEvent, ...events];
      actionText = `Created new registration site "${savedEvent.title}"`;
    }

    setEvents(updatedEvents);
    setIsFormBuilderOpen(false);
    setEditingEvent(undefined);

    // Log action
    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: now,
      action: existingIndex >= 0 ? 'Event Updated' : 'Event Created',
      details: actionText,
      eventId: savedEvent.id,
      type: 'info'
    };
    setLogs([newLog, ...logs]);

    // Push to Supabase if connected
    const client = getSupabaseClient();
    if (client) {
      client.from('events').upsert({
        id: savedEvent.id,
        title: savedEvent.title,
        slug: savedEvent.slug,
        type: savedEvent.type,
        category: savedEvent.category,
        description: savedEvent.description,
        location: savedEvent.location,
        event_date: savedEvent.eventDate,
        status: savedEvent.status,
        fields: savedEvent.fields,
        submit_button_text: savedEvent.submitButtonText,
        success_message: savedEvent.successMessage,
        created_at: savedEvent.created_at,
        last_used_at: savedEvent.last_used_at
      }).then(({ error }) => {
        if (error) console.warn('Supabase sync error:', error);
      });
    }
  };

  // Handler: Select Template to Create Event
  const handleSelectTemplate = (template: FormTemplate) => {
    const draft: Partial<RegistrationEvent> = {
      title: template.defaultTitle,
      type: template.defaultType,
      category: template.category,
      description: template.defaultDescription,
      fields: template.fields,
      submitButtonText: template.defaultType === 'pre-registration' ? 'Submit Pre-Registration' : 'Confirm Registration',
      successMessage: 'Thank you! Your registration details have been received.'
    };
    setEditingEvent(draft);
    setIsFormBuilderOpen(true);
  };

  // Handler: Archive Event
  const handleArchiveEvent = (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    const updated = events.map(e => e.id === eventId ? { ...e, status: 'archived' as const } : e);
    setEvents(updated);

    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'Event Archived',
      details: `Archived site "${ev.title}" to History Vault`,
      eventId,
      type: 'warning'
    };
    setLogs([newLog, ...logs]);
  };

  // Handler: Restore Event
  const handleRestoreEvent = (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    const updated = events.map(e => e.id === eventId ? { ...e, status: 'active' as const } : e);
    setEvents(updated);

    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'Event Restored',
      details: `Restored site "${ev.title}" back to active dashboard`,
      eventId,
      type: 'success'
    };
    setLogs([newLog, ...logs]);
  };

  // Handler: Submit Public Registration
  const handleSubmitRegistration = (eventId: string, formData: Record<string, any>) => {
    const now = new Date().toISOString();
    const newSubmission: RegistrationSubmission = {
      id: `sub-${Date.now()}`,
      eventId,
      submitted_at: now,
      status: 'confirmed',
      data: formData
    };

    setSubmissions([newSubmission, ...submissions]);

    // Update Event last_used_at timestamp
    setEvents(events.map(e => e.id === eventId ? { ...e, last_used_at: now } : e));

    const ev = events.find(e => e.id === eventId);
    const registrantName = formData.f_name || formData.f_fullname || formData.f_guest_name || 'Attendee';

    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: now,
      action: 'New Registration Submitted',
      details: `${registrantName} registered for ${ev?.title || 'Event'}`,
      eventId,
      type: 'success'
    };
    setLogs([newLog, ...logs]);

    // Push to Supabase if connected
    const client = getSupabaseClient();
    if (client) {
      client.from('registrations').insert({
        event_id: eventId,
        submitted_at: now,
        status: 'confirmed',
        data: formData
      }).then(({ error }) => {
        if (error) console.warn('Supabase submission insert error:', error);
      });
    }
  };

  // Handler: Update Submission Data
  const handleUpdateSubmissionData = (submissionId: string, updatedData: Record<string, any>) => {
    setSubmissions(submissions.map(s =>
      s.id === submissionId ? { ...s, data: updatedData } : s
    ));

    // Push the updated submission data to Supabase if connected
    const client = getSupabaseClient();
    if (client) {
      client.from('registrations')
        .update({ data: updatedData })
        .eq('id', submissionId)
        .then(({ error }) => {
          if (error) console.warn('Supabase submission update error:', error);
        });
    }
  };

  // Handler: Update Submission Status (e.g. Check-in)
  const handleUpdateSubmissionStatus = (submissionId: string, newStatus: SubmissionStatus) => {
    setSubmissions(submissions.map(s => s.id === submissionId ? { ...s, status: newStatus } : s));
  };

  // Handler: Delete Submission
  const handleDeleteSubmission = (submissionId: string) => {
    if (confirm('Are you sure you want to delete this registration record?')) {
      setSubmissions(submissions.filter(s => s.id !== submissionId));
    }
  };

  // AI Assistant Quick Actions Router
  const handleAIAction = (actionType: string, payload?: any) => {
    if (actionType === 'create_event' && payload) {
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

  // Render Public Registration Page for hash route
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
            onEditEvent={(event) => {
              setEditingEvent(event);
              setIsFormBuilderOpen(true);
            }}
            onArchiveEvent={handleArchiveEvent}
            onOpenPublicForm={(event) => {
              window.location.hash = `/form/${event.id}`;
            }}
            onViewSubmissions={(eventId) => {
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
              onUpdateConfig={(newConfig) => setSupabaseConfig(newConfig)}
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
            <span className="font-serif font-bold text-amber-300">AURUM REGISTRY</span>
            <span>• No-Code Event & Pre-Registration Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Supabase DB Enabled</span>
            <span>Vercel Ready</span>
            <span>Lucide Icons & Tailwind CSS</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
export default App;
