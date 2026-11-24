/**
 * Professional onboarding (KYC) rules for psychiatrists and psychologists in India.
 *
 * - Psychiatrists are registered with the National Medical Commission (NMC)
 *   or a State Medical Council, and hold MBBS plus MD/DNB/DPM in Psychiatry.
 * - Clinical psychologists are registered with the Rehabilitation Council of
 *   India (RCI) and hold an M.Phil in Clinical Psychology (or the RCI-recognised
 *   equivalent professional degree).
 * - Counsellors without RCI registration can be listed only as "wellbeing
 *   counsellors" and are never shown for moderate or severe OCD.
 *
 * Automated checks here are format checks. A human reviewer verifies every
 * application against the council's public register before approval.
 */

export type ProfessionalRole = 'psychiatrist' | 'clinical_psychologist' | 'counsellor';

export const COUNCILS: Record<ProfessionalRole, string[]> = {
  psychiatrist: [
    'National Medical Commission (NMC)',
    'Andhra Pradesh Medical Council', 'Assam Medical Council', 'Bihar Medical Council', 'Delhi Medical Council',
    'Gujarat Medical Council', 'Haryana Medical Council', 'Karnataka Medical Council', 'Kerala State Medical Councils',
    'Madhya Pradesh Medical Council', 'Maharashtra Medical Council', 'Odisha Council of Medical Registration',
    'Punjab Medical Council', 'Rajasthan Medical Council', 'Tamil Nadu Medical Council', 'Telangana State Medical Council',
    'Uttar Pradesh Medical Council', 'West Bengal Medical Council',
  ],
  clinical_psychologist: ['Rehabilitation Council of India (RCI)'],
  counsellor: ['Not applicable'],
};

export const QUALIFICATIONS: Record<ProfessionalRole, string[]> = {
  psychiatrist: ['MBBS + MD (Psychiatry)', 'MBBS + DNB (Psychiatry)', 'MBBS + DPM'],
  clinical_psychologist: ['M.Phil Clinical Psychology', 'Professional Diploma in Clinical Psychology (RCI)', 'PhD Clinical Psychology (RCI registered)'],
  counsellor: ['MA/MSc Psychology', 'MA Counselling Psychology', 'Other'],
};

export const SPECIALISATIONS = ['OCD', 'ERP', 'CBT', 'Anxiety disorders', 'Panic disorder', 'Child & adolescent', 'Perinatal', 'Addiction', 'Family therapy'];

export const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Bengali', 'Marathi', 'Telugu', 'Kannada', 'Malayalam', 'Gujarati', 'Punjabi', 'Odia'];

export interface KycApplication {
  name: string;
  role: ProfessionalRole;
  email: string;
  phone: string;
  council: string;
  registrationNumber: string;
  registrationYear: number;
  qualification: string;
  institution: string;
  experienceYears: number;
  specialisations: string[];
  languages: string[];
  city: string;
  modes: ('online' | 'offline')[];
  feeInr: number;
  bio: string;
  consentToVerify: boolean;
}

export interface KycIssue {
  field: keyof KycApplication | 'document';
  message: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^(\+91[-\s]?)?[6-9]\d{9}$/;
const REG_NO = /^[A-Za-z]{0,6}[-/ ]?\d{3,8}([-/ ]?[A-Za-z0-9]{1,6})?$/;
const RCI_NO = /^[A-Za-z]\d{5}$/;

export function validateKyc(a: Partial<KycApplication>, hasDocument: boolean, now = new Date()): KycIssue[] {
  const issues: KycIssue[] = [];
  const need = (field: keyof KycApplication, ok: boolean, message: string) => {
    if (!ok) issues.push({ field, message });
  };
  need('name', !!a.name && a.name.trim().length >= 3, 'Enter your full name as on the register.');
  need('role', !!a.role && a.role in COUNCILS, 'Choose your professional role.');
  need('email', !!a.email && EMAIL.test(a.email), 'Enter a valid email.');
  need('phone', !!a.phone && PHONE.test(a.phone.replace(/\s/g, '')), 'Enter a valid Indian mobile number.');
  if (a.role) {
    need('council', !!a.council && COUNCILS[a.role].includes(a.council), 'Choose the council you are registered with.');
    need('qualification', !!a.qualification && QUALIFICATIONS[a.role].includes(a.qualification), 'Choose a qualification valid for this role.');
    if (a.role === 'clinical_psychologist') {
      need('registrationNumber', !!a.registrationNumber && RCI_NO.test(a.registrationNumber.trim()), 'RCI registration numbers look like A12345.');
    } else if (a.role === 'psychiatrist') {
      need('registrationNumber', !!a.registrationNumber && REG_NO.test(a.registrationNumber.trim()), 'Enter your medical registration number.');
    }
  }
  const year = Number(a.registrationYear);
  need('registrationYear', Number.isInteger(year) && year >= 1960 && year <= now.getFullYear(), 'Enter a valid registration year.');
  need('institution', !!a.institution && a.institution.trim().length >= 3, 'Enter the institution that awarded your qualification.');
  const exp = Number(a.experienceYears);
  need('experienceYears', Number.isFinite(exp) && exp >= 0 && exp <= 60, 'Enter years of experience (0-60).');
  if (Number.isInteger(year) && Number.isFinite(exp)) {
    need('experienceYears', exp <= now.getFullYear() - year + 1, 'Experience cannot be longer than your registration.');
  }
  need('specialisations', !!a.specialisations && a.specialisations.length > 0, 'Choose at least one specialisation.');
  need('languages', !!a.languages && a.languages.length > 0, 'Choose at least one language.');
  need('city', !!a.city && a.city.trim().length >= 2, 'Enter your city.');
  need('modes', !!a.modes && a.modes.length > 0, 'Choose online, offline or both.');
  const fee = Number(a.feeInr);
  need('feeInr', Number.isFinite(fee) && fee >= 0 && fee <= 20000, 'Enter a session fee between ₹0 and ₹20,000.');
  need('consentToVerify', a.consentToVerify === true, 'Consent is required so we can verify your registration.');
  if (!hasDocument) issues.push({ field: 'document', message: 'Upload your registration certificate (PDF, JPG or PNG, up to 5 MB).' });
  return issues;
}

/** Which professionals can be shown to a patient at a given care level. */
export function eligibleForCareLevel(role: ProfessionalRole, careLevel: number): boolean {
  if (careLevel >= 4) return role === 'psychiatrist';
  if (careLevel === 3) return role === 'psychiatrist' || role === 'clinical_psychologist';
  return true;
}
