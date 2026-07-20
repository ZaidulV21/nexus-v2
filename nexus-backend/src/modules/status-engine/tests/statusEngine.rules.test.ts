import {
  isValidTransition,
  isValidAutomaticTransition,
  isSkippingSiteVisit,
  MANUAL_LEAD_STATUSES,
  AUTOMATIC_ONLY_LEAD_STATUSES,
  AUTOMATIC_LEAD_STATUSES,
  MANUAL_PROJECT_STATUSES,
} from '../statusEngine.rules';

describe('statusEngine.rules - Lead workflow', () => {
  it('allows NEW as the only valid starting status for Lead Services', () => {
    expect(isValidTransition('LEAD_SERVICE', null, 'NEW')).toBe(true);
    expect(isValidTransition('LEAD_SERVICE', null, 'CONTACTED')).toBe(false);
  });

  it('allows sequential forward transitions within the Lead pipeline', () => {
    expect(isValidTransition('LEAD_SERVICE', 'NEW', 'CONTACTED')).toBe(true);
    expect(isValidTransition('LEAD_SERVICE', 'CONTACTED', 'SITE VISIT SCHEDULED')).toBe(true);
    expect(isValidTransition('LEAD_SERVICE', 'SITE VISIT SCHEDULED', 'SITE VISIT COMPLETED')).toBe(true);
    expect(isValidTransition('LEAD_SERVICE', 'SITE VISIT COMPLETED', 'QUOTE PREPARING')).toBe(true);
  });

  it('allows a manual NEGOTIATION / APPROVED move (deal progressed outside the portal)', () => {
    // QUOTE SENT is skippable in a manual forward move - the admin may have
    // negotiated by phone before any quotation was recorded as sent.
    expect(isValidTransition('LEAD_SERVICE', 'QUOTE PREPARING', 'NEGOTIATION')).toBe(true);
    expect(isValidTransition('LEAD_SERVICE', 'NEGOTIATION', 'APPROVED')).toBe(true);
  });

  it('rejects illegal jumps in the Lead pipeline', () => {
    expect(isValidTransition('LEAD_SERVICE', 'NEW', 'QUOTE SENT')).toBe(false);
    expect(isValidTransition('LEAD_SERVICE', 'CONTACTED', 'NEGOTIATION')).toBe(false);
  });

  it('rejects backward transitions in the Lead pipeline', () => {
    expect(isValidTransition('LEAD_SERVICE', 'QUOTE SENT', 'CONTACTED')).toBe(false);
    expect(isValidTransition('LEAD_SERVICE', 'APPROVED', 'QUOTE PREPARING')).toBe(false);
  });

  it('allows skipping the optional site-visit stages', () => {
    expect(isValidTransition('LEAD_SERVICE', 'CONTACTED', 'QUOTE PREPARING')).toBe(true);
  });

  it('detects when a transition skips a site-visit stage', () => {
    expect(isSkippingSiteVisit('CONTACTED', 'QUOTE PREPARING')).toBe(true);
    expect(isSkippingSiteVisit('SITE VISIT SCHEDULED', 'QUOTE PREPARING')).toBe(true);
    expect(isSkippingSiteVisit('CONTACTED', 'SITE VISIT SCHEDULED')).toBe(false);
    expect(isSkippingSiteVisit('SITE VISIT COMPLETED', 'QUOTE PREPARING')).toBe(false);
  });

  it('rejects Lead Services from entering Project execution statuses', () => {
    expect(isValidTransition('LEAD_SERVICE', 'APPROVED', 'IN PROGRESS')).toBe(false);
    expect(isValidTransition('LEAD_SERVICE', 'PROJECT CREATED', 'IN PROGRESS')).toBe(false);
    expect(isValidTransition('LEAD_SERVICE', 'NEW', 'PLANNING')).toBe(false);
  });
});

