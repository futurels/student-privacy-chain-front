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
  approveApplication(id, payload = {}, options = {}) {
    return http.post(`/api/authorizations/applications/${id}/approve`, payload, options)
  },
  rejectApplication(id, payload = {}, options = {}) {
    return http.post(`/api/authorizations/applications/${id}/reject`, payload, options)
  },
  getActivePage(params = {}, options = {}) {
    return http.get('/api/authorizations/active', params, options)
  },
  accessAuthorizedData(id, options = {}) {
    return http.get(`/api/authorizations/${id}/access`, undefined, options)
  },
}
