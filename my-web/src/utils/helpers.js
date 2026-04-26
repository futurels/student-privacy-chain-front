export const formatDateTime = (value) => {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', { hour12: false })
}

export const formatRoleLabel = (code) => {
  const map = {
    SYS_ADMIN: '系统管理员',
    STUDENT: '学生',
    COUNSELOR: '辅导员',
    TEACHING_ADMIN: '教务管理员',
  }
  return map[code] || code || '--'
}

export const formatStatusLabel = (status) => {
  const map = {
    ENABLED: '启用',
    DISABLED: '停用',
  }
  return map[status] || status || '--'
}

export const formatPrivacyDataType = (type) => {
  const map = {
    IDENTITY: '身份信息',
    GRADE: '成绩信息',
    STATUS: '学籍状态',
    HEALTH_REPORT: '健康报告',
    FILE: '文件材料',
  }
  return map[type] || type || '--'
}

export const formatPrivacyHandlingMode = (mode) => {
  const map = {
    STRUCTURED: '结构化数据',
    FILE_BASED: '文件型数据',
    MIXED: '混合数据',
  }
  return map[mode] || mode || '--'
}

export const formatPrivacyStatus = (status) => {
  const map = {
    DRAFT: '草稿',
    READY_FOR_EVIDENCE: '待提交存证',
    PENDING_REVIEW: '审核中',
    PENDING_CHAIN: '待执行上链',
    APPROVED: '已通过',
    REJECTED: '已驳回 / 待重新提交',
    CHAINING: '上链中',
    CHAINED: '已上链',
  }
  return map[status] || status || '--'
}

export const formatPrivacyStatusForDisplay = (status) => {
  const map = {
    DRAFT: '草稿',
    READY_FOR_EVIDENCE: '待提交存证',
    PENDING_REVIEW: '审核中',
    PENDING_CHAIN: '待执行上链',
    APPROVED: '已通过',
    REJECTED: '已驳回 / 待重新提交',
    CHAINING: '上链中',
    CHAINED: '已上链',
    CHAIN_FAILED: '上链失败',
    INVALIDATED: '已作废',
  }
  return map[status] || formatPrivacyStatus(status)
}

export const isStructuredPrivacyDataType = (type) => ['IDENTITY', 'GRADE', 'STATUS'].includes(type)

export const resolvePrivacyHandlingMode = (detail = {}) => {
  const explicitMode = detail.mode || detail.processingMode || detail.processMode || ''
  if (['STRUCTURED', 'FILE_BASED', 'MIXED'].includes(explicitMode)) {
    return explicitMode
  }
  // 旧接口没有 mode 字段时，用数据类型推断处理方式，保持存量数据可提交。
  return isStructuredPrivacyDataType(detail.dataType) ? 'STRUCTURED' : 'FILE_BASED'
}

export const requiresAttachmentForPrivacyDataType = (type) => {
  if (!type) {
    return false
  }

  if (isStructuredPrivacyDataType(type)) {
    return false
  }

  return ['HEALTH_REPORT', 'FILE', 'ATTACHMENT', 'DOCUMENT', 'CERTIFICATE', 'IMAGE', 'MATERIAL'].includes(type)
}

export const requiresAttachmentForPrivacy = (detail = {}) => {
  const mode = resolvePrivacyHandlingMode(detail)
  if (mode === 'STRUCTURED') {
    return false
  }
  return true
}

const getAttachmentCount = (detail = {}) => detail.attachmentCount || detail.fileCount || detail.attachCount || 0
const hasStructuredContent = (detail = {}) => Boolean(String(detail.content || '').trim())

export const canSubmitEvidenceByPrivacyStatus = (status) => ['READY_FOR_EVIDENCE', 'REJECTED'].includes(status)

export const resolvePrivacyEvidenceType = (detail = {}) => (
  requiresAttachmentForPrivacy(detail) ? 'FILE' : 'STRUCTURED'
)

