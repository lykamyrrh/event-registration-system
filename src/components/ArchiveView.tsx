import React, { useState, useMemo } from 'react';
import { RegistrationEvent, RegistrationSubmission, SystemLog } from '../types';
import { 
  Archive, 
  RotateCcw, 
  Users, 
  Activity, 
  History, 
  User,
  ChevronLeft,
  ChevronRight,
  CalendarDays
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

  // ── Timeline Filtering & Pagination State ──
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const getSubmissionsForEvent = (eventId: string) => {
    return submissions.filter(s => s.eventId === eventId);
  };

  // ── Filter Logs by Date ──
  const filteredLogs = useMemo(() => {
    if (dateFilter === 'all') return logs;
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (dateFilter === 'today') return logDate >= startOfDay;
      
      const daysAgo = new Date(startOfDay);
      if (dateFilter === '7days') daysAgo.setDate(daysAgo.getDate() - 7);
      if (dateFilter === '30days') daysAgo.setDate(daysAgo.getDate() - 30);
      
      return logDate >= daysAgo;
    });
  }, [logs, dateFilter]);

  // ── Paginate Logs ──
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * logsPerPage;
    return filteredLogs.slice(start, start + logsPerPage);
  }, [filteredLogs, currentPage]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  return (
    <div className="space-y-8 animate-fadeIn font-sans text-slate-100">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Archive className="w-3.5 h-3.5" />
          Archive & History Vault
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Past Events & <span className="text-amber-500">System Logs</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review previous registration sites, historical attendee records, and activity timeline. Restore any archived site in 1 click.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: System Audit & Activity Log (Now takes 7/12 space) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              System Usage History
            </h2>
            
            {/* Date Filter */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Time</option>
                <option value="today" className="bg-slate-900">Today</option>
                <option value="7days" className="bg-slate-900">Last 7 Days</option>
                <option value="30days" className="bg-slate-900">Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
            {paginatedLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No activity logged for this time period.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {paginatedLogs.map((log) => {
                  const logTime = new Date(log.timestamp).toLocaleString([], { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                  const dotColor = 
                    log.type === 'success' ? 'bg-amber-500' :
                    log.type === 'warning' ? 'bg-red-400' :
                    log.type === 'error' ? 'bg-red-500' :
                    'bg-slate-500';

                  // Extract the email, fallback to "System"
                  const displayEmail = log.userEmail && log.userEmail !== 'Unknown Admin' 
                    ? log.userEmail 
                    : 'System / Unknown';

                  return (
                    <div key={log.id} className="relative">
                      <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-slate-900 shadow-sm`} />
                      
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white">{log.action}</span>
                          <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{logTime}</span>
                        </div>

                        {/* Show Authorized Admin Email */}
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-amber-400 border border-slate-700">
                            <User className="w-3 h-3" />
                            {displayEmail}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed mt-1">
                          {log.details}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Archived Registration Sites (Now takes 5/12 space) */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            Archived Sites ({archivedEvents.length})
          </h2>

          {archivedEvents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3 shadow-sm">
              <Archive className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">No events in the archive.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {archivedEvents.map((event) => {
                const subs = getSubmissionsForEvent(event.id);
                const createdDate = new Date(event.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <div
                    key={event.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-400">
                          Archived
                        </span>
                        <span className="text-xs text-slate-500">Created {createdDate}</span>
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {event.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 font-medium">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-amber-500" /> {subs.length} Registrants
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onRestoreEvent(event.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shrink-0 shadow-md shadow-amber-500/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
                      <span>Restore to Active</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};