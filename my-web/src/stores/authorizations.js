import { reactive, ref } from 'vue'
import { authorizationsApi } from '../api/authorizations'
import { authStore } from './auth'
import { messageStore } from './message'

const state = reactive({
  pageData: {
    records: [],
    total: 0,
    pageNum: 1,
    pageSize: 10,
  },
  current: null,
})

const loading = ref(false)

const normalizeAuthorizationRecord = (record = {}) => ({
  ...record,
  applicationId: record.applicationId || record.id || record.application_id || '',
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
})

const normalizePageResult = (result = {}, fallback = {}) => ({
  records: (result.records || []).map(normalizeAuthorizationRecord),
  total: result.total || 0,
  pageNum: result.pageNum || fallback.pageNum || 1,
  pageSize: result.pageSize || fallback.pageSize || 10,
})

const normalizeFilters = (filters = {}) => {
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
      const params = normalizeFilters(filters)
      const result = await authorizationsApi.getApplicationPage(params, options)
      state.pageData = normalizePageResult(result, params)
      return state.pageData
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
}
