import api from '../api-client';
import { Project } from '@/types';
import { mapProject } from '../mappers';

export const ProjectService = {
    async getAll(): Promise<Project[]> {
        const response = await api.get('/projects');
        return response.data.map(mapProject);
    },

    async getById(id: string): Promise<Project> {
        const response = await api.get(`/projects/${id}`);
        return mapProject(response.data);
    },

    async create(project: Partial<Project>): Promise<Project> {
        const response = await api.post('/projects', project);
        return mapProject(response.data);
    },

    async update(id: string, project: Partial<Project>): Promise<Project> {
        const response = await api.put(`/projects/${id}`, project);
        return mapProject(response.data);
    },

    async updateDeliverables(id: string, deliverables: Partial<Project>): Promise<Project> {
        const response = await api.put(`/projects/${id}/deliverables`, deliverables);
        return mapProject(response.data);
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/projects/${id}`);
    }
};
