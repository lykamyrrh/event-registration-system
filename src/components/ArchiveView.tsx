import React from 'react';
import { RegistrationEvent, RegistrationSubmission, SystemLog } from '../types';
import { 
  Archive, 
  RotateCcw, 
  Clock, 
  Users, 
  Calendar, 
  Activity, 
  History, 
  CheckCircle2, 
  FileText,
  AlertCircle
} from 'lucide-react';

interface ArchiveViewProps {
  events: RegistrationEvent[];
  submissions: RegistrationSubmission[];
  logs: SystemLog[];
  onRestoreEvent: (eventId: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  events,
  submissions,
  logs,
  onRestoreEvent
}) => {
  const archivedEvents = events.filter(e => e.status === 'archived');

  const getSubmissionsForEvent = (eventId: string) => {
    return submissions.filter(s => s.eventId === eventId);
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans text-navy-900">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-navy-600/20 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-600/10 border border-navy-600/30 text-navy-600 text-xs font-semibold uppercase tracking-wider mb-2">
          <Archive className="w-3.5 h-3.5" />
          Archive & History Vault
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
          Past Events & <span className="text-navy-600">System Logs</span>
        </h1>
        <p className="text-navy-600 text-sm mt-1">
          Review previous registration sites, historical attendee records, and activity timeline. Restore any archived site in 1 click.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Archived Registration Sites */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <History className="w-5 h-5 text-navy-600" />
            Archived Registration Sites ({archivedEvents.length})
          </h2>

          {archivedEvents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-navy-600/20 text-center space-y-3 shadow-sm">
              <Archive className="w-10 h-10 text-navy-600/40 mx-auto" />
              <p className="text-navy-600 text-sm">No events in the archive.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {archivedEvents.map((event) => {
                const subs = getSubmissionsForEvent(event.id);
                const createdDate = new Date(event.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <div
                    key={event.id}
                    className="p-5 rounded-2xl bg-white border border-navy-600/20 hover:border-navy-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ivory-dark border border-navy-600/20 text-navy-600">
                          Archived
                        </span>
                        <span className="text-xs text-navy-600">Created {createdDate}</span>
                      </div>
                      <h3 className="text-lg font-bold text-navy-900">
                        {event.title}
                      </h3>
                      <p className="text-xs text-navy-600 mt-1 line-clamp-1">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-navy-600 mt-2 font-medium">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-navy-600" /> {subs.length} Historical Registrants
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onRestoreEvent(event.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-950 text-white text-xs font-semibold transition-all shrink-0 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-navy-100" />
                      <span>Restore to Active</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: System Audit & Activity Log */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-navy-600" />
            System Usage History Timeline
          </h2>

          <div className="p-5 rounded-2xl bg-white border border-navy-600/20 space-y-4 shadow-sm">
            {logs.length === 0 ? (
              <p className="text-xs text-navy-600">No activity logged yet.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-navy-100">
                {logs.map((log) => {
                  const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-navy-600 border-2 border-white shadow-sm" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-navy-900">{log.action}</span>
                        <span className="text-[10px] text-navy-600 font-mono">{logTime}</span>
                      </div>
                      <p className="text-xs text-navy-600 mt-1 leading-relaxed">
                        {log.details}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};