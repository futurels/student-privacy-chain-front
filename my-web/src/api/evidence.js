import { http } from './http'

/**
 * 存证业务接口封装。
 *
 * P07-P09/P14 页面只依赖这些语义化方法，不直接拼接请求细节，
 * 便于后续接口路径或参数变化时集中调整。
 */
export const evidenceApi = {
  submitApplication(payload) {
    return http.post('/api/evidences/applications', payload)
  },
  getApplicationPage(params) {
    return http.get('/api/evidences/applications', params)
  },
  getApplicationDetail(id) {
    return http.get(`/api/evidences/applications/${id}`)
  },
  approveApplication(id, payload) {
    return http.post(`/api/evidences/applications/${id}/approve`, payload)
  },
  rejectApplication(id, payload) {
    return http.post(`/api/evidences/applications/${id}/reject`, payload)
  },
  chainEvidence(id, payload) {
    // id 可能是申请主键或存证主键，具体由后端根据当前业务阶段识别。
    return http.post(`/api/evidences/${id}/chain`, payload)
  },
  getEvidenceDetail(id, options = {}) {
    return http.get(`/api/evidences/${id}`, undefined, options)
  },
  getEvidencePage(params) {
    return http.get('/api/evidences', params)
  },
  verifyEvidence(id) {
    // 一致性校验由后端读取链上摘要并与当前数据摘要比对，前端只展示结果。
    return http.post(`/api/evidences/${id}/verify`, {})
  },
  invalidateEvidence(id, payload) {
    return http.post(`/api/evidences/${id}/invalidate`, payload)
  },
}
