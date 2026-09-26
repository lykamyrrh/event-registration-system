import { RegistrationEvent, RegistrationSubmission, SystemLog } from '../types';
import { STARTER_TEMPLATES } from './templates';

export const INITIAL_EVENTS: RegistrationEvent[] = [
  {
    id: 'evt-ayos-001',
    title: 'AYOS YOUTH CAMP 2026',
    slug: 'ayos-youth-camp-2026',
    type: 'registration',
    category: 'camp',
    description: 'Official Delegation & Camper Registration Form. Please fill out your church details, delegation head contact, and camper information.',
    location: 'Mount Zion Camp Grounds & Retreat Center',
    eventDate: '2026-10-25',
    status: 'active',
    fields: STARTER_TEMPLATES[0].fields,
    created_at: '2026-09-20T08:00:00.000Z',
    last_used_at: '2026-09-26T21:00:00.000Z',
    maxRegistrations: 1000,
    submitButtonText: 'Submit Camp Registration',
    successMessage: 'Praise God! Your camp registration has been submitted. Please coordinate payment with your Delegation Head.',
    externalLink: {
      label: 'View Camp Guidelines & Packing List',
      url: 'https://example.com/ayos-camp-guidelines'
    }
  },
  {
    id: 'evt-001',
    title: 'Global Tech Leadership Summit 2026',
    slug: 'global-tech-summit-2026',
    type: 'registration',
    category: 'conference',
    description: 'Join 1,000+ industry leaders for a 2-day conference on innovation, scalable architecture, and AI strategy.',
    location: 'Metropolitan Convention Center & Online',
    eventDate: '2026-11-15',
    status: 'active',
    fields: STARTER_TEMPLATES[2].fields,
    created_at: '2026-08-01T09:00:00.000Z',
    last_used_at: '2026-09-26T14:30:00.000Z',
    maxRegistrations: 500,
    submitButtonText: 'Confirm Summit Registration',
    successMessage: 'Congratulations! Your seat for Global Tech Leadership Summit 2026 is confirmed. Check your email for ticket QR.'
  },
  {
    id: 'evt-002',
    title: 'VIP Early Access: NextGen AI Platform',
    slug: 'nextgen-ai-vip-preregistration',
    type: 'pre-registration',
    category: 'general',
    description: 'Be the first to secure your priority spot before public tickets open. Pre-registered guests receive early-bird pricing.',
    location: 'Virtual Event Hub',
    eventDate: '2026-10-20',
    status: 'active',
    fields: STARTER_TEMPLATES[1].fields,
    created_at: '2026-08-15T11:20:00.000Z',
    last_used_at: '2026-09-25T18:45:00.000Z',
    maxRegistrations: 250,
    submitButtonText: 'Submit VIP Pre-Registration',
    successMessage: 'Thank you for pre-registering! You are #42 on the priority queue for exclusive early invite access.'
  }
];

