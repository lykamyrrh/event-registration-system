import { FormTemplate } from '../types';

export const STARTER_TEMPLATES: FormTemplate[] = [
  {
    id: 'tpl-ayos-youth-camp',
    name: 'AYOS YOUTH CAMP 2026 (2-Part Pre-Registration)',
    description: 'Official 2-Part Pre-Registration Template. Part 1: Church, Pastor, & Delegation Head Info. Part 2: Dynamic Camper Roster (Full Name, Badge Name, Age, Grade Level, Gender).',
    badge: '2-Part Pre-Registration',
    iconName: 'Tent',
    category: 'camp',
    defaultType: 'pre-registration',
    defaultTitle: 'AYOS YOUTH CAMP 2026 Pre-Registration',
    defaultDescription: 'Official Delegation & Camper Roster Pre-Registration. Please complete Part 1 for Church & Delegation Head details, then add your campers in Part 2.',
    isMultiPart: true,
    externalLink: {
      label: 'Camp Guidelines & Info Packet',
      url: 'https://example.com/ayos-camp-info'
    },
    fields: [
      // PART 1: Church Details
      {
        id: 'f_church_name',
        label: 'Church Name',
        type: 'text',
        placeholder: 'e.g. Grace Fellowship Church',
        required: true,
        section: 'part1'
      },
      {
        id: 'f_church_address',
        label: 'Church Address',
        type: 'text',
        placeholder: 'Street / Barangay / District',
        required: true,
        section: 'part1'
      },
      {
        id: 'f_city_province',
        label: 'City / Province',
        type: 'text',
        placeholder: 'e.g. Quezon City, Metro Manila',
        required: true,
        section: 'part1'
      },

      // PART 1: Pastor Details
      {
        id: 'f_pastor_fullname',
        label: 'Pastor Full Name',
        type: 'text',
        placeholder: 'Ptr. Samuel Cruz',
        required: true,
        section: 'part1'
      },
      {
        id: 'f_pastor_contact',
        label: 'Pastor Contact Number',
        type: 'phone',
        placeholder: '+63 917 123 4567',
        required: true,
        section: 'part1'
      },
      {
        id: 'f_pastor_email',
        label: 'Pastor Email Address',
        type: 'email',
        placeholder: 'pastor@church.org',
        required: true,
        section: 'part1'
      },

      // PART 1: Delegation Head Details
      {
        id: 'f_delegation_fullname',
        label: 'Delegation Head Full Name',
        type: 'text',
        placeholder: 'David Reyes',
        required: true,
        section: 'part1'
      },
      {
        id: 'f_delegation_role',
        label: 'Delegation Head Role / Position',
        type: 'select',
        required: true,
        options: ['Youth Leader', 'Youth Pastor', 'Delegation Head', 'Associate Pastor', 'Senior Member'],
        section: 'part1'
      },
      {
        id: 'f_delegation_mobile',
        label: 'Delegation Head Mobile Number',
        type: 'phone',
        placeholder: '+63 918 987 6543',
        required: true,
        section: 'part1'
      },
      {
        id: 'f_delegation_email',
        label: 'Delegation Head Email Address',
        type: 'email',
        placeholder: 'delegation.head@church.org',
        required: true,
        section: 'part1'
      },

      // PART 2: Camper Roster Item Specifications
      {
        id: 'f_camper_full_name',
        label: 'Full Name',
        type: 'text',
        placeholder: 'First Name, Middle Name, Last Name',
        required: true,
        section: 'part2'
      },
      {
        id: 'f_preferred_badge_name',
        label: 'Preferred Badge Name',
        type: 'text',
        placeholder: 'Name to print on camp ID badge (e.g. Timmy)',
        required: true,
        section: 'part2'
      },
      {
        id: 'f_age',
        label: 'Age',
        type: 'number',
        placeholder: 'e.g. 17',
        required: true,
        section: 'part2'
      },
      {
        id: 'f_academic_level',
        label: 'Grade Level',
        type: 'select',
        required: true,
        options: ['elementary', 'junior high', 'senior high', 'college', 'working'],
        section: 'part2'
      },
      {
        id: 'f_gender',
        label: 'Gender',
        type: 'radio',
        required: true,
        options: ['male', 'female'],
        section: 'part2'
      }
    ]
  },
  {
    id: 'tpl-pre-reg-vip',
    name: 'Product Launch & VIP Pre-Registration',
    description: 'Perfect for upcoming product releases, early bird passes, and exclusive waitlists before official launch.',
    badge: 'Pre-Registration',
    iconName: 'Sparkles',
    category: 'general',
    defaultType: 'pre-registration',
    defaultTitle: 'VIP Access: NextGen AI Summit Pre-Registration',
    defaultDescription: 'Be the first to secure your priority spot before public tickets open. Pre-registered guests receive early-bird pricing and exclusive VIP networking perks.',
    fields: [
      {
        id: 'f_name',
        label: 'Full Name',
        type: 'text',
        placeholder: 'e.g. Eleanor Vance',
        required: true
      },
      {
        id: 'f_email',
        label: 'Work Email Address',
        type: 'email',
        placeholder: 'eleanor@company.com',
        required: true
      },
      {
        id: 'f_company',
        label: 'Company / Organization',
        type: 'text',
        placeholder: 'e.g. Acma Global Tech',
        required: false
      },
      {
        id: 'f_role',
        label: 'Job Title / Role',
        type: 'select',
        required: true,
        options: ['Executive / C-Suite', 'Engineering Lead', 'Product Manager', 'Designer', 'Investor', 'Other']
      },
      {
        id: 'f_interest',
        label: 'Primary Area of Interest',
        type: 'radio',
        required: true,
        options: ['Keynote Speeches', 'Hands-on AI Workshops', 'VIP Networking Dinner', 'Sponsorship & Expo']
      },
      {
        id: 'f_vip_pass',
        label: 'Request VIP Early Access Pass',
        type: 'checkbox',
        required: false,
        helpText: 'Check if you would like to be considered for our limited private VIP reception.'
      }
    ]
  },
  {
    id: 'tpl-conf-registration',
    name: 'Executive Summit & Conference Registration',
    description: 'Comprehensive registration form for multi-track conferences, summits, and large-scale convention events.',
    badge: 'Registration',
    iconName: 'Building2',
    category: 'conference',
    defaultType: 'registration',
    defaultTitle: 'Global Tech Leadership Summit 2026',
    defaultDescription: 'Join 1,000+ industry leaders for a 2-day conference on innovation, scalable architecture, and AI strategy.',
    fields: [
      {
        id: 'f_fullname',
        label: 'Full Legal Name',
        type: 'text',
        placeholder: 'e.g. Marcus Aurelius',
        required: true
      },
      {
        id: 'f_email',
        label: 'Primary Email',
        type: 'email',
        placeholder: 'marcus@domain.org',
        required: true
      },
      {
        id: 'f_phone',
        label: 'Phone Number',
        type: 'phone',
        placeholder: '+1 (555) 019-2831',
        required: true
      },
      {
        id: 'f_ticket_type',
        label: 'Ticket Tier',
        type: 'select',
        required: true,
        options: ['Standard All-Access Pass', 'VIP Platinum Pass', 'Speaker Pass', 'Press / Media']
      },
      {
        id: 'f_dietary',
        label: 'Dietary Restrictions',
        type: 'select',
        required: false,
        options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher']
      },
      {
        id: 'f_tshirt',
        label: 'Conference Swag T-Shirt Size',
        type: 'radio',
        required: true,
        options: ['Small', 'Medium', 'Large', 'XL', '2XL']
      },
      {
        id: 'f_notes',
        label: 'Special Accommodations or Questions',
        type: 'textarea',
        placeholder: 'Any accessibility needs or special requests for the organizers...',
        required: false
      }
    ]
  },
  {
    id: 'tpl-workshop-signup',
    name: 'Hands-On Masterclass & Workshop Signup',
    description: 'Ideal for technical workshops, training sessions, bootcamps, and interactive webinars with limited seat capacity.',
    badge: 'Registration',
    iconName: 'GraduationCap',
    category: 'workshop',
    defaultType: 'registration',
    defaultTitle: 'Advanced Cloud & AI Architecture Masterclass',
    defaultDescription: 'Interactive 3-hour deep dive masterclass. Seats are capped at 50 attendees for maximum direct mentor interaction.',
    fields: [
      {
        id: 'f_name',
        label: 'Participant Name',
        type: 'text',
        placeholder: 'e.g. Samantha Wright',
        required: true
      },
      {
        id: 'f_email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'samantha@tech.io',
        required: true
      },
      {
        id: 'f_experience',
        label: 'Experience Level',
        type: 'radio',
        required: true,
        options: ['Beginner', 'Intermediate', 'Advanced Expert']
      },
      {
        id: 'f_track',
        label: 'Preferred Lab Track',
        type: 'select',
        required: true,
        options: ['Track A: Supabase & Vector Databases', 'Track B: LLM Orchestration & Agents', 'Track C: Modern Frontend & Vercel']
      },
      {
        id: 'f_bring_laptop',
        label: 'I will bring my own laptop for the hands-on coding exercises',
        type: 'checkbox',
        required: true
      }
    ]
  },
  {
    id: 'tpl-gala-rsvp',
    name: 'Gala Dinner & Award Night RSVP',
    description: 'Elegant RSVP form for formal galas, award ceremonies, charity banquets, and special milestone celebrations.',
    badge: 'Special Occasion',
    iconName: 'Award',
    category: 'gala',
    defaultType: 'registration',
    defaultTitle: 'Annual Blue & Gold Excellence Gala 2026',
    defaultDescription: 'You are cordially invited to celebrate an evening of excellence, fine dining, and live musical performance.',
    fields: [
      {
        id: 'f_guest_name',
        label: 'Honored Guest Name',
        type: 'text',
        placeholder: 'e.g. Lord Harrington',
        required: true
      },
      {
        id: 'f_email',
        label: 'Email Confirmation',
        type: 'email',
        placeholder: 'harrington@estate.co.uk',
        required: true
      },
      {
        id: 'f_attending',
        label: 'Attending Status',
        type: 'radio',
        required: true,
        options: ['Joyfully Accept', 'Regretfully Decline']
      },
      {
        id: 'f_plus_one',
        label: 'Bringing a Guest (+1)?',
        type: 'select',
        required: true,
        options: ['Solo Attendee', 'Bringing +1 Guest']
      },
      {
        id: 'f_meal_choice',
        label: 'Main Entrée Selection',
        type: 'select',
        required: true,
        options: ['Filet Mignon with Truffle Reduction', 'Pan-Seared Sea Bass', 'Roasted Golden Beet & Quinoa Wellington (Vegan)']
      }
    ]
  }
];
