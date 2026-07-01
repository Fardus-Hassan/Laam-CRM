export type SmsTemplate = {
  id: string;
  label: string;
  message: string;
  statusSlugs?: string[];
};

const STORAGE_KEY = 'laam-sms-templates';

export const DEFAULT_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'confirm',
    label: 'Order confirmed',
    message: 'Apnar order confirm hoyeche. Dhonnobad — Laam Store.',
    statusSlugs: ['pending', 'confirmed'],
  },
  {
    id: 'dispatch',
    label: 'Out for delivery',
    message: 'Apnar order aj delivery er jonno ber hoyeche.',
    statusSlugs: ['in_courier', 'processing'],
  },
  {
    id: 'followup',
    label: 'Follow-up reminder',
    message: 'Apnar order niye jogajog korte chai. Phone e call korun plz.',
    statusSlugs: ['pending', 'hold_followup'],
  },
  {
    id: 'cod',
    label: 'COD reminder',
    message: 'Delivery er somoy COD amount ready rakhben. Dhonnobad.',
  },
  {
    id: 'custom',
    label: 'Custom message',
    message: '',
  },
];

export function loadSmsTemplates(): SmsTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_SMS_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SMS_TEMPLATES;
    const parsed = JSON.parse(raw) as SmsTemplate[];
    return parsed.length > 0 ? parsed : DEFAULT_SMS_TEMPLATES;
  } catch {
    return DEFAULT_SMS_TEMPLATES;
  }
}

export function saveSmsTemplates(templates: SmsTemplate[]): SmsTemplate[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return templates;
}

export function resetSmsTemplates(): SmsTemplate[] {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_SMS_TEMPLATES;
}
