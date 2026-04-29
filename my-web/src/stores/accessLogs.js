import { reactive, ref } from 'vue'
import { accessLogsApi } from '../api/accessLogs'

const state = reactive({
  pageData: {
    records: [],
    total: 0,
    pageNum: 1,
    pageSize: 10,
  },
})

const loading = ref(false)

const normalizeAccessLog = (record = {}) => ({
  ...record,
  logId: record.logId || record.id || record.log_id || '',
  authorizationId: record.authorizationId || record.authorization_id || '',
  accessorName: record.accessorName || record.accessor_name || '',
  privacyDataId: record.privacyDataId || record.privacy_data_id || '',
  studentId: record.studentId || record.student_id || '',
  accessTime: record.accessTime || record.access_time || '',
  result: record.result || '',
})

const normalizePageResult = (result = {}, fallback = {}) => ({
  records: (result.records || []).map(normalizeAccessLog),
  total: result.total || 0,
  pageNum: result.pageNum || fallback.pageNum || 1,
  pageSize: result.pageSize || fallback.pageSize || 10,
})

export const accessLogsStore = {
  state,
  loading,
  async loadPage(filters = {}, options = {}) {
    loading.value = true
    try {
      const result = await accessLogsApi.getPage(filters, options)
      state.pageData = normalizePageResult(result, filters)
      return state.pageData
    } finally {
      loading.value = false
    }
  },
}
