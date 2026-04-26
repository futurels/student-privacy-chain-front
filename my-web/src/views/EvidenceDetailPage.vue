<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { router } from '../router'
import { authStore } from '../stores/auth'
import { evidenceStore } from '../stores/evidence'
import { messageStore } from '../stores/message'
import {
  buildRouteWithQuery,
  formatBooleanLabel,
  formatChainEvidenceStatus,
  formatDateTime,
  formatEvidenceApplicationStatus,
  formatVerifyStatus,
  getTagClassByStatus,
  resolveApprovalStatus,
  resolveEvidenceStatus,
  resolveVerifyStatus,
} from '../utils/helpers'

const query = computed(() => router.currentRoute.value.query)
const detail = ref(null)
const applicationDetail = ref(null)
const verifyResult = ref(null)
const loading = ref(false)
const verifying = ref(false)
const chaining = ref(false)
const invalidating = ref(false)

const chainForm = reactive({
  channelName: 'student-privacy-channel',
})

const invalidateForm = reactive({
  reason: '',
})

const resetDetailState = () => {
  detail.value = null
  applicationDetail.value = null
  verifyResult.value = null
  evidenceStore.resetVerifyResult()
}

// 详情页可能从“申请列表”或“存证列表”进入，后端字段层级不同，因此先统一识别正式存证主键。
const resolveEvidenceIdentity = (record = {}) => (
  record.evidenceId ||
  record.recordId ||
  record.evidenceRecordId ||
  record.evidence?.evidenceId ||
  record.evidence?.id ||
  record.record?.evidenceId ||
  record.evidenceRecord?.evidenceId ||
  ''
)

const resolveEvidencePayload = (record = {}) => (
  record.evidence ||
  record.record ||
  record.evidenceRecord ||
  record
)

const canChainRole = computed(() => authStore.hasRole('TEACHING_ADMIN') || authStore.hasRole('SYS_ADMIN'))
const canInvalidateRole = computed(() => authStore.hasRole('TEACHING_ADMIN') || authStore.hasRole('SYS_ADMIN'))
const evidenceId = computed(() => query.value.get('id') || resolveEvidenceIdentity(detail.value || {}) || '')
const applicationId = computed(() => query.value.get('applicationId') || detail.value?.applicationId || applicationDetail.value?.applicationId || '')
const privacyDataId = computed(() => detail.value?.privacyDataId || applicationDetail.value?.privacyDataId || query.value.get('privacyDataId') || '')

const approvalStatus = computed(() => resolveApprovalStatus({
  ...(applicationDetail.value || {}),
  ...(detail.value || {}),
  status: applicationDetail.value?.status || query.value.get('status') || detail.value?.status,
}))

const rawEvidenceStatus = computed(() => resolveEvidenceStatus({
  ...(applicationDetail.value || {}),
  ...(detail.value || {}),
  evidenceStatus: detail.value?.evidenceStatus || applicationDetail.value?.evidenceStatus || query.value.get('evidenceStatus') || '',
  status: detail.value?.status || applicationDetail.value?.status || query.value.get('status') || '',
}))
const latestVerifyResult = computed(() => {
  if (verifyResult.value) {
    return verifyResult.value
  }
  if (!detail.value) {
    return null
  }
  // 后端可能把最近一次校验结果直接挂在详情字段上，这里转换成页面统一使用的校验对象。
  if (detail.value.verifiedAt || typeof detail.value.matched === 'boolean' || detail.value.currentDigest || detail.value.chainDigest) {
    return {
      currentDigest: detail.value.currentDigest || detail.value.digest,
      chainDigest: detail.value.chainDigest,
      matched: detail.value.matched,
      verifiedAt: detail.value.verifiedAt,
      verifyMessage: detail.value.verifyMessage,
    }
  }
  return null
})
const verifyStatus = computed(() => resolveVerifyStatus(latestVerifyResult.value || detail.value || {}))

const currentEvidenceSource = computed(() => detail.value || applicationDetail.value || {})
const currentEvidenceIdentity = computed(() => resolveEvidenceIdentity(currentEvidenceSource.value || {}))
const hasChainInfo = computed(() => Boolean(
  currentEvidenceSource.value?.txId ||
  currentEvidenceSource.value?.tx_id ||
  currentEvidenceSource.value?.blockHash ||
  currentEvidenceSource.value?.block_hash ||
  ['CHAINED'].includes(rawEvidenceStatus.value),
))
const hasFormalEvidence = computed(() => Boolean(
  currentEvidenceIdentity.value &&
  (
    currentEvidenceSource.value?.evidenceNo ||
    currentEvidenceSource.value?.digest ||
    hasChainInfo.value ||
    ['CHAINED', 'INVALIDATED', 'FAILED', 'CHAIN_FAILED', 'CHAINING'].includes(rawEvidenceStatus.value)
  ),
))