export const getPrivacySubmissionGate = (detail = {}) => {
  const mode = resolvePrivacyHandlingMode(detail)
  const requiresAttachment = requiresAttachmentForPrivacy(detail)
  const attachmentCount = getAttachmentCount(detail)
  const status = detail.status || ''
  const contentReady = hasStructuredContent(detail)

  // 混合型数据至少需要结构化说明，否则即使有附件也缺少可审核的业务摘要。
  if (mode === 'MIXED' && !contentReady) {
    return {
      canSubmit: false,
      message: '请先完善内容。',
      evidenceType: 'FILE',
    }
  }

  // 文件型材料必须先有附件，避免生成没有原始文件支撑的存证申请。
  if (requiresAttachment && attachmentCount <= 0) {
    return {
      canSubmit: false,
      message: '请先上传至少一个附件。',
      evidenceType: 'FILE',
    }
  }

  // 结构化数据不要求附件，但必须有正文内容用于后续摘要计算和链上比对。
  if (!requiresAttachment && !contentReady) {
    return {
      canSubmit: false,
      message: '请先完善内容。',
      evidenceType: 'STRUCTURED',
    }
  }

  if (!canSubmitEvidenceByPrivacyStatus(status)) {
    const map = {
      DRAFT: requiresAttachment ? '请先上传至少一个附件。' : '请先完善内容。',
      PENDING_REVIEW: '当前数据已有待审核申请，请到申请列表查看处理进度。',
      PENDING_CHAIN: '当前数据已通过审批，正在等待执行上链，请到存证记录查看进度。',
      CHAINING: '当前数据已进入上链流程，请到存证记录查看后续进度。',
      CHAINED: '当前数据已完成上链，如需核验请到存证记录页查看。',
    }
    return {
      canSubmit: false,
      message: map[status] || '当前状态暂不支持再次提交存证申请。',
      evidenceType: resolvePrivacyEvidenceType(detail),
    }
  }

  return {
    canSubmit: true,
    message: requiresAttachment ? '当前文件型数据已满足提交条件。' : '当前结构化数据已满足提交条件。',
    evidenceType: resolvePrivacyEvidenceType(detail),
  }
}

export const getPrivacyEvidenceBlockMessage = (detailOrStatus, dataType) => {
  if (typeof detailOrStatus === 'string') {
    return getPrivacySubmissionGate({ status: detailOrStatus, dataType }).message
  }
  return getPrivacySubmissionGate(detailOrStatus || {}).message
}

export const formatEvidenceApplicationStatus = (status) => {
  const map = {
    PENDING_REVIEW: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回',
    CHAINING: '上链中',
    CHAINED: '已上链',
    INVALIDATED: '已作废',
  }
  return map[status] || status || '--'
}

export const formatEvidenceStatus = (status) => {
  const map = {
    CHAINING: '上链中',
    CHAINED: '已上链',
    INVALIDATED: '已作废',
    FAILED: '失败',
  }
  return map[status] || status || '--'
}

export const formatEvidenceTypeLabel = (type) => {
  const map = {
    STRUCTURED: '结构化数据',
    FILE: '附件文件',
  }
  return map[type] || type || '--'
}

export const formatApprovalStatusLabel = (status) => {
  const map = {
    APPROVED: '已通过',
    REJECTED: '已驳回',
  }
  return map[status] || status || '--'
}

export const formatApprovalBusinessType = (type) => {
  const map = {
    EVIDENCE: '存证审批',
    EVIDENCE_APPLICATION: '存证审批',
    AUTHORIZATION: '授权审批',
  }
  return map[type] || type || '--'
}

export const formatChainEvidenceStatus = (status) => {
  const map = {
    PENDING_CHAIN: '待执行上链',
    CHAINING: '上链中',
    CHAINED: '已上链',
    CHAIN_FAILED: '上链失败',
    FAILED: '失败',
    INVALIDATED: '已作废',
  }
  return map[status] || status || '--'
}

