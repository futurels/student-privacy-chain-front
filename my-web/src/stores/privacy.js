import { computed, reactive, ref } from 'vue'
import { privacyApi } from '../api/privacy'
import { authStore } from './auth'

const EMPTY_PAGE_DATA = {
  records: [],
  total: 0,
  pageNum: 1,
  pageSize: 10,
}

const state = reactive({
  filters: {
    pageNum: 1,
    pageSize: 10,
    studentId: '',
    dataType: '',
    status: '',
  },
  pageData: null,
  detail: null,
  archive: null,
  formDraft: {
    id: '',
    studentId: '',
    dataType: '',
    title: '',
    content: '',
    securityLevel: '',
  },
})

const loading = ref(false)

const normalizePageFilters = (filters) => {
  const nextFilters = { ...filters }

  if (authStore.hasRole('STUDENT')) {
    // Student list queries must rely on the current login context.
    // Never reuse `sys_user.id` as `student_profile.id` in API-15 filters.
    delete nextFilters.studentId
  }

  return nextFilters
}

const isStudentProfileMissingError = (error) => {
  const message = `${error?.message || ''}${error?.payload?.message || ''}`.toLowerCase()
  return message.includes('current login student profile not found') || message.includes('学生档案不存在')
}

export const privacyStore = {
  state,
  loading,
  records: computed(() => state.pageData?.records || []),
  total: computed(() => state.pageData?.total || 0),
  async fetchPage(customFilters = {}) {
    loading.value = true
    try {
      state.filters = { ...state.filters, ...customFilters }
      state.pageData = await privacyApi.getPrivacyPage(normalizePageFilters(state.filters), {
        silent: authStore.hasRole('STUDENT'),
      })
      return state.pageData
    } catch (error) {
      if (authStore.hasRole('STUDENT') && isStudentProfileMissingError(error)) {
        state.pageData = {
          ...EMPTY_PAGE_DATA,
          pageNum: Number(state.filters.pageNum) || 1,
          pageSize: Number(state.filters.pageSize) || 10,
        }
        return state.pageData
      }
      throw error
    } finally {
      loading.value = false
    }
  },
  async fetchDetail(id) {
    loading.value = true
    try {
      state.detail = await privacyApi.getPrivacyDetail(id)
      return state.detail
    } finally {
      loading.value = false
    }
  },
  async fetchArchive(studentProfileId, params = {}) {
    loading.value = true
    try {
      state.archive = await privacyApi.getStudentArchive(studentProfileId, params)
      return state.archive
    } finally {
      loading.value = false
    }
  },
  setFormDraft(payload) {
    state.formDraft = {
      ...state.formDraft,
      ...payload,
    }
  },
  resetFormDraft() {
    state.formDraft = {
      id: '',
      studentId: '',
      dataType: '',
      title: '',
      content: '',
      securityLevel: '',
    }
  },
}