const evidenceStatus = computed(() => {
  const raw = rawEvidenceStatus.value
  // 存证详情的状态展示优先表达链上事实，再表达审批通过后的待上链业务阶段。
  if (raw === 'INVALIDATED') return 'INVALIDATED'
  if (['FAILED', 'CHAIN_FAILED'].includes(raw)) return 'CHAIN_FAILED'
  if (raw === 'CHAINING') return 'CHAINING'
  if (raw === 'CHAINED' || hasChainInfo.value) return 'CHAINED'
  if (!hasFormalEvidence.value && approvalStatus.value === 'APPROVED') return 'PENDING_CHAIN'
  if (raw === 'APPROVED') return 'PENDING_CHAIN'
  return raw || 'PENDING_CHAIN'
})

const pageMode = computed(() => {
  // pageMode 是模板展示的粗粒度状态，避免模板到处判断后端原始状态码。
  if (evidenceStatus.value === 'INVALIDATED') return 'invalidated'
  if (['FAILED', 'CHAIN_FAILED'].includes(evidenceStatus.value)) return 'failed'
  if (!hasFormalEvidence.value) return 'pending-chain'
  if (evidenceStatus.value === 'CHAINED') return 'chained'
  return 'formal'
})

const isReadOnly = computed(() => pageMode.value === 'invalidated')
const canRunChain = computed(() => (
  canChainRole.value &&
  approvalStatus.value === 'APPROVED' &&
  ['PENDING_CHAIN', 'CHAIN_FAILED'].includes(evidenceStatus.value)
))
const canInvalidate = computed(() => canInvalidateRole.value && hasFormalEvidence.value && !isReadOnly.value)

const backendCanVerify = computed(() => (
  typeof detail.value?.canVerify === 'boolean' ? detail.value.canVerify : null
))

const verifyBlockReason = computed(() => {
  if (isReadOnly.value) {
    return '当前存证记录已作废，仅支持查看，不再允许执行一致性校验。'
  }
  if (!evidenceId.value || !detail.value?.evidenceId) {
    return '当前尚未形成正式存证记录，请先执行上链登记。'
  }
  if (backendCanVerify.value === false) {
    // 如果后端给出 canVerify=false，以后端判定为准，避免前端误发不可执行的链上校验。
    return detail.value?.verifyBlockReason || detail.value?.verifyMessage || '后端判定当前记录暂不能执行一致性校验。'
  }
  if (backendCanVerify.value === true) {
    return ''
  }
  if (['FAILED', 'CHAIN_FAILED'].includes(rawEvidenceStatus.value)) {
    return '当前上链失败，请先重试上链登记后再执行一致性校验。'
  }
  if (evidenceStatus.value === 'PENDING_CHAIN' || pageMode.value === 'pending-chain') {
    return '当前为待上链状态，暂不能执行一致性校验，请先执行上链登记。'
  }
  if (evidenceStatus.value !== 'CHAINED') {
    return '当前不是已上链状态，暂不能执行一致性校验。'
  }
  return ''
})

const canRunVerify = computed(() => backendCanVerify.value === true || !verifyBlockReason.value)

const heroState = computed(() => {
  const map = {
    'pending-chain': {
      tag: '待上链准备态',
      title: '当前尚未形成正式存证记录',
      desc: '审批已通过，但还没有完成链上登记，因此存证编号、交易哈希和区块信息暂未生成。',
      className: 'evidence-state-waiting',
    },
    failed: {
      tag: '上链失败',
      title: '链上登记失败，等待管理员重试',
      desc: detail.value?.failureReason || detail.value?.errorMessage || '当前记录未完成链上登记，可由管理员检查后重新执行上链。',
      className: 'evidence-state-error',
    },
    chained: {
      tag: '正式存证记录',
      title: '链上存证已形成',
      desc: '当前记录已生成链上交易信息，可执行一致性校验并查看链上摘要。',
      className: 'evidence-state-success',
    },
    formal: {
      tag: '正式存证记录',
      title: '存证记录已生成',
      desc: '当前记录具备基础存证信息，若链上交易信息完整即可执行一致性校验。',
      className: 'evidence-state-success',
    },
    invalidated: {
      tag: '已作废',
      title: '当前存证记录已作废',
      desc: '已作废记录仅支持查看，不再展示可执行动作。',
      className: 'evidence-state-muted',
    },
  }
  return map[pageMode.value]
})

