import { http } from './http'

export const usersApi = {
  getPage(params) {
    return http.get('/api/users', params)
  },
  getDetail(id) {
    return http.get(`/api/users/${id}`)
  },
  create(payload) {
    return http.post('/api/users', payload)
  },
  update(id, payload) {
    return http.put(`/api/users/${id}`, payload)
  },
  updateStatus(id, payload) {
    return http.patch(`/api/users/${id}/status`, payload)
  },
  getRoles() {
    return http.get('/api/roles')
  },
  assignRoles(id, payload) {
    return http.put(`/api/users/${id}/roles`, payload)
  },
  getPermissionsTree() {
    return http.get('/api/permissions/tree')
  },
  getDepartments() {
    return http.get('/api/departments')
  },
}
