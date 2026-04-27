import { http } from './http'

export const authorizationsApi = {
  submitApplication(payload, options = {}) {
    return http.post('/api/authorizations/applications', payload, options)
  },
  getApplicationPage(params = {}, options = {}) {
    return http.get('/api/authorizations/applications', params, options)
  },
  getApplicationDetail(id, options = {}) {
    return http.get(`/api/authorizations/applications/${id}`, undefined, options)
  },
}