export const INITIAL_SUBMISSIONS: RegistrationSubmission[] = [
  // AYOS YOUTH CAMP Submissions across different churches, roles & academic levels
  {
    id: 'sub-ayos-1',
    eventId: 'evt-ayos-001',
    submitted_at: '2026-09-26T21:00:00.000Z',
    status: 'paid',
    notes: 'Paid via GCash bank transfer. Verified by Delegation Head.',
    data: {
      f_church_name: 'Grace Baptist Church - Manila',
      f_church_address: 'Quezon City, Metro Manila',
      f_church_pastor: 'Pastor Samuel Cruz',
      f_youth_director: 'Brother Timothy Santos',
      f_delegation_head_name: 'David Reyes',
      f_delegation_head_phone: '+63 917 123 4567',
      f_attendee_role: 'Camper',
      f_camper_full_name: 'Joshua Emmanuel Cruz',
      f_preferred_badge_name: 'Josh',
      f_dob_age: 'May 12, 2007 (Age 19)',
      f_gender: 'Male',
      f_academic_level: 'College',
      f_payment_receipt_link: 'https://example.com/receipt-joshua.png'
    }
  },
  {
    id: 'sub-ayos-2',
    eventId: 'evt-ayos-001',
    submitted_at: '2026-09-26T19:30:00.000Z',
    status: 'paid',
    notes: 'Delegation Head registration fee waived by committee.',
    data: {
      f_church_name: 'Grace Baptist Church - Manila',
      f_church_address: 'Quezon City, Metro Manila',
      f_church_pastor: 'Pastor Samuel Cruz',
      f_youth_director: 'Brother Timothy Santos',
      f_delegation_head_name: 'David Reyes',
      f_delegation_head_phone: '+63 917 123 4567',
      f_attendee_role: 'Delegation Head',
      f_camper_full_name: 'David Reyes',
      f_preferred_badge_name: 'Dave',
      f_dob_age: 'Aug 24, 1998 (Age 28)',
      f_gender: 'Male',
      f_academic_level: 'Professional/Working'
    }
  },
  {
    id: 'sub-ayos-3',
    eventId: 'evt-ayos-001',
    submitted_at: '2026-09-26T18:15:00.000Z',
    status: 'pending',
    notes: 'Awaiting deposit slip validation.',
    data: {
      f_church_name: 'Victory Christian Fellowship - Cebu',
      f_church_address: 'Cebu City',
      f_church_pastor: 'Pastor Michael Tan',
      f_youth_director: 'Sister Sarah Lim',
      f_delegation_head_name: 'Hannah Mendoza',
      f_delegation_head_phone: '+63 918 987 6543',
      f_attendee_role: 'Camper',
      f_camper_full_name: 'Chloe Grace Tan',
      f_preferred_badge_name: 'Chloe',
      f_dob_age: 'Nov 03, 2010 (Age 15)',
      f_gender: 'Female',
      f_academic_level: 'Junior High'
    }
  },
  {
    id: 'sub-ayos-4',
    eventId: 'evt-ayos-001',
    submitted_at: '2026-09-26T16:00:00.000Z',
    status: 'confirmed',
    notes: 'Special guest pastor registration.',
    data: {
      f_church_name: 'Victory Christian Fellowship - Cebu',
      f_church_address: 'Cebu City',
      f_church_pastor: 'Pastor Michael Tan',
      f_youth_director: 'Sister Sarah Lim',
      f_delegation_head_name: 'Hannah Mendoza',
      f_delegation_head_phone: '+63 918 987 6543',
      f_attendee_role: 'Church Pastor',
      f_camper_full_name: 'Pastor Michael Tan',
      f_preferred_badge_name: 'Ptr. Mike',
      f_dob_age: 'Jan 15, 1980 (Age 46)',
      f_gender: 'Male',
      f_academic_level: 'Professional/Working'
    }
  },
  {
    id: 'sub-ayos-5',
    eventId: 'evt-ayos-001',
    submitted_at: '2026-09-25T14:20:00.000Z',
    status: 'paid',
    notes: 'Paid cash at church office.',
    data: {
      f_church_name: 'First Assembly of God - Davao',
      f_church_address: 'Davao City',
      f_church_pastor: 'Pastor Joseph Ramos',
      f_youth_director: 'Brother Mark Alonzo',
      f_delegation_head_name: 'Mark Alonzo',
      f_delegation_head_phone: '+63 920 555 1234',
      f_attendee_role: 'Youth Director',
      f_camper_full_name: 'Mark Alonzo',
      f_preferred_badge_name: 'Mark',
      f_dob_age: 'Feb 10, 1995 (Age 31)',
      f_gender: 'Male',
      f_academic_level: 'Professional/Working'
    }
  },

  // Standard Conference Submissions
  {
    id: 'sub-101',
    eventId: 'evt-001',
    submitted_at: '2026-09-26T14:30:00.000Z',
    status: 'confirmed',
    notes: 'VIP guest attendee.',
    data: {
      f_fullname: 'Alexander Pierce',
      f_email: 'a.pierce@apexcorp.com',
      f_phone: '+1 (555) 234-5678',
      f_ticket_type: 'VIP Platinum Pass',
      f_dietary: 'Vegetarian',
      f_tshirt: 'Large'
    }
  }
];

export const INITIAL_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-26T21:00:00.000Z',
    action: 'Payment Confirmed',
    details: 'Joshua Emmanuel Cruz (Grace Baptist Church) status set to PAID',
    eventId: 'evt-ayos-001',
    type: 'success'
  },
  {
    id: 'log-2',
    timestamp: '2026-09-20T08:00:00.000Z',
    action: 'Camp Site Published',
    details: 'AYOS YOUTH CAMP 2026 site was created and published',
    eventId: 'evt-ayos-001',
    type: 'info'
  }
];
