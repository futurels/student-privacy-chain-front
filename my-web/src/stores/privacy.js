import { reactive, ref } from 'vue'
import { privacyApi } from '../api/privacy'
import { authStore } from './auth'
import { messageStore } from './message'

const state = reactive({
  pageData: {
    records: [],
    total: 0,
    pageNum: 1,
    pageSize: 10,
  },
  shareableRecords: [],
  shareableTotal: 0,
  selectedShareData: null,
  current: null,
})

const loading = ref(false)
const shareableLoading = ref(false)

const normalizePageResult = (result = {}, fallback = {}) => ({
  records: result.records || [],
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

export const privacyStore = {
  state,
  loading,
  shareableLoading,
  async loadPage(filters = {}) {
    loading.value = true
    try {
      const params = normalizeFilters(filters)
      const result = await privacyApi.getPrivacyDataPage(params)
      state.pageData = normalizePageResult(result, params)
      return state.pageData
    } finally {
      loading.value = false
    }
  },
  async loadShareablePrivacyData(filters = {}) {
    shareableLoading.value = true
    try {
      const params = {
        pageNum: filters.pageNum || 1,
        pageSize: filters.pageSize || 10,
        dataType: filters.dataType || undefined,
      }
      const result = await privacyApi.getShareablePrivacyDataPage(params)
      state.shareableRecords = result.records || []
      state.shareableTotal = result.total || 0
      return {
        records: state.shareableRecords,
        total: state.shareableTotal,
        pageNum: result.pageNum || params.pageNum,
        pageSize: result.pageSize || params.pageSize,
      }
    } finally {
      shareableLoading.value = false
    }
  },
  selectShareData(record) {
    state.selectedShareData = record || null
  },
  clearSelectedShareData() {
    state.selectedShareData = null
  },
  async loadDetail(id) {
    if (!id) {
      state.current = null
      return null
    }

    loading.value = true
    try {
      state.current = await privacyApi.getPrivacyDataDetail(id)
      return state.current
    } finally {
      loading.value = false
    }
  },
  async create(payload) {
    loading.value = true
    try {
      const result = await privacyApi.createPrivacyData(payload)
      messageStore.success('隐私数据已创建。')
      return result
    } finally {
      loading.value = false
    }
  },
  async update(id, payload) {
    loading.value = true
    try {
      const result = await privacyApi.updatePrivacyData(id, payload)
      messageStore.success('隐私数据已更新。')
      return result
    } finally {
      loading.value = false
    }
  },
}
