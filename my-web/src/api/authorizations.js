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
  revokeAuthorization(id, payload = {}, options = {}) {
    return http.post(`/api/authorizations/${id}/revoke`, payload, options)
  },
  accessAuthorizedData(id, options = {}) {
    return http.get(`/api/authorizations/${id}/access`, undefined, options)
  },
  getHistoryPage(params = {}, options = {}) {
    return http.get('/api/authorizations/history', params, options)
  },
  triggerExpireCheck(options = {}) {
    return http.post('/api/authorizations/expire/check', {}, options)
  },
}
