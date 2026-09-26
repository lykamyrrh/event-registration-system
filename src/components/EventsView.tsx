import React, { useState } from 'react';
import { RegistrationEvent, RegistrationSubmission } from '../types';
import { 
  Globe, 
  Users, 
  CheckCircle2, 
  Search, 
  PlusCircle, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Table, 
  Copy, 
  Check, 
  Edit, 
  Archive,
  Layers
} from 'lucide-react';

interface EventsViewProps {
  events: RegistrationEvent[];
  submissions: RegistrationSubmission[];
  onOpenNewEvent: () => void;
  onEditEvent: (event: RegistrationEvent) => void;
  onArchiveEvent: (eventId: string) => void;
  onOpenPublicForm: (event: RegistrationEvent) => void;
  onViewSubmissions: (eventId: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  submissions,
  onOpenNewEvent,
  onEditEvent,
  onArchiveEvent,
  onOpenPublicForm,
  onViewSubmissions
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeEvents = events.filter(e => e.status !== 'archived');

  const filteredEvents = activeEvents.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLink = (event: RegistrationEvent) => {
    const link = `${window.location.origin}/#reg-${event.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSubmissionsForEvent = (eventId: string) => {
    return submissions.filter(s => s.eventId === eventId);
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans text-navy-900">
      
      {/* Overview Stats Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric Card 1 */}
        <div className="p-5 rounded-2xl bg-white border border-navy-600/20 shadow-sm hover:border-navy-600/50 transition relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-navy-600">
              Active Registration Sites
            </span>
            <div className="p-2.5 rounded-xl bg-navy-100/40 text-navy-900 border border-navy-600/20">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-navy-900 mb-1">
            {activeEvents.length}
          </div>
          <p className="text-xs text-navy-600">Ready for public submissions</p>
        </div>

        {/* Metric Card 2 */}
        <div className="p-5 rounded-2xl bg-white border border-navy-600/20 shadow-sm hover:border-navy-600/50 transition relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-navy-600">
              Total Registrations Collected
            </span>
            <div className="p-2.5 rounded-xl bg-navy-100/40 text-navy-900 border border-navy-600/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-navy-900 mb-1">
            {submissions.length}
          </div>
          <p className="text-xs text-navy-600">Stored safely in Supabase database</p>
        </div>

        {/* Metric Card 3 */}
        <div className="p-5 rounded-2xl bg-white border border-navy-600/20 shadow-sm hover:border-navy-600/50 transition relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-navy-600">
              System Status
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-800 mb-1 flex items-center gap-2">
            All Systems Live
          </div>
          <p className="text-xs text-navy-600">{activeEvents.length} sites publishing in real time</p>
        </div>

      </div>

      {/* Search Bar & Action Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-2">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-navy-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title, tag, or location..."
            className="w-full bg-white border border-navy-600/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition placeholder-navy-600/60 shadow-sm font-sans"
          />
        </div>

        <button
          onClick={onOpenNewEvent}
          className="w-full sm:w-auto px-5 py-2.5 bg-navy-900 hover:bg-navy-950 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4 text-navy-100" />
          <span>New Registration Site</span>
        </button>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white border border-navy-600/20 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <Layers className="w-12 h-12 text-navy-600/50 mx-auto" />
          <h3 className="text-xl font-bold text-navy-900">No Events Found</h3>
          <p className="text-navy-600 text-sm max-w-md mx-auto">
            No active registration sites match your search criteria. Create a new event or select from starter templates.
          </p>
          <button
            onClick={onOpenNewEvent}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold text-sm shadow-md hover:bg-navy-950 transition"
          >
            Create New Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const eventSubs = getSubmissionsForEvent(event.id);
            const totalCount = eventSubs.length;

            return (
              <div
                key={event.id}
                className="bg-white border border-navy-600/20 rounded-2xl flex flex-col justify-between hover:border-navy-600 transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                <div className="p-6 space-y-4">
                  {/* Tags & Counter */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`badge ${event.type === 'pre-registration' ? 'badge-navy' : 'badge-gold'}`}>
                        {event.type === 'pre-registration' ? 'Pre-Registration' : 'Registration'}
                      </span>
                      <span className="badge badge-neutral capitalize">
                        {event.category}
                      </span>
                    </div>

                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      totalCount > 0 ? 'text-emerald-700' : 'text-navy-500'
                    }`}>
                      <Users className={`w-3.5 h-3.5 ${totalCount > 0 ? 'text-emerald-600' : 'text-navy-500'}`} />
                      <span>{totalCount}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-navy-900 group-hover:text-navy-600 transition mb-2">
                      {event.title}
                    </h3>
                    <p className="text-xs text-navy-600 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  {/* Event Meta Details */}
                  <div className="space-y-2 pt-2 border-t border-navy-600/15 text-xs text-navy-900">
                    {event.eventDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-navy-600" />
                        <span>{event.eventDate}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-navy-600" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-ivory-dark border-t border-navy-600/20 rounded-b-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenPublicForm(event)}
                      className="flex-1 py-2 px-3 text-xs font-bold text-white bg-navy-900 hover:bg-navy-950 rounded-lg text-center transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-navy-100" />
                      <span>Public Form</span>
                    </button>

                    <button
                      onClick={() => onViewSubmissions(event.id)}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg text-center transition flex items-center justify-center gap-2 border shadow-sm ${
                        totalCount > 0
                          ? 'text-navy-900 bg-gold-50 border-gold-300 hover:bg-gold-100'
                          : 'text-navy-900 bg-white border-navy-600/30 hover:bg-navy-50'
                      }`}
                    >
                      <Table className={`w-3.5 h-3.5 ${totalCount > 0 ? 'text-gold-600' : 'text-navy-600'}`} />
                      <span>Data ({totalCount})</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-navy-600 pt-1">
                    <button
                      onClick={() => handleCopyLink(event)}
                      className="hover:text-navy-900 font-medium transition flex items-center gap-1.5"
                    >
                      {copiedId === event.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-navy-600" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEditEvent(event)}
                        className="hover:text-navy-900 font-medium transition flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => onArchiveEvent(event.id)}
                        className="hover:text-rose-600 font-medium transition flex items-center gap-1"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};