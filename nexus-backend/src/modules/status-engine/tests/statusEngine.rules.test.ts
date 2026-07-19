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
    expect(isValidTransition('PROJECT_SERVICE', null, 'PLANNING')).toBe(false);
  });

  it('allows sequential forward transitions through the full execution pipeline', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'PLANNING')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'PLANNING', 'RESOURCES ASSIGNED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'RESOURCES ASSIGNED', 'WORK STARTED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'WORK STARTED', 'IN PROGRESS')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'QUALITY INSPECTION')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'QUALITY INSPECTION', 'COMPLETED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'HANDOVER')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'HANDOVER', 'CLOSED')).toBe(true);
  });

  it('allows forward checkpoint skips (not every service needs every stage)', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'WORK STARTED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'COMPLETED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'CLOSED')).toBe(true);
  });

  it('rejects backward execution moves', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'PLANNING')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'IN PROGRESS')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'CLOSED', 'HANDOVER')).toBe(false);
  });

  it('allows ON HOLD from any active stage and resume to any active stage', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PLANNING', 'ON HOLD')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'ON HOLD')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'ON HOLD', 'IN PROGRESS')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'ON HOLD', 'PLANNING')).toBe(true);
    // But not from a done state.
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'ON HOLD')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'CLOSED', 'ON HOLD')).toBe(false);
  });

  it('allows CANCELLED from any pre-completion execution status, never after', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'CANCELLED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'PLANNING', 'CANCELLED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'CANCELLED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'ON HOLD', 'CANCELLED')).toBe(true);
    expect(isValidTransition('PROJECT_SERVICE', 'COMPLETED', 'CANCELLED')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'CLOSED', 'CANCELLED')).toBe(false);
  });

  it('rejects Project Services from entering Lead sales statuses', () => {
    expect(isValidTransition('PROJECT_SERVICE', 'PROJECT CREATED', 'QUOTE PREPARING')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'IN PROGRESS', 'CONTACTED')).toBe(false);
    expect(isValidTransition('PROJECT_SERVICE', 'PLANNING', 'NEGOTIATION')).toBe(false);
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
      'PLANNING',
      'RESOURCES ASSIGNED',
      'WORK STARTED',
      'IN PROGRESS',
      'ON HOLD',
      'QUALITY INSPECTION',
      'COMPLETED',
      'HANDOVER',
      'CLOSED',
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
