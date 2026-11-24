import { describe, expect, it } from 'vitest';
import { bandFor, isTreatmentResponse, routeCare, scoreOcir, scoreYbocs } from '../shared/clinical/instruments';
import { eligibleForCareLevel, validateKyc } from '../shared/clinical/kyc';

describe('OCI-R', () => {
  it('scores totals, subscales and the 21 cut-off', () => {
    const r = scoreOcir(Array(18).fill(1));
    expect(r.total).toBe(18);
    expect(r.likelyOcd).toBe(false);
    expect(Object.values(r.subscales).every((v) => v === 3)).toBe(true);
    const washing = scoreOcir([0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 4, 0].map((v) => v || 1));
    expect(washing.total).toBeGreaterThanOrEqual(21);
    expect(washing.likelyOcd).toBe(true);
    expect(washing.dominant).toEqual(['washing']);
  });
  it('rejects invalid answers', () => {
    expect(() => scoreOcir([1, 2])).toThrow();
    expect(() => scoreOcir(Array(18).fill(5))).toThrow();
  });
});

describe('Y-BOCS', () => {
  it('uses the standard severity bands', () => {
    expect([0, 7, 8, 15, 16, 23, 24, 31, 32, 40].map(bandFor)).toEqual(['subclinical', 'subclinical', 'mild', 'mild', 'moderate', 'moderate', 'severe', 'severe', 'extreme', 'extreme']);
  });
  it('splits obsessions and compulsions', () => {
    const r = scoreYbocs([4, 4, 4, 4, 4, 0, 0, 0, 0, 0]);
    expect(r).toMatchObject({ total: 20, obsessions: 20, compulsions: 0, band: 'moderate' });
  });
  it('defines treatment response as a 35% reduction', () => {
    expect(isTreatmentResponse(24, 15)).toBe(true);
    expect(isTreatmentResponse(24, 16)).toBe(false);
  });
});

describe('stepped-care routing', () => {
  const y = (total: number) => scoreYbocs([...Array(10)].map((_, i) => (i < total % 10 ? Math.floor(total / 10) + 1 : Math.floor(total / 10))));
  it('routes by severity', () => {
    expect(routeCare(null, y(10)).level).toBe(2);
    expect(routeCare(null, y(20)).level).toBe(3);
    expect(routeCare(null, y(28)).referToProfessional).toBe(true);
    expect(routeCare(null, y(28)).selfGuidedErp).toBe(false);
  });
  it('shows only psychiatrists at level 4', () => {
    expect(eligibleForCareLevel('psychiatrist', 4)).toBe(true);
    expect(eligibleForCareLevel('clinical_psychologist', 4)).toBe(false);
    expect(eligibleForCareLevel('counsellor', 3)).toBe(false);
  });
});

describe('professional KYC', () => {
  const good = {
    name: 'Dr. Test', role: 'psychiatrist' as const, email: 'a@b.com', phone: '9876543210', council: 'Delhi Medical Council',
    registrationNumber: 'DMC-12345', registrationYear: 2015, qualification: 'MBBS + MD (Psychiatry)', institution: 'AIIMS',
    experienceYears: 8, specialisations: ['OCD'], languages: ['Hindi'], city: 'Delhi', modes: ['online' as const], feeInr: 800, bio: '', consentToVerify: true,
  };
  it('accepts a complete application with a document', () => expect(validateKyc(good, true)).toEqual([]));
  it('requires the certificate and consent', () => {
    expect(validateKyc({ ...good, consentToVerify: false }, false).map((i) => i.field)).toEqual(expect.arrayContaining(['document', 'consentToVerify']));
  });
  it('checks RCI number format for psychologists', () => {
    const app = { ...good, role: 'clinical_psychologist' as const, council: 'Rehabilitation Council of India (RCI)', qualification: 'M.Phil Clinical Psychology', registrationNumber: '12345' };
    expect(validateKyc(app, true).some((i) => i.field === 'registrationNumber')).toBe(true);
    expect(validateKyc({ ...app, registrationNumber: 'A12345' }, true)).toEqual([]);
  });
  it('rejects experience longer than registration', () => {
    expect(validateKyc({ ...good, registrationYear: 2024, experienceYears: 20 }, true).some((i) => i.field === 'experienceYears')).toBe(true);
  });
});

import { adjustForMood, scoreMood } from '../shared/clinical/instruments';

describe('mood check (PHQ-2 + item 9)', () => {
  const mild = routeCare(null, scoreYbocs([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
  it('raises care for low mood', () => {
    const r = adjustForMood(mild, scoreMood([2, 1, 0]));
    expect(r.level).toBe(3);
    expect(r.referToProfessional).toBe(true);
  });
  it('any self-harm answer means urgent professional support', () => {
    const r = adjustForMood(mild, scoreMood([0, 0, 1]));
    expect(r.level).toBe(4);
    expect(r.recommendation).toMatch(/14416/);
  });
  it('leaves routing alone when mood is fine', () => {
    expect(adjustForMood(mild, scoreMood([0, 1, 0]))).toEqual(mild);
  });
});
