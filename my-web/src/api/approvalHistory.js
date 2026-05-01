import { http } from './http'

export const approvalHistoryApi = {
  getPage(params = {}, options = {}) {
    return http.get('/api/approvals', params, options)
  },
  getDetail(id, options = {}) {
    return http.get(`/api/approvals/${id}`, undefined, options)
  },
}
