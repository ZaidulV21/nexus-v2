import { computeAggregateStatus } from '../project.aggregateStatus';

describe('computeAggregateStatus', () => {
  it('reproduces the PRD 4.4 example: mixed execution statuses -> Active N Running', () => {
    const result = computeAggregateStatus([
      { status: 'IN PROGRESS' },       // Interior
      { status: 'PLANNING' },          // Solar
      { status: 'PROJECT CREATED' },   // CCTV
    ]);
    expect(result).toBe('Active (3 Services Running)');
  });

  it('returns Completed only when every active service is done (COMPLETED/HANDOVER/CLOSED)', () => {
    expect(computeAggregateStatus([{ status: 'COMPLETED' }, { status: 'COMPLETED' }])).toBe('Completed');
    expect(computeAggregateStatus([{ status: 'HANDOVER' }, { status: 'CLOSED' }])).toBe('Completed');
  });

  it('does not report Completed if even one service is still active', () => {
    const result = computeAggregateStatus([{ status: 'COMPLETED' }, { status: 'IN PROGRESS' }]);
    expect(result).not.toBe('Completed');
  });

  it('flags On Hold when any service is on hold, without hiding still-active count', () => {
    const result = computeAggregateStatus([{ status: 'ON HOLD' }, { status: 'IN PROGRESS' }]);
    expect(result).toContain('On Hold');
  });

  it('ignores cancelled services when aggregating', () => {
    expect(computeAggregateStatus([{ status: 'CANCELLED' }, { status: 'COMPLETED' }])).toBe('Completed');
    expect(computeAggregateStatus([{ status: 'CANCELLED' }, { status: 'CANCELLED' }])).toBe('Cancelled');
  });

  it('handles a project with zero services gracefully', () => {
    expect(computeAggregateStatus([])).toBe('NO SERVICES');
  });
});
