import { reactive, ref } from 'vue'
import { evidenceApi } from '../api/evidence'
import { messageStore } from './message'
import { resolveApprovalStatus, resolveEvidenceStatus, resolveVerifyStatus } from '../utils/helpers'

const state = reactive({
  activeTab: 'applications',
  applicationFilters: {
    pageNum: 1,
    pageSize: 10,
    studentId: '',
    status: '',
    evidenceType: '',
  },
  evidenceFilters: {
    pageNum: 1,
    pageSize: 10,
    studentId: '',
    status: '',
    startDate: '',
    endDate: '',
  },
  applications: [],
  evidences: [],
  applicationTotal: 0,
  evidenceTotal: 0,
  currentApplication: null,
  currentEvidence: null,
  verifyResult: null,
})

const loading = ref(false)

/**
 * 统一存证申请、正式存证详情和列表记录的字段结构，
 * 避免页面层分别兼容多种响应命名。
 */
const normalizeEvidenceRecord = (record = {}, options = {}) => {
  const nestedEvidence = record.evidence || record.record || record.evidenceRecord || {}
  const nestedApplication = record.application || record.evidenceApplication || {}
  const explicitEvidenceId = (
    nestedEvidence.evidenceId ||
    nestedEvidence.id ||
    record.evidenceId ||
    record.evidence_id ||
    record.recordId ||
    record.evidenceRecordId
  )
  const inferredEvidenceId = (
    explicitEvidenceId ||
    (options.assumeEvidenceId ? options.requestedEvidenceId || '' : '')
  )

  const merged = {
    ...nestedApplication,
    ...nestedEvidence,
    ...record,
  }

  const normalized = {
    ...merged,
    evidenceId: inferredEvidenceId,
    applicationId: merged.applicationId || merged.application_id || nestedApplication.applicationId || nestedApplication.application_id || '',
    applicationNo: merged.applicationNo || merged.application_no || nestedApplication.applicationNo || nestedApplication.application_no || '',
    privacyDataId: merged.privacyDataId || merged.privacy_data_id || nestedApplication.privacyDataId || nestedApplication.privacy_data_id || '',
    evidenceNo: merged.evidenceNo || merged.evidence_no || nestedEvidence.evidenceNo || nestedEvidence.evidence_no || '',
    digest: merged.digest || merged.dataDigest || merged.data_digest || '',
    txId: merged.txId || merged.tx_id || merged.transactionId || merged.transaction_id || '',
    blockHash: merged.blockHash || merged.block_hash || '',
    chainAt: merged.chainAt || merged.chainedAt || merged.chainTime || merged.evidenceTime || merged.txTime || merged.tx_time || '',
  }

  normalized.approvalStatus = resolveApprovalStatus(normalized)
  normalized.evidenceStatus = resolveEvidenceStatus(normalized)
  normalized.verifyStatus = resolveVerifyStatus(normalized)
  return normalized
}

const assignPageResult = (targetKey, totalKey, result) => {
  state[targetKey] = (result.records || []).map(normalizeEvidenceRecord)
  state[totalKey] = result.total || 0
}

export const evidenceStore = {
  state,
  loading,
  setActiveTab(tab) {
    state.activeTab = tab
  },
  resetVerifyResult() {
    state.verifyResult = null
  },
  async submitApplication(payload) {
    const result = await evidenceApi.submitApplication(payload)
    messageStore.success(`申请已提交，申请编号：${result.applicationNo}`, '提交成功')
    return result
  },
  async loadApplications(params = state.applicationFilters) {
    loading.value = true
    try {
      state.applicationFilters = { ...state.applicationFilters, ...params }
      const result = await evidenceApi.getApplicationPage(state.applicationFilters)
      assignPageResult('applications', 'applicationTotal', result)
      return result
    } finally {
      loading.value = false
    }
  },
  async loadApplicationDetail(id) {
    loading.value = true
    try {
      state.currentApplication = normalizeEvidenceRecord(await evidenceApi.getApplicationDetail(id))
      return state.currentApplication
    } finally {
      loading.value = false
    }
  },
  async approveApplication(id, payload) {
    const result = await evidenceApi.approveApplication(id, payload)
    messageStore.success('存证申请已审核通过。', '审批完成')
    return result
  },
  async rejectApplication(id, payload) {
    const result = await evidenceApi.rejectApplication(id, payload)
    messageStore.success('存证申请已驳回。', '审批完成')
    return result
  },
  async chainEvidence(id, payload) {
    let result = normalizeEvidenceRecord(await evidenceApi.chainEvidence(id, payload))

    // 上链接口有时先返回状态推进结果，正式存证编号会稍后在详情接口中补全。
    if (!result.evidenceNo && result.evidenceId) {
      try {
        result = normalizeEvidenceRecord(
          await evidenceApi.getEvidenceDetail(result.evidenceId, { silent: true }),
          { assumeEvidenceId: true, requestedEvidenceId: result.evidenceId },
        )
      } catch {
        // 不阻断上链成功主流程；若详情尚未补全，提示先使用兜底文案。
      }
    }

    messageStore.success(`上链成功，存证编号：${result.evidenceNo || '--'}。可继续执行一致性校验。`, '存证成功')
    return result
  },
  async loadEvidences(params = state.evidenceFilters) {
    loading.value = true
    try {
      state.evidenceFilters = { ...state.evidenceFilters, ...params }
      const result = await evidenceApi.getEvidencePage(state.evidenceFilters)
      assignPageResult('evidences', 'evidenceTotal', result)
      return result
    } finally {
      loading.value = false
    }
  },
  async loadEvidenceDetail(id, options = {}) {
    loading.value = true
    try {
      state.currentEvidence = normalizeEvidenceRecord(
        await evidenceApi.getEvidenceDetail(id, options),
        { assumeEvidenceId: true, requestedEvidenceId: id },
      )
      return state.currentEvidence
    } finally {
      loading.value = false
    }
  },
  async verifyEvidence(id) {
    const result = await evidenceApi.verifyEvidence(id)
    state.verifyResult = result
    if (result.matched) {
      messageStore.success('链上摘要与当前数据一致。', '校验完成')
    } else {
      messageStore.error('链上摘要与当前数据不一致。', '校验异常')
    }
    return result
  },
  async invalidateEvidence(id, payload) {
    const result = await evidenceApi.invalidateEvidence(id, payload)
    messageStore.success('存证记录已作废。', '操作完成')
    return result
  },
}
