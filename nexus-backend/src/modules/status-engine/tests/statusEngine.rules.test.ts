import { isValidTransition, isSkippingSiteVisit } from '../statusEngine.rules';

describe('statusEngine.rules', () => {
  it('allows NEW as the only valid starting status', () => {
    expect(isValidTransition(null, 'NEW')).toBe(true);
    expect(isValidTransition(null, 'CONTACTED')).toBe(false);
  });

  it('allows sequential forward transitions', () => {
    expect(isValidTransition('NEW', 'QUALIFIED')).toBe(true);
    expect(isValidTransition('QUALIFIED', 'CONTACTED')).toBe(true);
  });

  it('rejects illegal jumps such as NEW -> COMPLETED', () => {
    expect(isValidTransition('NEW', 'COMPLETED')).toBe(false);
  });

  it('rejects backward transitions', () => {
    expect(isValidTransition('QUOTE SENT', 'CONTACTED')).toBe(false);
  });

  it('allows skipping the optional SITE VISIT stage', () => {
    expect(isValidTransition('CONTACTED', 'QUOTE PREPARING')).toBe(true);
  });

  it('detects when a transition skips Site Visit', () => {
    expect(isSkippingSiteVisit('CONTACTED', 'QUOTE PREPARING')).toBe(true);
    expect(isSkippingSiteVisit('CONTACTED', 'SITE VISIT')).toBe(false);
  });

  it('allows ON HOLD <-> IN PROGRESS as the one non-linear edge', () => {
    expect(isValidTransition('IN PROGRESS', 'ON HOLD')).toBe(true);
    expect(isValidTransition('ON HOLD', 'IN PROGRESS')).toBe(true);
  });

  it('allows IN PROGRESS -> COMPLETED directly', () => {
    expect(isValidTransition('IN PROGRESS', 'COMPLETED')).toBe(true);
  });
});