describe('statusEngine.rules - Project workflow', () => {
  it('allows PROJECT CREATED as the only valid starting status for Project Services', () => {
    expect(isValidTransition('PROJECT_SERVICE', null, 'PROJECT CREATED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', null, 'IN PROGRESS')).toBe(false);
  });

  it('allows PROJECT CREATED → IN PROGRESS', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'IN PROGRESS')).toBe(true);
  });

  it('allows PROJECT CREATED → CANCELLED', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'CANCELLED')).toBe(true);
  });

  it('allows IN PROGRESS → ON HOLD', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'ON HOLD')).toBe(true);
  });

  it('allows IN PROGRESS → COMPLETED', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'COMPLETED')).toBe(true);
  });

  it('allows IN PROGRESS → CANCELLED', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'CANCELLED')).toBe(true);
  });

  it('allows ON HOLD → IN PROGRESS', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'ON HOLD', 'IN PROGRESS')).toBe(true);
  });

  it('allows ON HOLD → CANCELLED', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'ON HOLD', 'CANCELLED')).toBe(true);
  });

  it('rejects PROJECT CREATED → COMPLETED (must go through IN PROGRESS)', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'COMPLETED')).toBe(false);
  });

  it('rejects PROJECT CREATED → ON HOLD (must go through IN PROGRESS)', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'ON HOLD')).toBe(false);
  });

  it('rejects COMPLETED → any status (terminal)', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'IN PROGRESS')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'ON HOLD')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'CANCELLED')).toBe(false);
  });

  it('rejects CANCELLED → any status (terminal)', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'CANCELLED', 'IN PROGRESS')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'CANCELLED', 'ON HOLD')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'CANCELLED', 'COMPLETED')).toBe(false);
  });

  it('allows ON HOLD → COMPLETED', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'ON HOLD', 'COMPLETED')).toBe(true);
  });

  it('rejects all other invalid transitions', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'PROJECT CREATED')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'PROJECT CREATED')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'CANCELLED', 'PROJECT CREATED')).toBe(false);
  });

  it('rejects Project Services from entering Lead sales statuses', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'QUOTE PREPARING')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'CONTACTED')).toBe(false);
  });

  it('rejects old statuses that are no longer part of the project workflow', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'PLANNING')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'WORK STARTED')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'QUALITY INSPECTION')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'HANDOVER')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'HANDOVER', 'CLOSED')).toBe(false);
  });
});

describe('statusEngine.rules - manual vs automatic partition', () => {
  it('exposes the PRD Lead manual stages, with QUOTE SENT and PROJECT CREATED excluded', () => {
    expect(MANUAL_LEAD_STATUSES).toEqual([
      'NEW',
      'CONTACTED',
      'SITE VISIT SCHEDULED',
      'SITE VISIT COMPLETED',
      'QUOTE PREPARING',
      'NEGOTIATION',
      'APPROVED',
    ]);
    expect(MANUAL_LEAD_STATUSES).not.toContain('QUOTE SENT');
    expect(MANUAL_LEAD_STATUSES).not.toContain('PROJECT CREATED');
    expect(AUTOMATIC_ONLY_LEAD_STATUSES).toEqual(['QUOTE SENT', 'PROJECT CREATED']);
  });

  it('exposes the PRD Project execution stages, PROJECT CREATED excluded (system-assigned)', () => {
    expect(MANUAL_PROJECT_STATUSES).toEqual([
      'IN PROGRESS',
      'ON HOLD',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(MANUAL_PROJECT_STATUSES).not.toContain('PROJECT CREATED');
  });

  it('keeps the two pipelines fully disjoint apart from the PROJECT CREATED hand-off', () => {
    for (const leadStatus of MANUAL_LEAD_STATUSES) {
      expect(MANUAL_PROJECT_STATUSES).not.toContain(leadStatus);
    }
  });
});

describe('statusEngine.rules - automatic transitions', () => {
  it('allows forward jumps into automatic Lead statuses from any earlier stage', () => {
    expect(isValidAutomaticTransition('NEW', 'QUOTE SENT')).toBe(true);
    expect(isValidAutomaticTransition('CONTACTED', 'QUOTE SENT')).toBe(true);
    expect(isValidAutomaticTransition('QUOTE PREPARING', 'QUOTE SENT')).toBe(true);
    expect(isValidAutomaticTransition('QUOTE SENT', 'NEGOTIATION')).toBe(true);
    expect(isValidAutomaticTransition('QUOTE SENT', 'APPROVED')).toBe(true);
    expect(isValidAutomaticTransition('APPROVED', 'PROJECT CREATED')).toBe(true);
  });

  it('allows NEGOTIATION -> QUOTE SENT as the one legal backward move (revise + resend)', () => {
    expect(isValidAutomaticTransition('NEGOTIATION', 'QUOTE SENT')).toBe(true);
  });

  it('rejects automatic moves into manual-only statuses', () => {
    expect(isValidAutomaticTransition('NEW', 'CONTACTED')).toBe(false);
    expect(isValidAutomaticTransition('QUOTE SENT', 'SITE VISIT SCHEDULED')).toBe(false);
  });

  it('rejects other backward automatic moves', () => {
    expect(isValidAutomaticTransition('PROJECT CREATED', 'QUOTE SENT')).toBe(false);
    expect(isValidAutomaticTransition('APPROVED', 'NEGOTIATION')).toBe(false);
  });

  it('AUTOMATIC_LEAD_STATUSES covers every workflow-driven target', () => {
    expect(AUTOMATIC_LEAD_STATUSES).toEqual(['QUOTE SENT', 'NEGOTIATION', 'APPROVED', 'PROJECT CREATED']);
  });
});
