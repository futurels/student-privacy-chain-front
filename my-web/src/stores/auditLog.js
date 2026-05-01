import { reactive, ref } from 'vue'
import { auditLogApi } from '../api/auditLog'
import {
  createAuditLogFilters,
  normalizeAuditLogPageResult,
  normalizeAuditLogRecord,
} from '../types/audit-log'

const state = reactive({
  filters: createAuditLogFilters(),
  pageData: {
    records: [],
    total: 0,
    pageNum: 1,
    pageSize: 10,
  },
  currentDetail: null,
})

const loading = ref(false)
const detailLoading = ref(false)

export const auditLogStore = {
  state,
  loading,
  detailLoading,
  async loadPage(filters = state.filters, options = {}) {
    loading.value = true
    try {
      state.filters = createAuditLogFilters({
        ...state.filters,
        ...filters,
      })
      const result = await auditLogApi.getPage(state.filters, options)
      state.pageData = normalizeAuditLogPageResult(result, state.filters)
      return state.pageData
    } finally {
      loading.value = false
    }
  },
  async loadDetail(id, options = {}) {
    if (!id) {
      state.currentDetail = null
      return null
    }

    detailLoading.value = true
    try {
      state.currentDetail = normalizeAuditLogRecord(await auditLogApi.getDetail(id, options))
      return state.currentDetail
    } finally {
      detailLoading.value = false
    }
  },
}
