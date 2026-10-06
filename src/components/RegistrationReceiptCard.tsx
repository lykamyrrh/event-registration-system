import React from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  User,
  Users
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface CamperReceiptItem {
  fullName: string;
  badgeName: string;
  age: string;
  gradeLevel: string;
  gender: string;
}

export interface RegistrationReceiptCardProps {
  /** Event id used only to open the protected camper-list entry page. */
  eventId: string;
  /** Event title, e.g. "AYOS Youth Camp 2026" */
  eventTitle: string;
  /** Church name */
  churchName: string;
  /** Pastor full name */
  pastorName?: string;
  /** Delegation head full name */
  delegationHead?: string;
  /** Delegation head contact */
  delegationContact?: string;
  /** The church registration code (CH-XXXXXX) */
  churchRegistrationCode: string;
  /** Reference ID of this specific submission */
  submissionReference?: string;
  /** Submitted at ISO string */
  submittedAt?: string;
  /**
   * Kept for compatibility with the existing registration page.
   * Camper names/details are deliberately NOT rendered on the receipt.
   */
  campers: CamperReceiptItem[];
  /** Total cumulative campers across all delegations */
  totalDelegationCampers?: number;
  /** Delegation number (1st, 2nd, 3rd…) */
  delegationNumber?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (iso?: string) => {
  if (!iso) return '—';

  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const RegistrationReceiptCard: React.FC<RegistrationReceiptCardProps> = ({
  eventId,
  eventTitle,
  churchName,
  pastorName,
  delegationHead,
  delegationContact,
  submissionReference,
  submittedAt,
  campers,
  totalDelegationCampers,
  delegationNumber
}) => {
  const handleOpenSubmittedCampers = () => {
    // SECURITY:
    // The church registration code is intentionally NOT placed in the URL.
    // The new page requires the visitor to enter it again.
    const safeEventId = encodeURIComponent(eventId);
    const camperListUrl = `${window.location.origin}${window.location.pathname}#/campers/${safeEventId}`;

    window.open(
      camperListUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const displayedCamperCount =
    typeof totalDelegationCampers === 'number'
      ? totalDelegationCampers
      : campers.length;

  return (
    <div className="w-full max-w-lg mx-auto animate-fadeIn">
      {/* Receipt label */}
      <div className="flex items-center mb-3 px-1">
        <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Registration Receipt
          {delegationNumber && delegationNumber > 1 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px]">
              Delegation #{delegationNumber}
            </span>
          )}
        </p>


      </div>

      {/* Receipt card */}
      <div
        className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl shadow-amber-500/10 overflow-hidden"
      >
        {/* Header band */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-900/70 uppercase tracking-[0.2em]">
              Official Receipt
            </p>
            <h2 className="text-base font-black text-slate-950 leading-tight">
              {eventTitle}
            </h2>
          </div>

          <CheckCircle2 className="w-8 h-8 text-slate-950/70 shrink-0" />
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Church information */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-black text-slate-100">
                {churchName}
              </span>
            </div>

            {pastorName && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                <span className="text-[11px] text-slate-300">
                  Ptr. {pastorName}
                </span>
              </div>
            )}

            {delegationHead && (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                <span className="text-[11px] text-slate-300">
                  {delegationHead}
                  {delegationContact && (
                    <span className="text-slate-500">
                      {' '}· {delegationContact}
                    </span>
                  )}
                </span>
              </div>
            )}

          </div>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-800" />
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Camper privacy section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Submitted Campers
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {displayedCamperCount}{' '}
                  {displayedCamperCount === 1 ? 'camper' : 'campers'} registered.
                  Names are hidden from this receipt.
                </p>
              </div>

              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>

            <button
              type="button"
              onClick={handleOpenSubmittedCampers}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 text-xs font-black transition"
            >
              <Users className="w-4 h-4" />
              Submitted Campers
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              Opens in a new tab. Enter the Church Registration Code again to view the list.
            </p>
          </div>

          {/* Footer meta */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-500">
            {submissionReference && (
              <span className="font-mono">
                Ref: {submissionReference}
              </span>
            )}

            {submittedAt && (
              <span>
                Submitted: {formatDate(submittedAt)}
              </span>
            )}
          </div>

          {/* Confirmation badge */}
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-[11px] font-bold text-emerald-300 text-center leading-snug">
              ✓ Registration successfully recorded for YOUTH CAMP 2026
            </p>
          </div>

          <p className="text-center text-[10px] text-slate-600 leading-relaxed">
            Keep your Church Registration Code private. It is required to view submitted camper information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationReceiptCard;
