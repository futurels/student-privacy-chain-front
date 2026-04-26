import { reactive, ref } from 'vue'
import { approvalsApi } from '../api/approvals'

const state = reactive({
  filters: {
    pageNum: 1,
    pageSize: 10,
    businessType: '',
    status: '',
    privacyDataId: '',
    studentId: '',
  },
  pageData: {
    records: [],
    total: 0,
  },
  currentDetail: null,
})

const loading = ref(false)
const detailLoading = ref(false)

const normalizeApprovalRecord = (record = {}) => {
  const nestedEvidence = record.evidence || record.record || record.evidenceRecord || {}
  const businessType = record.businessType || record.business_type || ''
  const businessId = record.businessId || record.business_id || ''
  const evidenceId = (
    record.evidenceId ||
    record.evidence_id ||
    record.recordId ||
    record.evidenceRecordId ||
    nestedEvidence.evidenceId ||
    nestedEvidence.id ||
    ''
  )

  return {
    ...record,
    approvalId: record.approvalId || record.id || '',
    businessType,
    businessId,
    applicationId: record.applicationId || record.application_id || (['EVIDENCE', 'EVIDENCE_APPLICATION'].includes(businessType) ? businessId : ''),
    evidenceId,
    applicationNo: record.applicationNo || record.application_no || '',
    privacyDataId: record.privacyDataId || record.privacy_data_id || '',
    reviewerId: record.reviewerId || record.reviewer_id || '',
    reviewerName: record.reviewerName || record.reviewer_name || '',
    status: record.status || '',
    reviewComment: record.reviewComment || record.review_comment || '',
    reviewedAt: record.reviewedAt || record.reviewed_at || '',
    studentId: record.studentId || record.student_id || '',
    studentName: record.studentName || record.student_name || '',
  }
}

export const approvalsStore = {
  state,
  loading,
  detailLoading,
  async loadPage(params = state.filters) {
    loading.value = true
    try {
      state.filters = { ...state.filters, ...params }
      const result = await approvalsApi.getPage(state.filters)
      state.pageData.records = (result.records || []).map(normalizeApprovalRecord)
      state.pageData.total = result.total || 0
      return state.pageData
    } finally {
      loading.value = false
    }
  },
  async loadDetail(id) {
    detailLoading.value = true
    try {
      state.currentDetail = normalizeApprovalRecord(await approvalsApi.getDetail(id))
      return state.currentDetail
    } finally {
      detailLoading.value = false
    }
  },
}
