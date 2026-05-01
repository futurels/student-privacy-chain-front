import { http } from './http'

export const auditLogApi = {
  getPage(params = {}, options = {}) {
    return http.get('/api/audit-logs', params, options)
  },
  getDetail(id, options = {}) {
    return http.get(`/api/audit-logs/${id}`, undefined, options)
  },
}
