import { reactive, ref } from 'vue'
import { approvalHistoryApi } from '../api/approvalHistory'
import {
  createApprovalHistoryFilters,
  normalizeApprovalPageResult,
  normalizeApprovalRecord,
} from '../types/approval'

const state = reactive({
  filters: createApprovalHistoryFilters(),
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

export const approvalHistoryStore = {
  state,
  loading,
  detailLoading,
  async loadPage(filters = state.filters, options = {}) {
    loading.value = true
    try {
      state.filters = createApprovalHistoryFilters({
        ...state.filters,
        ...filters,
      })
      const result = await approvalHistoryApi.getPage(state.filters, options)
      state.pageData = normalizeApprovalPageResult(result, state.filters)
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
      state.currentDetail = normalizeApprovalRecord(await approvalHistoryApi.getDetail(id, options))
      return state.currentDetail
    } finally {
      detailLoading.value = false
    }
  },
}
