export const AUDIT_LOG_RESULT_OPTIONS = [
  { value: '', label: '全部结果' },
  { value: 'SUCCESS', label: '成功' },
  { value: 'FAILED', label: '失败' },
  { value: 'DENIED', label: '拒绝' },
]

export const createAuditLogFilters = (overrides = {}) => ({
  pageNum: 1,
  pageSize: 10,
  operatorId: '',
  action: '',
  result: '',
  startTime: '',
  endTime: '',
  ...overrides,
})

export const normalizeAuditLogRecord = (record = {}) => ({
  ...record,
  logId: record.logId || record.id || record.log_id || '',
  operatorId: record.operatorId || record.operator_id || '',
  operatorName: record.operatorName || record.operator_name || '',
  action: record.action || '',
  businessType: record.businessType || record.business_type || '',
  businessId: record.businessId || record.business_id || '',
  ip: record.ip || record.ipAddress || record.ip_address || '',
  result: record.result || '',
  detail: record.detail || record.description || '',
  occurredAt: record.occurredAt || record.occurred_at || '',
})

export const normalizeAuditLogPageResult = (result = {}, fallback = {}) => {
  const records = (result.records || result.list || [])
    .map(normalizeAuditLogRecord)
    .sort((left, right) => {
      const leftTime = left.occurredAt ? new Date(left.occurredAt).getTime() : 0
      const rightTime = right.occurredAt ? new Date(right.occurredAt).getTime() : 0
      return rightTime - leftTime
    })

  return {
    records,
    total: result.total || 0,
    pageNum: result.pageNum || fallback.pageNum || 1,
    pageSize: result.pageSize || fallback.pageSize || 10,
  }
}