const verifyState = computed(() => {
  if (!canRunVerify.value && !latestVerifyResult.value) {
    return {
      title: '尚不可校验',
      desc: verifyBlockReason.value || '当前条件尚不满足，暂不能执行一致性校验。',
      className: 'result-muted',
      icon: '待',
    }
  }

  if (!latestVerifyResult.value) {
    return {
      title: '尚未校验',
      desc: '点击“执行一致性校验”后，将比对当前摘要与链上摘要是否一致。',
      className: 'result-muted',
      icon: '验',
    }
  }

  return latestVerifyResult.value.matched
    ? { title: '校验通过', desc: '当前数据摘要与链上摘要一致，存证结果可信。', className: 'result-good', icon: '✓' }
    : { title: '校验异常', desc: '当前数据摘要与链上摘要不一致，请排查数据变更或链上登记记录。', className: 'result-bad', icon: '!' }
})

const timelineItems = computed(() => [
  {
    title: '提交申请',
    desc: applicationId.value ? `申请ID：${applicationId.value}` : '尚未获取到申请ID',
    done: Boolean(applicationId.value || detail.value?.applicationNo),
  },
  {
    title: '审批通过',
    desc: approvalStatus.value ? formatEvidenceApplicationStatus(approvalStatus.value) : '等待审批状态回填',
    done: approvalStatus.value === 'APPROVED' || hasFormalEvidence.value,
  },
  {
    title: '待执行上链',
    desc: pageMode.value === 'pending-chain' ? '当前正停留在此步骤' : '已进入后续链上登记流程',
    done: ['pending-chain', 'failed', 'formal', 'chained', 'invalidated'].includes(pageMode.value),
    active: pageMode.value === 'pending-chain',
  },
  {
    title: pageMode.value === 'failed' ? '上链失败' : '上链成功',
    desc: hasChainInfo.value ? `txId：${detail.value?.txId || '--'}` : pageMode.value === 'failed' ? heroState.value.desc : '尚未生成交易哈希',
    done: hasChainInfo.value || pageMode.value === 'failed' || pageMode.value === 'invalidated',
    active: pageMode.value === 'failed',
    danger: pageMode.value === 'failed',
  },
  {
    title: '发起校验',
    desc: latestVerifyResult.value ? `校验时间：${formatDateTime(latestVerifyResult.value.verifiedAt)}` : '尚未执行一致性校验',
    done: Boolean(latestVerifyResult.value),
  },
  {
    title: '校验结果',
    desc: latestVerifyResult.value ? (latestVerifyResult.value.matched ? '摘要一致' : '摘要不一致') : '等待校验',
    done: Boolean(latestVerifyResult.value),
    danger: latestVerifyResult.value && !latestVerifyResult.value.matched,
  },
])

const missingEvidenceTips = computed(() => [
  !detail.value?.evidenceNo ? '当前尚未生成正式存证编号。' : '',
  !detail.value?.txId ? '当前无交易哈希 txId，说明尚未完成链上登记。' : '',
  !detail.value?.blockHash ? '当前无区块哈希 blockHash，暂不能展示区块信息。' : '',
].filter(Boolean))

const replaceToEvidenceRoute = (record) => {
  const payload = resolveEvidencePayload(record || {})
  const nextEvidenceId = resolveEvidenceIdentity(payload)
  if (!nextEvidenceId) {
    return ''
  }

  const target = buildRouteWithQuery('/evidence/detail', {
    id: nextEvidenceId,
    applicationId: payload.applicationId || applicationId.value,
    privacyDataId: payload.privacyDataId || privacyDataId.value,
    status: approvalStatus.value || payload.status || '',
    evidenceStatus: resolveEvidenceStatus(payload),
    chainSuccess: '1',
  })
  if (router.currentRoute.value.fullPath !== target) {
    // 申请审批通过后会生成正式存证主键，替换 URL 可以让刷新、复制链接都指向正式记录。
    router.navigate(target, true)
  }
  return nextEvidenceId
}

