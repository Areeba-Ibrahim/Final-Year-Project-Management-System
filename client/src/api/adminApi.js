import API from './axios'

export const getStudents = () => API.get('/admin/users?role=Student')

export const getTeachers = () => API.get('/admin/users?role=Teacher')

export const deleteTeacher = (id) => API.delete(`/admin/users/${id}`)

export const updateTeacher = (id, data) => API.put(`/admin/users/${id}`, data)

export const assignSupervisor = (projectId, teacherId) =>
  API.put('/requests/admin-assign', { projectId, teacherId })