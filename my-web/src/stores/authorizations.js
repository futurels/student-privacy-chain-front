import { reactive, ref } from 'vue'
import { authorizationsApi } from '../api/authorizations'
import { authStore } from './auth'
import { messageStore } from './message'

const createPageState = () => ({
  records: [],
  total: 0,
  pageNum: 1,
  pageSize: 10,
})

const state = reactive({
  pageData: createPageState(),
  activePageData: createPageState(),
  current: null,
  currentAccessData: null,
})

const loading = ref(false)

const normalizeAuthorizationRecord = (record = {}) => ({
  ...record,
  applicationId: record.applicationId || record.id || record.application_id || '',
  authorizationId: record.authorizationId || record.authorization_id || record.authId || record.auth_id || '',
  applicationNo: record.applicationNo || record.application_no || '',
  privacyDataId: record.privacyDataId || record.privacy_data_id || '',
  studentId: record.studentId || record.student_id || '',
  studentName: record.studentName || record.student_name || '',
  targetType: record.targetType || record.target_type || '',
  targetId: record.targetId || record.target_id || '',
  purpose: record.purpose || '',
  expireAt: record.expireAt || record.expire_at || '',
  status: record.status || '',
  submittedAt: record.submittedAt || record.submitted_at || record.createdAt || record.created_at || '',
  reviewComment: record.reviewComment || record.review_comment || '',
  reviewedAt: record.reviewedAt || record.reviewed_at || '',
  reviewerId: record.reviewerId || record.reviewer_id || '',
  reviewerName: record.reviewerName || record.reviewer_name || '',
  privacyTitle: record.privacyTitle || record.privacyDataTitle || record.title || '',
  dataType: record.dataType || record.dataTypeCode || '',
  dataTypeName: record.dataTypeName || '',
  securityLevel: record.securityLevel || '',
  evidenceNo: record.evidenceNo || '',
  txId: record.txId || '',
})

const normalizePageResult = (result = {}, fallback = {}) => ({
  records: (result.records || []).map(normalizeAuthorizationRecord),
  total: result.total || 0,
  pageNum: result.pageNum || fallback.pageNum || 1,
  pageSize: result.pageSize || fallback.pageSize || 10,
})

const normalizeApplicationFilters = (filters = {}) => {
  const nextFilters = { ...filters }
  if (authStore.hasRole('STUDENT')) {
    delete nextFilters.studentId
  }
  return nextFilters
}

const normalizeActiveFilters = (filters = {}) => {
  const nextFilters = { ...filters }
  if (authStore.hasRole('STUDENT')) {
    delete nextFilters.studentId
  }
  return nextFilters
}

export const authorizationsStore = {
  state,
  loading,
  async submitApplication(payload, options = {}) {
    loading.value = true
    try {
      const result = normalizeAuthorizationRecord(await authorizationsApi.submitApplication(payload, options))
      messageStore.success(`授权申请已提交，申请编号：${result.applicationNo || '--'}`, '提交成功')
      return result
    } finally {
      loading.value = false
    }
  },
  async loadPage(filters = {}, options = {}) {
    loading.value = true
    try {
      const params = normalizeApplicationFilters(filters)
      const result = await authorizationsApi.getApplicationPage(params, options)
      state.pageData = normalizePageResult(result, params)
      return state.pageData
    } finally {
      loading.value = false
    }
  },
  async loadActivePage(filters = {}, options = {}) {
    loading.value = true
    try {
      const params = normalizeActiveFilters(filters)
      const result = await authorizationsApi.getActivePage(params, options)
      state.activePageData = normalizePageResult(result, params)
      return state.activePageData
    } finally {
      loading.value = false
    }
  },
  async loadDetail(id, options = {}) {
    if (!id) {
      state.current = null
      return null
    }

    loading.value = true
    try {
      state.current = normalizeAuthorizationRecord(await authorizationsApi.getApplicationDetail(id, options))
      return state.current
    } finally {
      loading.value = false
    }
  },
  async accessAuthorizedData(id, options = {}) {
    if (!id) {
      state.currentAccessData = null
      return null
    }

    loading.value = true
    try {
      state.currentAccessData = await authorizationsApi.accessAuthorizedData(id, options)
      messageStore.success('授权数据访问成功，访问留痕已同步写入。', '访问成功')
      return state.currentAccessData
    } finally {
      loading.value = false
    }
  },
  async approve(id, payload = {}, options = {}) {
    loading.value = true
    try {
      const result = normalizeAuthorizationRecord(await authorizationsApi.approveApplication(id, payload, options))
      messageStore.success('授权申请已审批通过。', '审批完成')
      return result
    } finally {
      loading.value = false
    }
  },
  async reject(id, payload = {}, options = {}) {
    loading.value = true
    try {
      const result = normalizeAuthorizationRecord(await authorizationsApi.rejectApplication(id, payload, options))
      messageStore.success('授权申请已驳回。', '审批完成')
      return result
    } finally {
      loading.value = false
    }
  },
}
