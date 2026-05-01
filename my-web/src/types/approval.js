export const APPROVAL_BUSINESS_TYPE_OPTIONS = [
  { value: '', label: '全部业务类型' },
  { value: 'EVIDENCE', label: '存证审批' },
  { value: 'AUTHORIZATION', label: '授权审批' },
]

export const APPROVAL_STATUS_OPTIONS = [
  { value: '', label: '全部审批结果' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
]

export const createApprovalHistoryFilters = (overrides = {}) => ({
  pageNum: 1,
  pageSize: 10,
  businessType: '',
  status: '',
  ...overrides,
})

export const normalizeApprovalRecord = (record = {}) => ({
  ...record,
  approvalId: record.approvalId || record.id || record.approval_id || '',
  applicationNo: record.applicationNo || record.application_no || '',
  businessType: record.businessType || record.business_type || '',
  businessId: record.businessId || record.business_id || '',
  reviewerId: record.reviewerId || record.reviewer_id || '',
  reviewerName: record.reviewerName || record.reviewer_name || '',
  status: record.status || record.reviewStatus || record.review_status || '',
  reviewComment: record.reviewComment || record.review_comment || '',
  reviewedAt: record.reviewedAt || record.reviewed_at || '',
})

export const normalizeApprovalPageResult = (result = {}, fallback = {}) => {
  const records = (result.records || result.list || [])
    .map(normalizeApprovalRecord)
    .sort((left, right) => {
      const leftTime = left.reviewedAt ? new Date(left.reviewedAt).getTime() : 0
      const rightTime = right.reviewedAt ? new Date(right.reviewedAt).getTime() : 0
      return rightTime - leftTime
    })

  return {
    records,
    total: result.total || 0,
    pageNum: result.pageNum || fallback.pageNum || 1,
    pageSize: result.pageSize || fallback.pageSize || 10,
  }
}
