jest.mock('../statusEngine.repository', () => ({
  statusEngineRepository: {
    updateLeadServiceStatus: jest.fn(),
    updateProjectServiceStatus: jest.fn(),
    logTransition: jest.fn(),
  },
}));
jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn() },
}));

import { statusEngineRepository } from '../statusEngine.repository';
import { timelineService } from '../../timeline/timeline.service';
import { statusEngineService } from '../statusEngine.service';

beforeEach(() => jest.clearAllMocks());

describe('statusEngineService.transition - manual guard', () => {
  it('rejects manually selecting an automatic-only lead status', async () => {
    for (const toStatus of ['QUOTE SENT', 'PROJECT CREATED']) {
      await expect(
        statusEngineService.transition({
          entityType: 'LEAD_SERVICE',
          entityId: 'ls1',
          fromStatus: 'QUOTE PREPARING',
          toStatus,
          actorUserId: 'admin1',
        })
      ).rejects.toThrow('set automatically by the quotation/project workflow');
    }
    expect(statusEngineRepository.updateLeadServiceStatus).not.toHaveBeenCalled();
  });

  it('allows manually recording NEGOTIATION and APPROVED (deal progressed off-portal)', async () => {
    await statusEngineService.transition({
      entityType: 'LEAD_SERVICE',
      entityId: 'ls1',
      fromStatus: 'QUOTE PREPARING',
      toStatus: 'NEGOTIATION',
      actorUserId: 'admin1',
    });
    expect(statusEngineRepository.updateLeadServiceStatus).toHaveBeenCalledWith('ls1', 'NEGOTIATION', undefined);

    await statusEngineService.transition({
      entityType: 'LEAD_SERVICE',
      entityId: 'ls1',
      fromStatus: 'NEGOTIATION',
      toStatus: 'APPROVED',
      actorUserId: 'admin1',
    });
    expect(statusEngineRepository.updateLeadServiceStatus).toHaveBeenCalledWith('ls1', 'APPROVED', undefined);
  });

  it('rejects manually moving a Lead Service into project execution statuses', async () => {
    await expect(
      statusEngineService.transition({
        entityType: 'LEAD_SERVICE',
        entityId: 'ls1',
        fromStatus: 'PROJECT CREATED',
        toStatus: 'IN PROGRESS',
        actorUserId: 'admin1',
      })
    ).rejects.toThrow('cannot be set manually on a Lead Service');
  });

  it('allows a manual sales-pipeline move and records it', async () => {
    await statusEngineService.transition({
      entityType: 'LEAD_SERVICE',
      entityId: 'ls1',
      fromStatus: 'NEW',
      toStatus: 'CONTACTED',
      actorUserId: 'admin1',
    });
    expect(statusEngineRepository.updateLeadServiceStatus).toHaveBeenCalledWith('ls1', 'CONTACTED', undefined);
    expect(statusEngineRepository.logTransition).toHaveBeenCalled();
    expect(timelineService.recordEvent).toHaveBeenCalled();
  });

  it('rejects a manual PROJECT CREATED target on a Project Service (system-assigned start state)', async () => {
    await expect(
      statusEngineService.transition({
        entityType: 'PROJECT_SERVICE',
        entityId: 'ps1',
        fromStatus: 'IN PROGRESS',
        toStatus: 'PROJECT CREATED',
        actorUserId: 'admin1',
      })
    ).rejects.toThrow('set automatically');
  });

  it('allows manual project execution moves including CANCELLED', async () => {
    await statusEngineService.transition({
      entityType: 'PROJECT_SERVICE',
      entityId: 'ps1',
      fromStatus: 'IN PROGRESS',
      toStatus: 'CANCELLED',
      actorUserId: 'admin1',
    });
    expect(statusEngineRepository.updateProjectServiceStatus).toHaveBeenCalledWith('ps1', 'CANCELLED', undefined);
  });
});

describe('statusEngineService.transition - automatic transitions', () => {
  it('performs a QUOTE SENT automation and marks the Timeline entry as automatic', async () => {
    await statusEngineService.transition({
      entityType: 'LEAD_SERVICE',
      entityId: 'ls1',
      fromStatus: 'QUOTE PREPARING',
      toStatus: 'QUOTE SENT',
      actorUserId: 'admin1',
      isAutomatic: true,
    });
    expect(statusEngineRepository.updateLeadServiceStatus).toHaveBeenCalledWith('ls1', 'QUOTE SENT', undefined);
    const timelineCall = (timelineService.recordEvent as jest.Mock).mock.calls[0][0];
    expect(timelineCall.description).toContain('automatically');
    expect(timelineCall.metadata.isAutomatic).toBe(true);
  });

  it('allows the NEGOTIATION -> QUOTE SENT resend automation', async () => {
    await statusEngineService.transition({
      entityType: 'LEAD_SERVICE',
      entityId: 'ls1',
      fromStatus: 'NEGOTIATION',
      toStatus: 'QUOTE SENT',
      isAutomatic: true,
    });
    expect(statusEngineRepository.updateLeadServiceStatus).toHaveBeenCalledWith('ls1', 'QUOTE SENT', undefined);
  });

  it('rejects an automatic move that goes backward past NEGOTIATION -> QUOTE SENT', async () => {
    await expect(
      statusEngineService.transition({
        entityType: 'LEAD_SERVICE',
        entityId: 'ls1',
        fromStatus: 'PROJECT CREATED',
        toStatus: 'QUOTE SENT',
        isAutomatic: true,
      })
    ).rejects.toThrow('Illegal automatic status transition');
  });
});
