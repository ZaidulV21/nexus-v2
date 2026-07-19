import { Prisma } from '@prisma/client';
import {
  isValidTransition,
  isValidAutomaticTransition,
  isSkippingSiteVisit,
  AUTOMATIC_ONLY_LEAD_STATUSES,
  MANUAL_LEAD_STATUSES,
  MANUAL_PROJECT_STATUSES,
} from './statusEngine.rules';
import { statusEngineRepository } from './statusEngine.repository';
import { timelineService } from '../timeline/timeline.service';
import { TransitionInput } from './statusEngine.types';
import { ValidationError } from '../../core/errors/AppError';

// Which statuses an Admin may manually select, per entity type. On Lead
// Services, QUOTE SENT and PROJECT CREATED are exclusively event-driven;
// on Project Services, PROJECT CREATED is the system-assigned start.
const MANUAL_TARGETS: Record<TransitionInput['entityType'], readonly string[]> = {
  LEAD_SERVICE: MANUAL_LEAD_STATUSES,
  PROJECT_SERVICE: MANUAL_PROJECT_STATUSES,
};

// The single entry point every Lead Service / Project Service status change
// must go through. No module writes a status field directly.
export const statusEngineService = {
  async transition(input: TransitionInput, tx?: Prisma.TransactionClient) {
    if (input.isAutomatic) {
      // Workflow-event transitions (quotation created/sent, rejected,
      // revision requested, accepted, project created) follow their own
      // rule set: forward jumps over manual stages are fine, and
      // NEGOTIATION -> QUOTE SENT re-send is the one legal backward move.
      if (input.entityType !== 'LEAD_SERVICE' || !isValidAutomaticTransition(input.fromStatus, input.toStatus)) {
        throw new ValidationError(
          `Illegal automatic status transition: ${input.fromStatus ?? '(none)'} -> ${input.toStatus}`
        );
      }
    } else {
      // Manual (Admin-initiated) transitions may only target the manually
      // selectable statuses for the entity type - QUOTE SENT and PROJECT
      // CREATED are exclusively backend-controlled, and the Lead/Project
      // pipelines never leak into each other.
      if (!MANUAL_TARGETS[input.entityType].includes(input.toStatus)) {
        const isAutomaticStatus = (AUTOMATIC_ONLY_LEAD_STATUSES as readonly string[]).includes(input.toStatus);
        throw new ValidationError(
          isAutomaticStatus
            ? `Status "${input.toStatus}" is set automatically by the quotation/project workflow and cannot be selected manually`
            : `Status "${input.toStatus}" cannot be set manually on a ${input.entityType === 'LEAD_SERVICE' ? 'Lead' : 'Project'} Service`
        );
      }

      if (!isValidTransition(input.entityType, input.fromStatus, input.toStatus)) {
        throw new ValidationError(
          `Illegal status transition: ${input.fromStatus ?? '(none)'} -> ${input.toStatus}`
        );
      }

      if (
        input.entityType === 'LEAD_SERVICE' &&
        isSkippingSiteVisit(input.fromStatus, input.toStatus) &&
        !input.reason
      ) {
        throw new ValidationError(
          'Skipping a Site Visit stage requires a reason to be recorded.'
        );
      }
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
      description: `Status ${input.isAutomatic ? 'automatically ' : ''}changed from ${input.fromStatus ?? '(none)'} to ${input.toStatus}${
        input.reason ? ` (reason: ${input.reason})` : ''
      }`,
      actorUserId: input.actorUserId,
      metadata: { fromStatus: input.fromStatus, toStatus: input.toStatus, isAutomatic: !!input.isAutomatic },
    });

    return { entityType: input.entityType, entityId: input.entityId, status: input.toStatus };
  },
};
