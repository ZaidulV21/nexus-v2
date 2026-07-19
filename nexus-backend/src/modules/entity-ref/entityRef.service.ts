import { prisma } from '../../config/database';

// Business-facing reference for an entity that Timeline / Audit rows point
// at. `label` is always the human identifier (business number or name) -
// raw UUIDs must never be the display value outside developer tooling.
export interface EntityRef {
  label: string;
  name?: string | null;
}

type RefKey = `${string}:${string}`;

function key(entityType: string, entityId: string): RefKey {
  return `${entityType}:${entityId}`;
}

// Batch-resolves {entityType, entityId} pairs to business references with
// one query per entity type, so enriching a page of timeline/audit rows is
// a bounded number of queries regardless of page size. Unknown types or
// deleted entities simply resolve to nothing - callers fall back to the row
// description.
export async function resolveEntityRefs(
  rows: Array<{ entityType: string; entityId: string }>
): Promise<Map<RefKey, EntityRef>> {
  const idsByType = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.entityType || !row.entityId) continue;
    let set = idsByType.get(row.entityType);
    if (!set) idsByType.set(row.entityType, (set = new Set()));
    set.add(row.entityId);
  }

  const refs = new Map<RefKey, EntityRef>();
  const queries: Promise<void>[] = [];

  const forType = (type: string) => [...(idsByType.get(type) ?? [])];

  if (idsByType.has('LEAD')) {
    queries.push(
      prisma.lead
        .findMany({ where: { id: { in: forType('LEAD') } }, select: { id: true, leadNumber: true, contactName: true } })
        .then((leads) => {
          for (const lead of leads) refs.set(key('LEAD', lead.id), { label: lead.leadNumber, name: lead.contactName });
        })
    );
  }

  if (idsByType.has('CLIENT')) {
    queries.push(
      prisma.client
        .findMany({
          where: { id: { in: forType('CLIENT') } },
          select: { id: true, clientNumber: true, contactName: true, companyName: true },
        })
        .then((clients) => {
          for (const client of clients)
            refs.set(key('CLIENT', client.id), { label: client.clientNumber, name: client.companyName || client.contactName });
        })
    );
  }

  if (idsByType.has('QUOTATION')) {
    queries.push(
      prisma.quotation
        .findMany({ where: { id: { in: forType('QUOTATION') } }, select: { id: true, quotationNumber: true } })
        .then((quotations) => {
          for (const quotation of quotations) refs.set(key('QUOTATION', quotation.id), { label: quotation.quotationNumber });
        })
    );
  }

  if (idsByType.has('PROJECT')) {
    queries.push(
      prisma.project
        .findMany({ where: { id: { in: forType('PROJECT') } }, select: { id: true, projectNumber: true } })
        .then((projects) => {
          for (const project of projects) refs.set(key('PROJECT', project.id), { label: project.projectNumber });
        })
    );
  }

  if (idsByType.has('INVOICE')) {
    queries.push(
      prisma.invoice
        .findMany({ where: { id: { in: forType('INVOICE') } }, select: { id: true, invoiceNumber: true, label: true } })
        .then((invoices) => {
          for (const invoice of invoices) refs.set(key('INVOICE', invoice.id), { label: invoice.invoiceNumber, name: invoice.label });
        })
    );
  }

  if (idsByType.has('LEAD_SERVICE')) {
    queries.push(
      prisma.leadService
        .findMany({
          where: { id: { in: forType('LEAD_SERVICE') } },
          select: { id: true, lead: { select: { leadNumber: true } }, service: { select: { name: true } } },
        })
        .then((records) => {
          for (const record of records)
            refs.set(key('LEAD_SERVICE', record.id), { label: record.lead.leadNumber, name: record.service.name });
        })
    );
  }

  if (idsByType.has('PROJECT_SERVICE')) {
    queries.push(
      prisma.projectService
        .findMany({
          where: { id: { in: forType('PROJECT_SERVICE') } },
          select: { id: true, project: { select: { projectNumber: true } }, service: { select: { name: true } } },
        })
        .then((records) => {
          for (const record of records)
            refs.set(key('PROJECT_SERVICE', record.id), { label: record.project.projectNumber, name: record.service.name });
        })
    );
  }

  if (idsByType.has('SERVICE')) {
    queries.push(
      prisma.service
        .findMany({ where: { id: { in: forType('SERVICE') } }, select: { id: true, name: true } })
        .then((services) => {
          for (const service of services) refs.set(key('SERVICE', service.id), { label: service.name });
        })
    );
  }

  if (idsByType.has('CONVERSATION')) {
    queries.push(
      prisma.conversation
        .findMany({
          where: { id: { in: forType('CONVERSATION') } },
          select: { id: true, client: { select: { clientNumber: true, contactName: true, companyName: true } } },
        })
        .then((conversations) => {
          for (const conversation of conversations)
            refs.set(key('CONVERSATION', conversation.id), {
              label: conversation.client.clientNumber,
              name: conversation.client.companyName || conversation.client.contactName,
            });
        })
    );
  }

  await Promise.all(queries);
  return refs;
}

// Actors on timeline/audit rows may be Admin users or Client accounts (the
// portal writes client-actor events). Resolve both in one pass; unresolved
// IDs render as "System" client-side.
export async function resolveActorRefs(actorUserIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(actorUserIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const [users, clients] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, email: true } }),
    prisma.client.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, clientNumber: true, contactName: true } }),
  ]);

  const actors = new Map<string, string>();
  for (const user of users) actors.set(user.id, user.email);
  for (const client of clients) actors.set(client.id, `${client.clientNumber} — ${client.contactName}`);
  return actors;
}

// Convenience wrapper: decorate a page of timeline/audit rows with
// `entityRef` and `actorRef` display fields.
export async function enrichWithRefs<T extends { entityType: string; entityId: string; actorUserId?: string | null }>(
  items: T[]
): Promise<Array<T & { entityRef: EntityRef | null; actorRef: string | null }>> {
  const [entityRefs, actorRefs] = await Promise.all([
    resolveEntityRefs(items),
    resolveActorRefs(items.map((item) => item.actorUserId ?? '')),
  ]);

  return items.map((item) => ({
    ...item,
    entityRef: entityRefs.get(key(item.entityType, item.entityId)) ?? null,
    actorRef: item.actorUserId ? actorRefs.get(item.actorUserId) ?? null : null,
  }));
}
