export interface LinkedInTemplate {
  id: string;
  name: string;
  type: 'connection_request' | 'message' | 'follow_up';
  body: string; // with {placeholders}
  language: 'cs' | 'en';
}

export const LINKEDIN_TEMPLATES: LinkedInTemplate[] = [
  {
    id: 'cs_connection_intro',
    name: 'Úvodní connection request (CZ)',
    type: 'connection_request',
    body: `Dobrý den {contact_name},\n\nzaujal mě váš web {domain}. Pracuji s AI nástroji na redesign webů a rád bych vám ukázal, co jsme pro vás připravili.\n\nPřeji hezký den,\n{sender_name}`,
    language: 'cs',
  },
  {
    id: 'cs_message_preview',
    name: 'Zpráva s preview odkazem (CZ)',
    type: 'message',
    body: `Ahoj {contact_first_name},\n\nděkuji za propojení! Připravili jsme pro {company_name} 3 redesign varianty webu na míru.\n\nPodívejte se zde: {landing_page_url}\n\nPokud vás to zaujme, rád vám ukážu víc.\n\n{sender_name}`,
    language: 'cs',
  },
  {
    id: 'cs_follow_up',
    name: 'Follow-up zpráva (CZ)',
    type: 'follow_up',
    body: `{contact_first_name}, viděl jsem, že jste si prohlédli náš redesign pro {company_name}. Co říkáte? Máte 15 minut na krátký call?\n\n{sender_name}`,
    language: 'cs',
  },
  {
    id: 'en_connection_intro',
    name: 'Connection request (EN)',
    type: 'connection_request',
    body: `Hi {contact_name},\n\nI came across {domain} and noticed some opportunities to improve your web presence. We've prepared AI-powered redesign variants for your site.\n\nWould love to connect!\n\n{sender_name}`,
    language: 'en',
  },
  {
    id: 'en_message_preview',
    name: 'Preview message (EN)',
    type: 'message',
    body: `Hi {contact_first_name},\n\nThanks for connecting! We've prepared 3 custom redesign variants for {company_name}.\n\nCheck them out: {landing_page_url}\n\nHappy to discuss if you're interested.\n\n{sender_name}`,
    language: 'en',
  },
  {
    id: 'en_follow_up',
    name: 'Follow-up message (EN)',
    type: 'follow_up',
    body: `{contact_first_name}, I noticed you checked out our redesign for {company_name}. What do you think? Have 15 minutes for a quick call?\n\n{sender_name}`,
    language: 'en',
  },
];

// Fill template with data
export function fillLinkedInTemplate(
  template: LinkedInTemplate,
  data: Record<string, string>
): string {
  let result = template.body;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// Get templates by type and language
export function getLinkedInTemplates(
  type?: string,
  language?: string
): LinkedInTemplate[] {
  return LINKEDIN_TEMPLATES.filter(t => {
    if (type && t.type !== type) return false;
    if (language && t.language !== language) return false;
    return true;
  });
}
