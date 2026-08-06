import { portfolioRepository } from './portfolio.repository';
import { serviceRepository } from '../catalog/service.repository';

export interface PortfolioQuery {
  limit?: number;
  // Resolves a service by UUID or public slug and returns only completed
  // projects that include that service (the "Related Service" section on the
  // public service detail page, e.g. Interior Design -> its completed projects).
  serviceSlug?: string;
}

function toPublicProject(project: any) {
  const clientName = project.client?.companyName || project.client?.contactName || 'Nexus Client';
  const services = (project.projectServices ?? [])
    .map((ps: any) => ps.service)
    .filter(Boolean)
    .map((service: any) => ({ id: service.id, name: service.name, slug: service.slug }));

  return {
    id: project.id,
    projectNumber: project.projectNumber,
    title: project.title?.trim() || clientName,
    clientName,
    completedAt: project.completedAt,
    services,
    media: project.media ?? [],
  };
}

export const portfolioService = {
  async list(query: PortfolioQuery) {
    let serviceId: string | undefined;
    if (query.serviceSlug) {
      const service =
        (await serviceRepository.findBySlug(query.serviceSlug)) ??
        (await serviceRepository.findById(query.serviceSlug));
      if (!service) return [];
      serviceId = service.id;
    }

    const take = Math.min(Math.max(query.limit ?? 100, 1), 100);
    const projects = await portfolioRepository.listCompleted({ take, serviceId });
    return projects.map(toPublicProject);
  },

  async summary() {
    return { completedProjects: await portfolioRepository.countCompleted() };
  },
};
