import { http } from './http'

export const approvalsApi = {
  getPage(params) {
    return http.get('/api/approvals', params)
  },
  getDetail(id) {
    return http.get(`/api/approvals/${id}`)
  },
}
