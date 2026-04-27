import { http } from './http'

export const privacyApi = {
  getPrivacyDataPage(params = {}, options = {}) {
    return http.get('/api/privacy-data', params, options)
  },
  getShareablePrivacyDataPage(params = {}, options = {}) {
    return http.get('/api/privacy-data/shareable', params, options)
  },
  getPrivacyDataDetail(id, options = {}) {
    return http.get(`/api/privacy-data/${id}`, undefined, options)
  },
  createPrivacyData(payload, options = {}) {
    return http.post('/api/privacy-data', payload, options)
  },
  updatePrivacyData(id, payload, options = {}) {
    return http.put(`/api/privacy-data/${id}`, payload, options)
  },
}
