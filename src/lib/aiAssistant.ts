import { RegistrationEvent, FormField } from '../types';

export interface AIMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'create_event' | 'open_templates' | 'open_table' | 'open_archive' | 'open_supabase';
    payload?: any;
    label: string;
  };
}

export function generateAIResponse(
  userQuery: string,
  events: RegistrationEvent[],
  totalSubmissions: number
): AIMessage {
  const query = userQuery.toLowerCase().trim();
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Walkthrough / System Guide
  if (query.includes('guide') || query.includes('how to use') || query.includes('help') || query.includes('around') || query.includes('system')) {
    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      timestamp: now,
      text: `👋 Welcome to **Aurum Registry**! I am your AI System Assistant. Here is how you can manage your registration sites without writing a single line of code:\n\n` +
            `1️⃣ **Choose a Template**: Go to **Templates** to select from our 3+ pre-built blueprints (Product Launch Pre-Reg, Executive Conference, Workshop Signup, Gala RSVP).\n` +
            `2️⃣ **No-Code Customizer**: Click **Create Event** or edit existing forms. You can add/delete input fields, mark fields as required, set select dropdown choices, and customize button text.\n` +
            `3️⃣ **Data Tables & Filters**: Under **Submissions**, filter registrants by status (Confirmed, Pending, Checked-In), search names/emails, view precise timestamps, and export CSV.\n` +
            `4️⃣ **Archive & History**: Easily archive finished events to keep your dashboard clean while preserving all past registrants in full history.\n` +
            `5️⃣ **Supabase & Vercel**: Connect your Supabase credentials in 1 click or deploy live to Vercel instantly!`,
      suggestedAction: {
        type: 'open_templates',
        label: 'Explore Templates Gallery'
      }
    };
  }

  // 2. AI Form Generator (Auto-create events based on prompt)
  if (query.includes('create') || query.includes('generate') || query.includes('make a form') || query.includes('build')) {
    let generatedTitle = 'Special Registration Site';
    let category: 'conference' | 'workshop' | 'gala' | 'general' = 'general';
    let type: 'pre-registration' | 'registration' = 'registration';
    const fields: FormField[] = [
      { id: 'f_name', label: 'Full Name', type: 'text', placeholder: 'e.g. John Doe', required: true },
      { id: 'f_email', label: 'Email Address', type: 'email', placeholder: 'john@example.com', required: true }
    ];

    if (query.includes('hackathon') || query.includes('coding') || query.includes('tech')) {
      generatedTitle = 'AI & Web3 Hackathon 2026';
      category = 'workshop';
      type = 'pre-registration';
      fields.push(
        { id: 'f_github', label: 'GitHub Profile or Portfolio', type: 'text', placeholder: 'https://github.com/username', required: false },
        { id: 'f_role', label: 'Role / Expertise', type: 'select', required: true, options: ['Frontend Dev', 'Backend Dev', 'AI/ML Engineer', 'UI/UX Designer', 'Product Lead'] },
        { id: 'f_team', label: 'Do you have a team?', type: 'radio', required: true, options: ['Solo Developer', 'Looking for Team', 'Pre-formed Team'] }
      );
    } else if (query.includes('webinar') || query.includes('class') || query.includes('session')) {
      generatedTitle = 'Exclusive Masterclass Webinar';
      category = 'workshop';
      fields.push(
        { id: 'f_company', label: 'Company / School', type: 'text', required: false },
        { id: 'f_questions', label: 'Questions for the Speaker', type: 'textarea', placeholder: 'What topic would you like us to cover?', required: false }
      );
    } else {
      generatedTitle = 'Custom Event Registration';
      fields.push(
        { id: 'f_phone', label: 'Contact Phone', type: 'phone', required: false },
        { id: 'f_referral', label: 'How did you hear about us?', type: 'select', required: false, options: ['Social Media', 'Email Newsletter', 'Colleague Recommendation', 'Search Engine'] }
      );
    }

    const newEvent: Partial<RegistrationEvent> = {
      title: generatedTitle,
      slug: generatedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type,
      category,
      description: `AI-generated site configured for ${generatedTitle}. Fully customizable!`,
      status: 'active',
      fields,
      submitButtonText: 'Register Now',
      successMessage: 'Your registration has been received successfully!'
    };

    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      timestamp: now,
      text: `✨ I have drafted a custom **${generatedTitle}** registration form for you with ${fields.length} tailored fields!\n\nClick the button below to inspect and publish it immediately.`,
      suggestedAction: {
        type: 'create_event',
        payload: newEvent,
        label: `Publish "${generatedTitle}"`
      }
    };
  }

  // 3. Stats & Insights
  if (query.includes('stat') || query.includes('count') || query.includes('how many') || query.includes('total')) {
    const activeCount = events.filter(e => e.status === 'active').length;
    const archivedCount = events.filter(e => e.status === 'archived').length;

    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      timestamp: now,
      text: `📊 **Current Platform Overview**:\n\n` +
            `• **Active Registration Sites**: ${activeCount}\n` +
            `• **Archived Sites (History)**: ${archivedCount}\n` +
            `• **Total Registrations Collected**: ${totalSubmissions} records\n` +
            `• **Database**: Supabase ready (Local storage sync active)\n\n` +
            `Would you like to review submission tables or filter attendee records?`,
      suggestedAction: {
        type: 'open_table',
        label: 'View Submissions Table'
      }
    };
  }

  // 4. Vercel & Supabase Deployment Questions
  if (query.includes('vercel') || query.includes('deploy') || query.includes('publish') || query.includes('supabase')) {
    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      timestamp: now,
      text: `🚀 **How to Deploy Live to Vercel & Supabase**:\n\n` +
            `1️⃣ **Deploy to Vercel**: Simply push this repo to GitHub, import to [vercel.com](https://vercel.com), and click **Deploy**. Vercel will automatically build the Vite React output.\n` +
            `2️⃣ **Connect Supabase**: Open the **Supabase Config** tab in top navigation, paste your Supabase Project URL and Anon Key, then copy the 1-click SQL script into your Supabase SQL Editor.\n` +
            `3️⃣ **No Code Required**: Once deployed, you can create, publish, and manage all future registration sites directly from this UI!`,
      suggestedAction: {
        type: 'open_supabase',
        label: 'Open Supabase Setup & SQL'
      }
    };
  }

  // 5. Default Fallback Assistance
  return {
    id: `ai-${Date.now()}`,
    sender: 'ai',
    timestamp: now,
    text: `I'm here to help! You can ask me to:\n` +
          `• *"Guide me around the system"*\n` +
          `• *"Build a Hackathon registration form"*\n` +
          `• *"Show me total registration stats"*\n` +
          `• *"How do I deploy to Vercel?"*\n\n` +
          `Or choose from one of the quick actions below:`,
    suggestedAction: {
      type: 'open_templates',
      label: 'Browse Templates'
    }
  };
}
