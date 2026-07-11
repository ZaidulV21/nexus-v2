import { Prisma } from '@prisma/client';
import { isValidTransition, isSkippingSiteVisit } from './statusEngine.rules';
import { statusEngineRepository } from './statusEngine.repository';
import { timelineService } from '../timeline/timeline.service';
import { TransitionInput } from './statusEngine.types';
import { ValidationError } from '../../core/errors/AppError';

// The single entry point every Lead Service / Project Service status change
// must go through. No module writes a status field directly.
export const statusEngineService = {
  async transition(input: TransitionInput, tx?: Prisma.TransactionClient) {
    if (!isValidTransition(input.fromStatus, input.toStatus)) {
      throw new ValidationError(
        `Illegal status transition: ${input.fromStatus ?? '(none)'} -> ${input.toStatus}`
      );
    }

    if (isSkippingSiteVisit(input.fromStatus, input.toStatus) && !input.reason) {
      throw new ValidationError(
        'Skipping the Site Visit stage requires a reason to be recorded.'
      );
    }

    if (input.entityType === 'LEAD_SERVICE') {
      await statusEngineRepository.updateLeadServiceStatus(input.entityId, input.toStatus, tx);
    } else {
      await statusEngineRepository.updateProjectServiceStatus(input.entityId, input.toStatus, tx);
    }

    await statusEngineRepository.logTransition(
      {
        entityType: input.entityType,
        entityId: input.entityId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorUserId: input.actorUserId,
        reason: input.reason,
      },
      tx
    );

    await timelineService.recordEvent({
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: 'STATUS_CHANGED',
      description: `Status changed from ${input.fromStatus ?? '(none)'} to ${input.toStatus}${
        input.reason ? ` (reason: ${input.reason})` : ''
      }`,
      actorUserId: input.actorUserId,
      metadata: { fromStatus: input.fromStatus, toStatus: input.toStatus },
    });

    return { entityType: input.entityType, entityId: input.entityId, status: input.toStatus };
  },
};
