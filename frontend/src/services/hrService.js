import api from './api';

// Get all faculty
export const getFaculty = async () => {
  return await api.get('/api/hr/faculty');
};

// Get all departments
export const getDepartments = async () => {
  return await api.get('/api/departments');
};

// Assign HOD to department
export const assignHod = async (facultyId, departmentId) => {
  return await api.post('/api/hr/assign-hod', { facultyId, departmentId });
};

// Remove HOD assignment
export const removeHod = async (facultyId) => {
  return await api.delete(`/api/hr/remove-hod/${facultyId}`);
};
