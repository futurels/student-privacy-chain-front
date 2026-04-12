import { http } from './http'

export const privacyApi = {
  getPrivacyPage(params, options = {}) {
    return http.get('/api/privacy-data', params, options)
  },
  getPrivacyDetail(id, options = {}) {
    return http.get(`/api/privacy-data/${id}`, undefined, options)
  },
  createPrivacyData(payload, options = {}) {
    return http.post('/api/privacy-data', payload, options)
  },
  updatePrivacyData(id, payload, options = {}) {
    return http.put(`/api/privacy-data/${id}`, payload, options)
  },
  deletePrivacyData(id, options = {}) {
    return http.delete(`/api/privacy-data/${id}`, options)
  },
  // `studentProfileId` is the primary key of `student_profile`, not `sys_user.id`.
  getStudentArchive(studentProfileId, params, options = {}) {
    return http.get(`/api/students/${studentProfileId}/privacy-data`, params, options)
  },
}
