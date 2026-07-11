import { computeAggregateStatus } from '../project.aggregateStatus';

describe('computeAggregateStatus', () => {
  it('reproduces the exact PRD 4.4 example: mixed statuses -> Active N Running', () => {
    const result = computeAggregateStatus([
      { status: 'IN PROGRESS' }, // Interior
      { status: 'QUOTE SENT' },  // Solar
      { status: 'NEW' },         // CCTV
    ]);
    expect(result).toBe('Active (3 Services Running)');
  });

  it('returns Completed only when every service is completed/closed/archived', () => {
    expect(computeAggregateStatus([{ status: 'COMPLETED' }, { status: 'CLOSED' }])).toBe('Completed');
  });

  it('does not report Completed if even one service is still active', () => {
    const result = computeAggregateStatus([{ status: 'COMPLETED' }, { status: 'IN PROGRESS' }]);
    expect(result).not.toBe('Completed');
  });

  it('flags On Hold when any service is on hold, without hiding still-active count', () => {
    const result = computeAggregateStatus([{ status: 'ON HOLD' }, { status: 'IN PROGRESS' }]);
    expect(result).toContain('On Hold');
  });

  it('handles a project with zero services gracefully', () => {
    expect(computeAggregateStatus([])).toBe('NO SERVICES');
  });
});
