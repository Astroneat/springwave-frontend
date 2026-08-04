import { get, post, put, del } from './client.js';

export const generateRoadmap = (input) => post('/roadmap/generate', input);
export const getMyRoadmaps = () => get('/roadmap/my');
export const getRoadmapById = (id) => get(`/roadmap/${id}`);
export const swapTimelineEvent = (id, timelineIndex, newEventId) => put(`/roadmap/${id}/swap`, { timelineIndex, newEventId });
export const confirmRoadmap = (id) => put(`/roadmap/${id}/confirm`, {});
export const deleteRoadmap = (id) => del(`/roadmap/${id}`);
