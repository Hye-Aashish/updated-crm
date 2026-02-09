import api from './api-client';

export interface TimeEntry {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    projectId: {
        _id: string;
        name: string;
        status: string;
    };
    taskId?: {
        _id: string;
        title: string;
        status: string;
    };
    startTime: Date;
    endTime?: Date;
    duration: number; // in minutes
    note: string;
    isRunning: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface TimeEntryStats {
    totalHours: number;
    todayHours: number;
    activeTimers: number;
    totalEntries: number;
}

export const timeEntryService = {
    // Get all time entries with optional filters
    async getAll(filters?: {
        userId?: string;
        projectId?: string;
        taskId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<TimeEntry[]> {
        const response = await api.get('/time-entries', { params: filters });
        return response.data;
    },

    // Get a single time entry by ID
    async getById(id: string): Promise<TimeEntry> {
        const response = await api.get(`/time-entries/${id}`);
        return response.data;
    },

    // Create a new time entry (start timer)
    async create(data: {
        userId: string;
        projectId: string;
        taskId?: string;
        note?: string;
        startTime?: Date;
        isRunning?: boolean;
    }): Promise<TimeEntry> {
        const response = await api.post('/time-entries', data);
        return response.data;
    },

    // Update a time entry (stop timer, update note, etc.)
    async update(id: string, data: {
        endTime?: Date;
        duration?: number;
        note?: string;
        isRunning?: boolean;
    }): Promise<TimeEntry> {
        const response = await api.put(`/time-entries/${id}`, data);
        return response.data;
    },

    // Delete a time entry
    async delete(id: string): Promise<void> {
        await api.delete(`/time-entries/${id}`);
    },

    // Get running timer for a user
    async getRunningTimer(userId: string): Promise<TimeEntry | null> {
        const response = await api.get(`/time-entries/user/${userId}/running`);
        return response.data;
    },

    // Get time statistics
    async getStats(filters?: {
        userId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<TimeEntryStats> {
        const response = await api.get('/time-entries/stats/summary', { params: filters });
        return response.data;
    },

    // Start a timer
    async startTimer(userId: string, projectId: string, taskId?: string, note?: string): Promise<TimeEntry> {
        return this.create({
            userId,
            projectId,
            taskId,
            note,
            startTime: new Date(),
            isRunning: true
        });
    },

    // Stop a timer
    async stopTimer(id: string, note?: string): Promise<TimeEntry> {
        return this.update(id, {
            endTime: new Date(),
            isRunning: false,
            note
        });
    }
};