const loadDetail = async () => {
  loading.value = true
  try {
    if (evidenceId.value) {
      try {
        detail.value = await evidenceStore.loadEvidenceDetail(evidenceId.value, {
          silent: Boolean(applicationId.value),
        })
        applicationDetail.value = null
        return
      } catch (error) {
        if (!applicationId.value) {
          throw error
        }
        // 从申请态进入时，正式存证详情可能还查不到，此时降级加载申请详情展示待上链状态。
      }
    }

    if (applicationId.value) {
      applicationDetail.value = await evidenceStore.loadApplicationDetail(applicationId.value)
      const promotedEvidenceId = replaceToEvidenceRoute(applicationDetail.value)
      if (promotedEvidenceId) {
        // 如果申请详情中已经带出正式存证主键，立即切换到正式详情，减少页面状态分叉。
        detail.value = await evidenceStore.loadEvidenceDetail(promotedEvidenceId)
        applicationDetail.value = null
        return
      }
      detail.value = null
      return
    }

    detail.value = null
    applicationDetail.value = null
  } finally {
    loading.value = false
  }
}

const runVerify = async () => {
  if (!canRunVerify.value) {
    messageStore.info(verifyBlockReason.value || '当前条件尚不满足，暂不能执行一致性校验。')
    return
  }

  verifying.value = true
  try {
    const result = await evidenceStore.verifyEvidence(evidenceId.value)
    verifyResult.value = result
    detail.value = {
      ...(detail.value || {}),
      // 先把本次校验结果合并到页面，随后再重新拉详情，兼顾即时反馈和最终一致性。
      verifyStatus: result.verifyStatus || (result.matched ? 'MATCHED' : 'MISMATCHED'),
      verifiedAt: result.verifiedAt,
      verifyMessage: result.verifyMessage,
      currentDigest: result.currentDigest,
      chainDigest: result.chainDigest,
      matched: result.matched,
    }
    await loadDetail()
    if (detail.value?.evidenceId && !query.value.get('id')) {
      replaceToEvidenceRoute(detail.value)
    }
  } finally {
    verifying.value = false
  }
}

const runChain = async () => {
  const sourceId = applicationId.value || evidenceId.value
  if (!sourceId) {
    messageStore.warning('缺少存证申请或存证记录标识，无法执行上链登记。')
    return
  }

  chaining.value = true
  try {
    const result = await evidenceStore.chainEvidence(sourceId, {
      channelName: chainForm.channelName,
    })
    const payload = resolveEvidencePayload(result)
    const nextEvidenceId = resolveEvidenceIdentity(payload)
    // 上链接口可能只返回部分链上字段；如果拿到主键，再补拉详情保证摘要、txId、blockHash 完整。
    const nextDetail = nextEvidenceId ? await evidenceStore.loadEvidenceDetail(nextEvidenceId) : payload
    detail.value = nextDetail
    applicationDetail.value = null
    if (!replaceToEvidenceRoute(nextDetail)) {
      messageStore.warning('上链已执行，但后端响应中未返回正式存证主键，请从存证记录列表重新进入详情。')
    }
  } finally {
    chaining.value = false
  }
}

const runInvalidate = async () => {
  if (!detail.value?.evidenceId || !invalidateForm.reason) {
    messageStore.warning('请先填写作废原因。')
    return
  }

  invalidating.value = true
  try {
    await evidenceStore.invalidateEvidence(detail.value.evidenceId, {
      reason: invalidateForm.reason,
    })
    await loadDetail()
  } finally {
    invalidating.value = false
  }
}

const copyText = async (text) => {
  if (!text) {
    messageStore.info('当前字段尚未生成，暂无可复制内容。')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    messageStore.success('已复制到剪贴板。')
  } catch {
    messageStore.warning('当前环境暂不支持自动复制，请手工复制。')
  }
}

watch(
  () => [
    router.currentRoute.value.path,
    query.value.get('id') || '',
    query.value.get('applicationId') || '',
    query.value.get('privacyDataId') || '',
  ].join('|'),
  async (signature, previousSignature) => {
    if (router.currentRoute.value.path !== '/evidence/detail') {
      return
    }
    if (signature !== previousSignature) {
      resetDetailState()
    }
    await loadDetail()
  },
  { immediate: true },
)
</script>

