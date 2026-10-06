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
import { LoginPage } from './components/LoginPage';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PUBLIC_FORM_HASH_RE = /^#\/form\/([a-zA-Z0-9-]+)$/;
const CAMPER_LIST_HASH_RE = /^#\/campers\/([a-zA-Z0-9-]+)$/;

const ADMIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ADMIN_LAST_ACTIVITY_KEY = 'myrrh_admin_last_activity';

const safeRandomUUID = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    c => {
      const r = (Math.random() * 16) | 0;
      const v =
        c === 'x'
          ? r
          : (r & 0x3) | 0x8;

      return v.toString(16);
    }
  );
};

const makeLogId = (): string =>
  `log-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

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
    console.warn(
      'Supabase campers delete error:',
      delErr
    );
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

  const { error: insErr } = await client
    .from('campers')
    .insert(rows);

  if (insErr) {
    console.warn(
      'Supabase campers insert error:',
      insErr
    );
  }
};

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────

export function App() {
  // ── Administrator Authentication ────────────────────────────

  const [isAuthChecking, setIsAuthChecking] =
    useState(true);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isAuthorizedAdmin, setIsAuthorizedAdmin] =
    useState(false);

  const [authError, setAuthError] =
    useState<string | null>(null);

  // ── Main navigation ─────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<
    | 'events'
    | 'templates'
    | 'submissions'
    | 'archive'
    | 'supabase'
  >('events');

  // ── Persistent State ────────────────────────────────────────
  //
  // Supabase is the source of truth for events and submissions.
  // Do not restore either collection from localStorage because
  // a browser-only event can produce a public URL whose event_id
  // does not exist in Supabase.

  const [events, setEvents] =
    useState<RegistrationEvent[]>([]);

  const [submissions, setSubmissions] =
    useState<RegistrationSubmission[]>([]);

  const [logs, setLogs] =
    useState<SystemLog[]>(() => {
      const saved =
        localStorage.getItem('aurum_logs');

      return saved
        ? JSON.parse(saved)
        : [];
    });

  const [supabaseConfig, setSupabaseConfig] =
    useState<SupabaseConfig>(
      getSavedSupabaseConfig
    );

  // ── Modals & Navigation ─────────────────────────────────────

  const [
    isFormBuilderOpen,
    setIsFormBuilderOpen
  ] = useState(false);

  const [
    editingEvent,
    setEditingEvent
  ] = useState<
    Partial<RegistrationEvent> | undefined
  >(undefined);

  const [
    isAIAssistantOpen,
    setIsAIAssistantOpen
  ] = useState(false);

  const [
    publicEventId,
    setPublicEventId
  ] = useState<string | null>(null);

  const [
    selectedSubmissionsEventId
  ] = useState<string | undefined>(
    undefined
  );

  // Camper list route.
  // The church code is intentionally NOT stored in the URL.
  // The visitor must enter it again on CamperListPage.

  const [
    camperListEventId,
    setCamperListEventId
  ] = useState<string | null>(null);

  // ── Per-Event Data Page ─────────────────────────────────────

  const [
    eventDataViewId,
    setEventDataViewId
  ] = useState<string | null>(null);

  const hasSyncedRef = useRef(false);
  const lastAdminActivityRef = useRef(Date.now());

  // ═══════════════════════════════════════════════════════════
  // Administrator authentication + admin_users authorization
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const client = getSupabaseClient();

    if (!client) {
      setIsAuthenticated(false);
      setIsAuthorizedAdmin(false);
      setIsAuthChecking(false);
      return;
    }

    let mounted = true;

    const authorizeSession = async (session: any) => {
      if (!mounted) return;

      if (!session?.user) {
        setIsAuthenticated(false);
        setIsAuthorizedAdmin(false);
        setIsAuthChecking(false);
        return;
      }

      setIsAuthChecking(true);
      setIsAuthenticated(true);
      setIsAuthorizedAdmin(false);

      const email = session.user.email?.trim().toLowerCase();

      if (!email) {
        await client.auth.signOut();

        if (!mounted) return;

        setIsAuthenticated(false);
        setIsAuthorizedAdmin(false);
        setAuthError(
          'The authenticated account does not have a valid email address.'
        );
        setIsAuthChecking(false);
        return;
      }

      try {
        const { data: admin, error } = await client
          .from('admin_users')
          .select('id, email, is_active')
          .eq('email', email)
          .eq('is_active', true)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error(
            'Administrator authorization check failed:',
            error
          );

          await client.auth.signOut();

          if (!mounted) return;

          setIsAuthenticated(false);
          setIsAuthorizedAdmin(false);
          setAuthError(
            'Administrator authorization could not be verified.'
          );
          setIsAuthChecking(false);
          return;
        }

        if (!admin) {
          await client.auth.signOut();

          if (!mounted) return;

          setIsAuthenticated(false);
          setIsAuthorizedAdmin(false);
          setAuthError(
            'This account is not authorized to access MYRRH Registry.'
          );
          setIsAuthChecking(false);
          return;
        }

        const now = Date.now();
        const storedActivity = Number(
          localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY)
        );

        // A page refresh, reopened tab, or laptop wake must not silently
        // extend an old administrator session past the idle limit.
        if (
          Number.isFinite(storedActivity) &&
          storedActivity > 0 &&
          now - storedActivity >= ADMIN_IDLE_TIMEOUT_MS
        ) {
          localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
          await client.auth.signOut();

          if (!mounted) return;

          setIsAuthenticated(false);
          setIsAuthorizedAdmin(false);
          setAuthError(
            'Your administrator session expired after 5 minutes of inactivity. Please sign in again.'
          );
          setIsAuthChecking(false);
          return;
        }

        const activityTime =
          Number.isFinite(storedActivity) && storedActivity > 0
            ? storedActivity
            : now;

        lastAdminActivityRef.current = activityTime;
        localStorage.setItem(
          ADMIN_LAST_ACTIVITY_KEY,
          String(activityTime)
        );

        setIsAuthenticated(true);
        setIsAuthorizedAdmin(true);
        setAuthError(null);
        setIsAuthChecking(false);
      } catch (error) {
        console.error(
          'Administrator authentication failed:',
          error
        );

        try {
          await client.auth.signOut();
        } catch (signOutError) {
          console.error(
            'Sign out after authorization failure failed:',
            signOutError
          );
        }

        if (!mounted) return;

        setIsAuthenticated(false);
        setIsAuthorizedAdmin(false);
        setAuthError(
          'Administrator authorization could not be verified.'
        );
        setIsAuthChecking(false);
      }
    };

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error
        } = await client.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error(
            'Supabase session check failed:',
            error
          );

          setIsAuthenticated(false);
          setIsAuthorizedAdmin(false);
          setIsAuthChecking(false);
          return;
        }

        await authorizeSession(session);
      } catch (error) {
        console.error(
          'Authentication check failed:',
          error
        );

        if (mounted) {
          setIsAuthenticated(false);
          setIsAuthorizedAdmin(false);
          setIsAuthChecking(false);
        }
      }
    };

    void checkSession();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      // Do not make additional Supabase requests directly inside the
      // auth callback. Defer the admin_users authorization check.
      window.setTimeout(() => {
        if (mounted) {
          void authorizeSession(session);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [
    supabaseConfig?.url,
    supabaseConfig?.anonKey
  ]);

  // ═══════════════════════════════════════════════════════════
  // Five-minute administrator inactivity timeout
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isAuthenticated || !isAuthorizedAdmin) return;

    const client = getSupabaseClient();
    if (!client) return;

    let timeoutId: ReturnType<typeof window.setTimeout> | undefined;
    let isSigningOut = false;

    const clearIdleTimer = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const clearSensitiveAdminState = () => {
      setEvents([]);
      setSubmissions([]);
      setActiveTab('events');
      setEventDataViewId(null);
      setIsFormBuilderOpen(false);
      setEditingEvent(undefined);
      setIsAIAssistantOpen(false);
    };

    const logoutForInactivity = async () => {
      if (isSigningOut) return;

      isSigningOut = true;
      clearIdleTimer();
      localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);

      // Clear sensitive UI data immediately, then invalidate the real
      // Supabase session rather than merely hiding the dashboard.
      clearSensitiveAdminState();
      setIsAuthorizedAdmin(false);
      setIsAuthenticated(false);
      setAuthError(
        'Your administrator session expired after 5 minutes of inactivity. Please sign in again.'
      );

      try {
        await client.auth.signOut();
      } catch (error) {
        console.error(
          'Automatic Supabase sign out failed:',
          error
        );
      }
    };

    const scheduleIdleCheck = () => {
      clearIdleTimer();

      const elapsed =
        Date.now() - lastAdminActivityRef.current;
      const remaining = ADMIN_IDLE_TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        void logoutForInactivity();
        return;
      }

      timeoutId = window.setTimeout(() => {
        void logoutForInactivity();
      }, remaining);
    };

    const registerActivity = () => {
      if (isSigningOut) return;

      const now = Date.now();
      lastAdminActivityRef.current = now;
      localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(now));
      scheduleIdleCheck();
    };

    const checkElapsedIdleTime = () => {
      if (isSigningOut) return;

      const storedActivity = Number(
        localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY)
      );

      if (Number.isFinite(storedActivity) && storedActivity > 0) {
        lastAdminActivityRef.current = storedActivity;
      }

      const elapsed =
        Date.now() - lastAdminActivityRef.current;

      if (elapsed >= ADMIN_IDLE_TIMEOUT_MS) {
        void logoutForInactivity();
        return;
      }

      scheduleIdleCheck();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkElapsedIdleTime();
      }
    };

    const handleFocus = () => {
      checkElapsedIdleTime();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ADMIN_LAST_ACTIVITY_KEY || !event.newValue) {
        return;
      }

      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp) || timestamp <= 0) return;

      lastAdminActivityRef.current = timestamp;
      scheduleIdleCheck();
    };

    const storedActivity = Number(
      localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY)
    );

    if (Number.isFinite(storedActivity) && storedActivity > 0) {
      lastAdminActivityRef.current = storedActivity;
    } else {
      registerActivity();
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown',
      'keydown',
      'touchstart',
      'scroll'
    ];

    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, registerActivity, {
        passive: true
      });
    });

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    checkElapsedIdleTime();

    return () => {
      clearIdleTimer();

      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, registerActivity);
      });

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isAuthenticated, isAuthorizedAdmin]);

  // ── Log helper ──────────────────────────────────────────────

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

      setLogs(prev => [
        newLog,
        ...prev
      ]);
    },
    []
  );

  // ── Persist non-authoritative UI logs only ─────────────────

  useEffect(() => {
    localStorage.setItem(
      'aurum_logs',
      JSON.stringify(logs)
    );
  }, [logs]);

  // ═══════════════════════════════════════════════════════════
  // Load from Supabase + join campers
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    // The full administrator dataset must never be requested until the
    // Supabase session AND admin_users authorization have both succeeded.
    if (!isAuthenticated || !isAuthorizedAdmin) {
      setEvents([]);
      setSubmissions([]);
      return;
    }

    const client = getSupabaseClient();

    if (!client) return;

    let cancelled = false;

    const loadFromSupabase = async () => {
      const [
        {
          data: eventRows,
          error: eventError
        },
        {
          data: registrationRows,
          error: registrationError
        }
      ] = await Promise.all([
        client
          .from('events')
          .select('*')
          .order(
            'created_at',
            { ascending: false }
          ),

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
          .order(
            'submitted_at',
            { ascending: false }
          )
      ]);

      if (cancelled) return;

      // ── Events ─────────────────────────────────────────────

      if (eventError) {
        console.warn(
          'Supabase events load error:',
          eventError
        );
      } else if (eventRows) {
        const mappedEvents:
          RegistrationEvent[] =
          eventRows.map(
            (row: any) => ({
              id: row.id,
              title: row.title,
              slug: row.slug,
              type: row.type,
              category: row.category,
              description:
                row.description || '',
              location:
                row.location || undefined,
              eventDate:
                row.event_date || undefined,
              status: row.status,
              themeBanner:
                row.theme_banner || undefined,
              fields:
                Array.isArray(row.fields)
                  ? row.fields
                  : [],
              created_at:
                row.created_at,
              last_used_at:
                row.last_used_at,
              maxRegistrations:
                row.max_registrations ??
                undefined,
              submitButtonText:
                row.submit_button_text ??
                undefined,
              successMessage:
                row.success_message ??
                undefined,
              externalLink:
                row.external_link ??
                undefined,
              isMultiPart:
                row.is_multi_part ??
                undefined
            })
          );

        if (!hasSyncedRef.current) {
          hasSyncedRef.current = true;
        }

        setEvents(mappedEvents);
      }

      // ── Registrations + campers ────────────────────────────

      if (registrationError) {
        console.warn(
          'Supabase registrations load error:',
          registrationError
        );
      } else if (registrationRows) {
        const mappedSubmissions:
          RegistrationSubmission[] =
          registrationRows.map(
            (row: any) => ({
              id: row.id,
              eventId: row.event_id,
              submitted_at:
                row.submitted_at,
              status: row.status,
              data: row.data || {},
              notes:
                row.notes || undefined,
              campers:
                Array.isArray(row.campers)
                  ? row.campers
                      .slice()
                      .sort(
                        (
                          a: any,
                          b: any
                        ) =>
                          (a.sort_order ??
                            0) -
                          (b.sort_order ??
                            0)
                      )
                      .map(mapCamperRow)
                  : []
            })
          );

        setSubmissions(
          mappedSubmissions
        );
      }
    };

    void loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [
    supabaseConfig?.url,
    supabaseConfig?.anonKey,
    isAuthenticated,
    isAuthorizedAdmin
  ]);

  // ── Hash routing ────────────────────────────────────────────

  useEffect(() => {
    const handleHashChange = () => {
      const hash =
        window.location.hash || '';

      const camperMatch =
        hash.match(
          CAMPER_LIST_HASH_RE
        );

      if (camperMatch) {
        setCamperListEventId(
          camperMatch[1]
        );

        setPublicEventId(null);
        return;
      }

      const formMatch =
        hash.match(
          PUBLIC_FORM_HASH_RE
        );

      setPublicEventId(
        formMatch
          ? formMatch[1]
          : null
      );

      setCamperListEventId(null);
    };

    handleHashChange();

    window.addEventListener(
      'hashchange',
      handleHashChange
    );

    return () =>
      window.removeEventListener(
        'hashchange',
        handleHashChange
      );
  }, []);

  // ── Handler: Add or Update Event ────────────────────────────

  const handleSaveEvent = async (
    savedEvent: RegistrationEvent
  ) => {
    const client =
      getSupabaseClient();

    if (!client) {
      alert(
        'The event was NOT saved because the Supabase database is unavailable. Please check the connection and try again.'
      );

      return;
    }

    const existingEvent =
      events.find(
        e => e.id === savedEvent.id
      );

    const now =
      new Date().toISOString();

    const eventId =
      existingEvent?.id &&
      UUID_RE.test(existingEvent.id)
        ? existingEvent.id
        : savedEvent.id &&
            UUID_RE.test(savedEvent.id)
          ? savedEvent.id
          : safeRandomUUID();

    const eventToSave:
      RegistrationEvent = {
      ...savedEvent,
      id: eventId,
      created_at:
        existingEvent?.created_at ||
        savedEvent.created_at ||
        now,
      last_used_at: now
    };

    const dbRow = {
      id: eventToSave.id,
      title: eventToSave.title,
      slug: eventToSave.slug,
      type: eventToSave.type,
      category:
        eventToSave.category,
      description:
        eventToSave.description,
      location:
        eventToSave.location || null,
      event_date:
        eventToSave.eventDate || null,
      status: eventToSave.status,
      fields:
        eventToSave.fields || [],
      max_registrations:
        eventToSave.maxRegistrations ??
        null,
      submit_button_text:
        eventToSave.submitButtonText ||
        null,
      success_message:
        eventToSave.successMessage ||
        null,
      external_link:
        eventToSave.externalLink ??
        null,
      is_multi_part:
        eventToSave.isMultiPart ??
        false,
      created_at:
        eventToSave.created_at,
      last_used_at:
        eventToSave.last_used_at
    };

    const {
      data: persistedRow,
      error
    } = await client
      .from('events')
      .upsert(
        dbRow,
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (
      error ||
      !persistedRow
    ) {
      console.error(
        'Supabase event save error:',
        error
      );

      alert(
        `Event was NOT saved. No public registration link has been created.\n\n${
          error?.message ||
          'Supabase did not return the saved event.'
        }`
      );

      return;
    }

    const persistedEvent:
      RegistrationEvent = {
      id: persistedRow.id,
      title:
        persistedRow.title,
      slug:
        persistedRow.slug,
      type:
        persistedRow.type,
      category:
        persistedRow.category,
      description:
        persistedRow.description ||
        '',
      location:
        persistedRow.location ||
        undefined,
      eventDate:
        persistedRow.event_date ||
        undefined,
      status:
        persistedRow.status,
      themeBanner:
        persistedRow.theme_banner ||
        undefined,
      fields:
        Array.isArray(
          persistedRow.fields
        )
          ? persistedRow.fields
          : [],
      created_at:
        persistedRow.created_at,
      last_used_at:
        persistedRow.last_used_at,
      maxRegistrations:
        persistedRow.max_registrations ??
        undefined,
      submitButtonText:
        persistedRow.submit_button_text ??
        undefined,
      successMessage:
        persistedRow.success_message ??
        undefined,
      externalLink:
        persistedRow.external_link ??
        undefined,
      isMultiPart:
        persistedRow.is_multi_part ??
        undefined
    };

    setEvents(prev => {
      const exists =
        prev.some(
          e =>
            e.id ===
            persistedEvent.id
        );

      return exists
        ? prev.map(e =>
            e.id ===
            persistedEvent.id
              ? persistedEvent
              : e
          )
        : [
            persistedEvent,
            ...prev
          ];
    });

    setIsFormBuilderOpen(false);
    setEditingEvent(undefined);

    pushLog(
      existingEvent
        ? 'Event Updated'
        : 'Event Created',

      existingEvent
        ? `Updated registration site "${persistedEvent.title}"`
        : `Created new registration site "${persistedEvent.title}"`,

      'info',
      persistedEvent.id
    );
  };

  // ── Handler: Select Template ────────────────────────────────

  const handleSelectTemplate = (
    template: FormTemplate
  ) => {
    const draft:
      Partial<RegistrationEvent> = {
      title:
        template.defaultTitle,
      type:
        template.defaultType,
      category:
        template.category,
      description:
        template.defaultDescription,
      fields:
        template.fields,
      submitButtonText:
        template.defaultType ===
        'pre-registration'
          ? 'Submit Pre-Registration'
          : 'Confirm Registration',
      successMessage:
        'Thank you! Your registration details have been received.'
    };

    setEditingEvent(draft);
    setIsFormBuilderOpen(true);
  };

  // ── Handler: Archive Event ──────────────────────────────────

  const handleArchiveEvent =
    async (eventId: string) => {
      const ev =
        events.find(
          e => e.id === eventId
        );

      if (!ev) return;

      setEvents(prev =>
        prev.map(e =>
          e.id === eventId
            ? {
                ...e,
                status:
                  'archived' as const
              }
            : e
        )
      );

      pushLog(
        'Event Archived',
        `Archived site "${ev.title}" to History Vault`,
        'warning',
        eventId
      );

      const client =
        getSupabaseClient();

      if (client) {
        const { error } =
          await client
            .from('events')
            .update({
              status: 'archived'
            })
            .eq('id', eventId);

        if (error) {
          console.warn(
            'Supabase archive error:',
            error
          );
        }
      }
    };

  // ── Handler: Restore Event ──────────────────────────────────

  const handleRestoreEvent =
    async (eventId: string) => {
      const ev =
        events.find(
          e => e.id === eventId
        );

      if (!ev) return;

      setEvents(prev =>
        prev.map(e =>
          e.id === eventId
            ? {
                ...e,
                status:
                  'active' as const
              }
            : e
        )
      );

      pushLog(
        'Event Restored',
        `Restored site "${ev.title}" back to active dashboard`,
        'success',
        eventId
      );

      const client =
        getSupabaseClient();

      if (client) {
        const { error } =
          await client
            .from('events')
            .update({
              status: 'active'
            })
            .eq('id', eventId);

        if (error) {
          console.warn(
            'Supabase restore error:',
            error
          );
        }
      }
    };

  // ═══════════════════════════════════════════════════════════
  // Update Submission Data
  // ═══════════════════════════════════════════════════════════

  const handleUpdateSubmissionData =
    async (
      submissionId: string,
      updatedData:
        Record<string, any>,
      updatedNotes?: string,
      updatedStatus?:
        SubmissionStatus,
      updatedCampers?:
        CamperItem[]
    ) => {
      // 1. Local state

      setSubmissions(prev =>
        prev.map(s => {
          if (
            s.id !==
            submissionId
          ) {
            return s;
          }

          return {
            ...s,
            data: updatedData,
            notes:
              updatedNotes ??
              s.notes,
            status:
              updatedStatus ??
              s.status,
            campers:
              updatedCampers ??
              s.campers
          };
        })
      );

      // 2. Supabase registration row

      const client =
        getSupabaseClient();

      if (!client) return;

      const patch:
        Record<string, any> = {
        data: updatedData
      };

      if (
        updatedNotes !==
        undefined
      ) {
        patch.notes =
          updatedNotes;
      }

      if (
        updatedStatus !==
        undefined
      ) {
        patch.status =
          updatedStatus;
      }

      const { error } =
        await client
          .from(
            'registrations'
          )
          .update(patch)
          .eq(
            'id',
            submissionId
          );

      if (error) {
        console.warn(
          'Supabase submission update error:',
          error
        );
      }

      // 3. Supabase campers rows

      if (
        updatedCampers !==
        undefined
      ) {
        const sub =
          submissions.find(
            s =>
              s.id ===
              submissionId
          );

        const eventId =
          sub?.eventId || '';

        await persistCampers(
          client,
          submissionId,
          eventId,
          updatedCampers
        );
      }
    };

  // ── Handler: Update Submission Status ──────────────────────

  const handleUpdateSubmissionStatus =
    (
      submissionId: string,
      newStatus:
        SubmissionStatus
    ) => {
      setSubmissions(prev =>
        prev.map(s =>
          s.id === submissionId
            ? {
                ...s,
                status:
                  newStatus
              }
            : s
        )
      );

      const client =
        getSupabaseClient();

      if (client) {
        client
          .from(
            'registrations'
          )
          .update({
            status: newStatus
          })
          .eq(
            'id',
            submissionId
          )
          .then(
            ({ error }) => {
              if (error) {
                console.warn(
                  'Supabase submission status update error:',
                  error
                );
              }
            }
          );
      }
    };

  // ── Handler: Delete Submission ──────────────────────────────

  const handleDeleteSubmission =
    async (
      submissionId: string
    ) => {
      const client =
        getSupabaseClient();

      // 1. Explicit camper cleanup

      if (client) {
        const {
          error: camperErr
        } = await client
          .from('campers')
          .delete()
          .eq(
            'submission_id',
            submissionId
          );

        if (camperErr) {
          console.warn(
            'Supabase campers delete error:',
            camperErr
          );
        }
      }

      // 2. Delete registration

      if (client) {
        const {
          error: regErr
        } = await client
          .from(
            'registrations'
          )
          .delete()
          .eq(
            'id',
            submissionId
          );

        if (regErr) {
          console.error(
            'Supabase submission delete error:',
            regErr
          );

          alert(
            `Could not delete this registration from Supabase.\n\n${regErr.message}`
          );

          return;
        }
      }

      // 3. Remove local state

      setSubmissions(prev =>
        prev.filter(
          s =>
            s.id !==
            submissionId
        )
      );
    };

  // ── AI Assistant Quick Actions Router ──────────────────────

  const handleAIAction = (
    actionType: string,
    payload?: any
  ) => {
    if (
      actionType ===
        'create_event' &&
      payload &&
      typeof payload ===
        'object'
    ) {
      setEditingEvent(payload);
      setIsFormBuilderOpen(true);
      setIsAIAssistantOpen(false);
    } else if (
      actionType ===
      'open_templates'
    ) {
      setActiveTab('templates');
      setIsAIAssistantOpen(false);
    } else if (
      actionType ===
      'open_table'
    ) {
      setEventDataViewId(null);
      setActiveTab(
        'submissions'
      );
      setIsAIAssistantOpen(false);
    } else if (
      actionType ===
      'open_archive'
    ) {
      setActiveTab('archive');
      setIsAIAssistantOpen(false);
    } else if (
      actionType ===
      'open_supabase'
    ) {
      setActiveTab(
        'supabase'
      );
      setIsAIAssistantOpen(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // PUBLIC ROUTES
  //
  // IMPORTANT:
  // These checks MUST remain before the administrator
  // authentication guard.
  // ═══════════════════════════════════════════════════════════

  // ── Camper list route ───────────────────────────────────────

  if (camperListEventId) {
    return (
      <CamperListPage
        eventId={
          camperListEventId
        }
        onBack={() => {
          window.location.hash =
            `/form/${camperListEventId}`;

          setCamperListEventId(
            null
          );
        }}
      />
    );
  }

  // ── Public registration route ───────────────────────────────

  if (publicEventId) {
    return (
      <PublicRegistrationPage
        eventId={publicEventId}
        onBackToDashboard={() => {
          window.location.hash =
            '';

          setPublicEventId(
            null
          );
        }}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN AUTHENTICATION GUARD
  //
  // Everything below this point requires an authenticated
  // Supabase session.
  // ═══════════════════════════════════════════════════════════

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#070d19] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto border-4 border-slate-700 border-t-amber-400 rounded-full animate-spin" />

          <p className="mt-4 text-sm text-slate-400">
            Verifying administrator
            session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorizedAdmin) {
    return (
      <div>
        {authError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] rounded-xl border border-red-500/30 bg-red-950/90 px-4 py-3 text-sm text-red-200 shadow-xl">
            {authError}
          </div>
        )}

        <LoginPage
          onAuthenticated={() => {
            // LoginPage establishes the Supabase session only.
            // App.tsx still verifies admin_users before allowing access.
            setAuthError(null);
            setIsAuthChecking(true);
          }}
        />
      </div>
    );
  }

  // ── Selected event for per-event data page ─────────────────

  const eventDataViewEvent =
    eventDataViewId
      ? events.find(
          e =>
            e.id ===
            eventDataViewId
        ) || null
      : null;

  // ═══════════════════════════════════════════════════════════
  // ADMIN DASHBOARD
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar
        activeTab={activeTab}
        setActiveTab={tab => {
          setEventDataViewId(
            null
          );

          setActiveTab(tab);
        }}
        onOpenNewEvent={() => {
          setEditingEvent(
            undefined
          );

          setIsFormBuilderOpen(
            true
          );
        }}
        onToggleAIAssistant={() =>
          setIsAIAssistantOpen(
            !isAIAssistantOpen
          )
        }
        supabaseConfig={
          supabaseConfig
        }
        eventsCount={
          events.filter(
            e =>
              e.status !==
              'archived'
          ).length
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {eventDataViewEvent ? (
          <EventDataView
            event={
              eventDataViewEvent
            }
            submissions={submissions.filter(
              s =>
                s.eventId ===
                eventDataViewEvent.id
            )}
            onBack={() =>
              setEventDataViewId(
                null
              )
            }
            onUpdateSubmissionStatus={
              handleUpdateSubmissionStatus
            }
            onUpdateSubmissionData={
              handleUpdateSubmissionData
            }
            onDeleteSubmission={
              handleDeleteSubmission
            }
          />
        ) : (
          <>
            {activeTab ===
              'events' && (
              <EventsView
                events={
                  events
                }
                submissions={
                  submissions
                }
                onOpenNewEvent={() => {
                  setEditingEvent(
                    undefined
                  );

                  setIsFormBuilderOpen(
                    true
                  );
                }}
                onEditEvent={
                  event => {
                    setEditingEvent(
                      event
                    );

                    setIsFormBuilderOpen(
                      true
                    );
                  }
                }
                onArchiveEvent={
                  handleArchiveEvent
                }
                onOpenPublicForm={
                  event => {
                    window.location.hash =
                      `/form/${event.id}`;
                  }
                }
                onViewSubmissions={
                  eventId => {
                    setEventDataViewId(
                      eventId
                    );
                  }
                }
              />
            )}

            {activeTab ===
              'templates' && (
              <TemplatesView
                onSelectTemplate={
                  handleSelectTemplate
                }
              />
            )}

            {activeTab ===
              'submissions' && (
              <SubmissionsView
                events={
                  events
                }
                submissions={
                  submissions
                }
                selectedEventId={
                  selectedSubmissionsEventId
                }
              />
            )}

            {activeTab ===
              'archive' && (
              <ArchiveView
                events={
                  events
                }
                submissions={
                  submissions
                }
                logs={logs}
                onRestoreEvent={
                  handleRestoreEvent
                }
              />
            )}

            {activeTab ===
              'supabase' && (
              <div className="py-4">
                <SupabaseModal
                  config={
                    supabaseConfig
                  }
                  onClose={() =>
                    setActiveTab(
                      'events'
                    )
                  }
                  onUpdateConfig={
                    newConfig =>
                      setSupabaseConfig(
                        newConfig
                      )
                  }
                />
              </div>
            )}
          </>
        )}
      </main>

      {isFormBuilderOpen && (
        <FormBuilderModal
          initialEvent={
            editingEvent
          }
          onClose={() => {
            setIsFormBuilderOpen(
              false
            );

            setEditingEvent(
              undefined
            );
          }}
          onSave={
            handleSaveEvent
          }
        />
      )}

      <AIAssistantDrawer
        isOpen={
          isAIAssistantOpen
        }
        onClose={() =>
          setIsAIAssistantOpen(
            false
          )
        }
        events={events}
        totalSubmissions={
          submissions.length
        }
        onSelectAction={
          handleAIAction
        }
      />

      <footer className="glass-panel border-t border-slate-800/80 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">

          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-amber-300">
              MYRRH REGISTRY
            </span>

            <span>
              • Event & Registration
              Platform
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>
              Supabase DB Enabled
            </span>

            <span>
              Vercel Deployed
            </span>

            <span>
              Lyka Colinares
            </span>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default App;