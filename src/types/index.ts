export type FieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'select' 
  | 'radio' 
  | 'checkbox' 
  | 'date' 
  | 'textarea' 
  | 'number'
  | 'link';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
  linkUrl?: string;
  section?: 'part1' | 'part2'; // Part 1: Church info, Part 2: Camper info
}

export type EventStatus = 'active' | 'draft' | 'archived';
export type EventType = 'pre-registration' | 'registration' | 'waitlist';
export type EventCategory = 'conference' | 'workshop' | 'gala' | 'general' | 'webinar' | 'camp';

export interface ExternalLink {
  label: string;
  url: string;
}

export interface CamperItem {
  id: string;
  fullName: string;
  badgeName: string;
  age: string;
  gradeLevel: string;
  gender: string;
}

export interface CustomInjectorPack {
  id: string;
  name: string;
  description: string;
  iconName?: string;
  fields: FormField[];
}

export interface RegistrationEvent {
  id: string;
  title: string;
  slug: string;
  type: EventType;
  category: EventCategory;
  description: string;
  location?: string;
  eventDate?: string;
  status: EventStatus;
  themeBanner?: string;
  fields: FormField[];
  created_at: string;
  last_used_at: string;
  maxRegistrations?: number;
  submitButtonText?: string;
  successMessage?: string;
  externalLink?: ExternalLink;
  isMultiPart?: boolean;
}

export type SubmissionStatus = 'confirmed' | 'pending' | 'checked-in' | 'paid' | 'cancelled';

export interface RegistrationSubmission {
  id: string;
  eventId: string;
  submitted_at: string;
  status: SubmissionStatus;
  data: Record<string, any>;
  campers?: CamperItem[]; // Array of campers registered under church delegation
  notes?: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  badge: string;
  iconName: string;
  category: EventCategory;
  defaultType: EventType;
  defaultTitle: string;
  defaultDescription: string;
  fields: FormField[];
  externalLink?: ExternalLink;
  isMultiPart?: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  eventId?: string;
  type: 'info' | 'success' | 'warning';
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}