export const formatVerifyStatus = (status) => {
  const map = {
    NOT_VERIFIED: '尚未校验',
    VERIFYING: '校验中',
    MATCHED: '校验通过',
    MISMATCHED: '校验异常',
    FAILED: '校验失败',
  }
  return map[status] || status || '尚未校验'
}

export const resolveApprovalStatus = (record = {}) => {
  const raw = record.approvalStatus || record.applicationStatus || record.reviewStatus || ''
  if (raw) {
    return raw
  }
  if (['APPROVED', 'REJECTED', 'PENDING_REVIEW'].includes(record.status)) {
    return record.status
  }
  const evidenceStatus = resolveEvidenceStatus(record)
  // 形成待上链/已上链记录时，业务上等价于申请已经通过，避免详情页把两类状态割裂展示。
  if (record.applicationId && ['PENDING_CHAIN', 'CHAINING', 'CHAINED', 'CHAIN_FAILED', 'INVALIDATED'].includes(evidenceStatus)) {
    return 'APPROVED'
  }
  return ''
}

export const resolveEvidenceStatus = (record = {}) => {
  const chainTxStatus = record.txStatus || record.tx_status || record.transactionStatus || record.chainTxStatus || record.chain_tx_status || ''
  const normalizedChainTxStatus = String(chainTxStatus || '').toUpperCase()
  if (['CHAINED', 'CHAIN_FAILED', 'FAILED', 'INVALIDATED'].includes(normalizedChainTxStatus)) {
    // 交易状态优先级高于业务状态，因为它直接反映链上登记结果。
    return normalizedChainTxStatus === 'FAILED' ? 'CHAIN_FAILED' : normalizedChainTxStatus
  }

  const raw = record.evidenceStatus || record.chainStatus || record.recordStatus || record.status || ''
  const normalizedRaw = String(raw || '').toUpperCase()
  if (normalizedRaw === 'FAILED') {
    return 'CHAIN_FAILED'
  }
  if (['PENDING_CHAIN', 'CHAINING', 'CHAINED', 'CHAIN_FAILED', 'INVALIDATED'].includes(normalizedRaw)) {
    return normalizedRaw
  }

  if (record.txId || record.tx_id || record.blockHash || record.block_hash) {
    // 如果后端漏传状态但已返回链上标识，前端按已上链展示，方便排查接口字段不一致问题。
    return 'CHAINED'
  }
  if (normalizedRaw === 'APPROVED') {
    // 审批通过不是正式存证完成，只代表进入待上链阶段。
    return 'PENDING_CHAIN'
  }
  return ''
}

export const resolveVerifyStatus = (record = {}) => {
  if (record.verifyStatus) {
    return record.verifyStatus
  }
  if (record.matched === true) {
    return 'MATCHED'
  }
  if (record.matched === false) {
    return 'MISMATCHED'
  }
  return 'NOT_VERIFIED'
}

export const formatBooleanLabel = (value) => (value ? '一致' : '不一致')

export const buildTree = (items = []) => {
  const map = new Map()
  const roots = []
  items.forEach((item) => map.set(item.id, { ...item, children: [] }))
  map.forEach((item) => {
    // 权限树允许后端返回乱序节点，先建索引再挂父子关系。
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(item)
    } else {
      roots.push(item)
    }
  })
  return roots
}

export const buildRouteWithQuery = (path, query = {}) => {
  const search = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      search.set(key, value)
    }
  })
  const suffix = search.toString()
  return suffix ? `${path}?${suffix}` : path
}

export const getTagClassByStatus = (status) => {
  if (['APPROVED', 'CHAINED', 'ENABLED', 'READY_FOR_EVIDENCE'].includes(status)) {
    return 'tag-green'
  }
  if (['PENDING_CHAIN', 'CHAINING', 'PENDING_REVIEW'].includes(status)) {
    return 'tag-blue'
  }
  if (['REJECTED', 'FAILED', 'CHAIN_FAILED', 'INVALIDATED', 'DISABLED'].includes(status)) {
    return 'tag-red'
  }
  return 'tag-blue'
}