<template>
  <div class="page-stack evidence-detail-page">
    <section class="panel evidence-hero-card" :class="heroState.className">
      <div class="panel-header evidence-hero-header">
        <div>
          <span class="page-chip">P09 存证详情与一致性校验</span>
          <h3>{{ heroState.title }}</h3>
          <p>{{ heroState.desc }}</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="router.navigate('/evidence/list')">返回列表</button>
          <button
            class="secondary-button"
            :class="{ 'is-disabled': !canRunVerify }"
            type="button"
            :disabled="verifying"
            :aria-disabled="!canRunVerify"
            :title="!canRunVerify ? verifyState.desc : '执行一致性校验'"
            @click="runVerify"
          >
            {{ verifying ? '校验中...' : '执行一致性校验' }}
          </button>
          <button
            v-if="canRunChain"
            class="primary-button"
            type="button"
            :disabled="chaining"
            @click="runChain"
          >
            {{ chaining ? '执行中...' : pageMode === 'failed' ? '重试上链登记' : '执行上链登记' }}
          </button>
        </div>
      </div>

      <div class="evidence-status-grid">
        <div class="summary-card">
          <span>审批状态</span>
          <strong>
            <span class="tag" :class="getTagClassByStatus(approvalStatus)">
              {{ approvalStatus ? formatEvidenceApplicationStatus(approvalStatus) : '待回填' }}
            </span>
          </strong>
        </div>
        <div class="summary-card">
          <span>存证状态</span>
          <strong>
            <span class="tag" :class="getTagClassByStatus(evidenceStatus)">
              {{ formatChainEvidenceStatus(evidenceStatus) }}
            </span>
          </strong>
        </div>
        <div class="summary-card">
          <span>隐私数据主键</span>
          <strong>{{ privacyDataId || '待回填' }}</strong>
        </div>
        <div class="summary-card">
          <span>当前阶段</span>
          <strong>{{ heroState.tag }}</strong>
        </div>
      </div>
    </section>

    <section v-if="loading" class="panel">
      <div class="empty-block">正在加载存证详情...</div>
    </section>

    <template v-else>
      <section v-if="pageMode === 'pending-chain'" class="notice-card evidence-next-card">
        <strong>当前尚未形成正式存证记录</strong>
        <p>审批通过只代表业务允许进入上链环节，正式存证编号、交易哈希和区块哈希需要在“执行上链登记”后生成。</p>
        <ul>
          <li v-for="tip in missingEvidenceTips" :key="tip">{{ tip }}</li>
        </ul>
      </section>

      <section class="content-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <span class="page-chip">基础存证信息</span>
              <h3>存证对象与状态</h3>
              <p>这里区分审批流程状态与链上存证状态，避免把 APPROVED 误当成正式存证结果。</p>
            </div>
          </div>
          <dl class="detail-grid">
            <div>
              <dt>存证主键</dt>
              <dd>{{ detail?.evidenceId || '尚未生成' }}</dd>
            </div>
            <div>
              <dt>存证编号</dt>
              <dd>{{ detail?.evidenceNo || '上链登记后生成' }}</dd>
            </div>
            <div>
              <dt>隐私数据主键</dt>
              <dd>{{ privacyDataId || '待回填' }}</dd>
            </div>
            <div>
              <dt>关联申请主键</dt>
              <dd>{{ applicationId || '待回填' }}</dd>
            </div>
            <div>
              <dt>审批状态</dt>
              <dd>{{ approvalStatus ? formatEvidenceApplicationStatus(approvalStatus) : '待回填' }}</dd>
            </div>
            <div>
              <dt>存证状态</dt>
              <dd>{{ formatChainEvidenceStatus(evidenceStatus) }}</dd>
            </div>
          </dl>
        </article>

        <aside class="panel detail-panel">
          <div class="panel-header">
            <div>
              <span class="page-chip">核心摘要</span>
              <h3>摘要与存证时间</h3>
            </div>
          </div>
          <div class="info-list">
            <div class="info-item">
              <span>数据摘要 digest</span>
              <div class="code-row">
                <code class="inline-code">{{ detail?.digest || '尚未生成摘要或未完成上链登记' }}</code>
                <button class="copy-button" type="button" :disabled="!detail?.digest" @click="copyText(detail?.digest)">复制</button>
              </div>
            </div>
            <div class="info-item">
              <span>存证时间</span>
              <strong>{{ detail?.chainAt || detail?.evidenceTime ? formatDateTime(detail.chainAt || detail.evidenceTime) : '上链登记后生成' }}</strong>
            </div>
            <div class="info-item">
              <span>当前状态说明</span>
              <strong>{{ heroState.desc }}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section class="content-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <span class="page-chip">链上信息</span>
              <h3>交易与区块信息</h3>
              <p>只有完成链上登记后，才会出现交易哈希、区块哈希和链上登记时间。</p>
            </div>
          </div>
          <div class="info-list">
            <div class="info-item">
              <span>交易哈希 txId</span>
              <div class="code-row">
                <code class="inline-code">{{ detail?.txId || '尚未完成链上登记，暂无 txId' }}</code>
                <button class="copy-button" type="button" :disabled="!detail?.txId" @click="copyText(detail?.txId)">复制</button>
              </div>
            </div>
            <div class="info-item">
              <span>区块哈希 blockHash</span>
              <div class="code-row">
                <code class="inline-code">{{ detail?.blockHash || '区块信息待补全' }}</code>
                <button class="copy-button" type="button" :disabled="!detail?.blockHash" @click="copyText(detail?.blockHash)">复制</button>
              </div>
            </div>
            <div class="info-item">
              <span>链上登记时间</span>
              <strong>{{ formatDateTime(detail?.chainAt || detail?.chainTime || detail?.chainedAt || detail?.evidenceTime) }}</strong>
            </div>
            <div class="info-item">
              <span>链上状态</span>
              <strong>{{ hasChainInfo ? '已登记到链上' : pageMode === 'failed' ? '上链失败' : '尚未登记' }}</strong>
            </div>
          </div>
        </article>

        <aside class="panel detail-panel">
          <div class="panel-header">
            <div>
              <span class="page-chip">一致性校验</span>
              <h3>校验结果卡</h3>
            </div>
          </div>
          <div class="verify-result-card" :class="verifyState.className">
            <div class="verify-icon">{{ verifyState.icon }}</div>
            <div>
              <strong>{{ verifyState.title }}</strong>
              <p>{{ verifyState.desc }}</p>
              <p class="top-gap">校验状态：{{ formatVerifyStatus(verifyStatus) }}</p>
            </div>
          </div>
          <div v-if="latestVerifyResult" class="detail-grid top-gap">
            <div>
              <dt>当前摘要</dt>
              <dd><code class="inline-code">{{ latestVerifyResult.currentDigest || '--' }}</code></dd>
            </div>
            <div>
              <dt>链上摘要</dt>
              <dd><code class="inline-code">{{ latestVerifyResult.chainDigest || '--' }}</code></dd>
            </div>
            <div>
              <dt>校验结果</dt>
              <dd>{{ formatBooleanLabel(latestVerifyResult.matched) }}</dd>
            </div>
            <div>
              <dt>校验时间</dt>
              <dd>{{ formatDateTime(latestVerifyResult.verifiedAt) }}</dd>
            </div>
            <div>
              <dt>校验说明</dt>
              <dd>{{ latestVerifyResult.verifyMessage || '后端已完成本次一致性校验。' }}</dd>
            </div>
          </div>
        </aside>
      </section>

      <section class="content-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <span class="page-chip">业务时间线</span>
              <h3>审批通过 → 上链 → 校验</h3>
            </div>
          </div>
          <div class="evidence-timeline">
            <div
              v-for="item in timelineItems"
              :key="item.title"
              class="timeline-item"
              :class="{ done: item.done, active: item.active, danger: item.danger }"
            >
              <span class="timeline-dot"></span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.desc }}</p>
              </div>
            </div>
          </div>
        </article>

        <aside v-if="canInvalidateRole" class="panel detail-panel">
          <div class="panel-header">
            <div>
              <span class="page-chip">管理员操作</span>
              <h3>{{ isReadOnly ? '只读状态' : '作废存证记录' }}</h3>
              <p>{{ isReadOnly ? '当前记录已作废，不再允许重复操作。' : '仅正式存证记录支持作废，待上链准备态不会显示可执行作废。' }}</p>
            </div>
          </div>

          <form class="form-grid" @submit.prevent="runInvalidate">
            <label class="field">
              <span>作废原因</span>
              <textarea
                v-model.trim="invalidateForm.reason"
                rows="5"
                :disabled="!canInvalidate"
                placeholder="请输入异常或误提交原因，例如“业务数据录入错误，需要重新存证”。"
              ></textarea>
            </label>
            <button class="ghost-button" type="submit" :disabled="invalidating || !canInvalidate || !invalidateForm.reason">
              {{ invalidating ? '提交中...' : isReadOnly ? '已作废' : '提交作废' }}
            </button>
          </form>
        </aside>
      </section>
    </template>
  </div>
</template>
