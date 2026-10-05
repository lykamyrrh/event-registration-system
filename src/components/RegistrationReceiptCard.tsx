import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Building2,
  CheckCircle2,
  Download,
  GraduationCap,
  QrCode,
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
  /** List of campers in THIS submission */
  campers: CamperReceiptItem[];
  /** Total cumulative campers across all delegations */
  totalDelegationCampers?: number;
  /** Delegation number (1st, 2nd, 3rd…) */
  delegationNumber?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const GRADE_LABEL: Record<string, string> = {
  elementary: 'Elem',
  'junior high': 'JHS',
  'senior high': 'SHS',
  college: 'College',
  working: 'Working'
};

const gradeBadgeColor = (level: string) => {
  switch (level) {
    case 'elementary':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'junior high':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'senior high':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'college':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

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
  eventTitle,
  churchName,
  pastorName,
  delegationHead,
  delegationContact,
  churchRegistrationCode,
  submissionReference,
  submittedAt,
  campers,
  totalDelegationCampers,
  delegationNumber
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // QR payload — encodes key registration info as a compact JSON string
  const qrPayload = JSON.stringify({
    event: eventTitle,
    church: churchName,
    code: churchRegistrationCode,
    ref: submissionReference || '',
    campers: campers.length,
    status: 'REGISTERED'
  });

  const handlePrint = () => {
    const el = receiptRef.current;
    if (!el) return;

    const printWindow = window.open('', '_blank', 'width=480,height=700');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print the receipt.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Receipt – ${churchName}</title>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #fff; color: #0f172a; padding: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 4px 8px; text-align: left; font-size: 11px; }
    th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; color: #64748b; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>${el.outerHTML}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-fadeIn">
      {/* ── Action bar above the card ───────────────────────── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5" />
          Registration Receipt
          {delegationNumber && delegationNumber > 1 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px]">
              Delegation #{delegationNumber}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5" />
          Print / Save
        </button>
      </div>

      {/* ── Receipt card ─────────────────────────────────────── */}
      <div
        ref={receiptRef}
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
          {/* Church + code row */}
          <div className="flex items-start gap-4">
            {/* QR Code */}
            <div className="shrink-0 p-2 rounded-xl bg-white border border-amber-300 shadow-md shadow-amber-500/20">
              <QRCodeSVG
                value={qrPayload}
                size={88}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Church info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-black text-slate-100 truncate">
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
                      <span className="text-slate-500"> · {delegationContact}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Church code */}
              <div className="pt-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Church Registration Code
                </p>
                <span className="font-mono font-black text-amber-400 text-sm tracking-widest">
                  {churchRegistrationCode}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-800" />
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Camper roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Registered Campers — {campers.length}{' '}
                {campers.length === 1 ? 'person' : 'persons'}
              </p>
              {typeof totalDelegationCampers === 'number' &&
                totalDelegationCampers !== campers.length && (
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {totalDelegationCampers} total in church
                  </span>
                )}
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wider text-slate-500 bg-slate-900">
                    <th className="px-3 py-2 font-black text-left w-7">#</th>
                    <th className="px-3 py-2 font-black text-left">Name</th>
                    <th className="px-3 py-2 font-black text-left">Badge</th>
                    <th className="px-3 py-2 font-black text-center">Age</th>
                    <th className="px-3 py-2 font-black text-left">Level</th>
                    <th className="px-3 py-2 font-black text-left">Sex</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {campers.length > 0 ? (
                    campers.map((c, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? '' : 'bg-slate-900/40'}
                      >
                        <td className="px-3 py-1.5 text-slate-500 font-mono text-[10px]">
                          {i + 1}
                        </td>
                        <td className="px-3 py-1.5 font-semibold text-slate-100 text-[11px] max-w-[90px] truncate">
                          {c.fullName || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-slate-400 text-[11px]">
                          {c.badgeName || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-center text-slate-400 text-[10px]">
                          {c.age || '—'}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${gradeBadgeColor(c.gradeLevel)}`}
                          >
                            {GRADE_LABEL[c.gradeLevel] ?? c.gradeLevel}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              c.gender === 'male'
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-pink-100 text-pink-700 border-pink-200'
                            }`}
                          >
                            {c.gender === 'male' ? 'M' : 'F'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-center text-slate-600 text-[11px] italic"
                      >
                        No campers in this delegation
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer meta */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-500">
            {submissionReference && (
              <span className="font-mono">Ref: {submissionReference}</span>
            )}
            {submittedAt && (
              <span>Submitted: {formatDate(submittedAt)}</span>
            )}
          </div>

          {/* "Already in the list" confirmation badge */}
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-[11px] font-bold text-emerald-300 text-center leading-snug">
              ✓ Already in the YOUTH CAMP 2026 registration list
            </p>
          </div>

          {/* QR instruction */}
          <p className="text-center text-[10px] text-slate-600 leading-relaxed">
            Scan the QR code above for instant check-in at camp registration.
            <br />
            Keep this receipt for your records.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationReceiptCard;
