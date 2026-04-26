<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { evidenceStore } from '../stores/evidence'
import { authStore } from '../stores/auth'
import { messageStore } from '../stores/message'
import { router } from '../router'
import {
  buildRouteWithQuery,
  formatDateTime,
  formatEvidenceApplicationStatus,
  getTagClassByStatus,
  resolveEvidenceStatus,
} from '../utils/helpers'

const route = computed(() => router.currentRoute.value)
const query = computed(() => route.value.query)

const detail = ref(null)
const loading = ref(false)
const submitting = ref(false)
const actionResult = ref(null)
const redirecting = ref(false)
let redirectTimer = null

const reviewForm = reactive({
  reviewComment: '',
})

const templates = [
  '材料齐全，同意进入上链准备环节。',
  '数据来源清晰，建议通过。',
  '附件内容不完整，请补充后重新提交。',
]

const canReviewAction = computed(() => authStore.hasRole('COUNSELOR') || authStore.hasRole('TEACHING_ADMIN'))
const isReadOnlyView = computed(() => authStore.hasRole('SYS_ADMIN') && !canReviewAction.value)
const effectiveStatus = computed(() => detail.value?.status || actionResult.value?.status || query.value.get('status') || '')
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
const effectiveEvidenceId = computed(() => (
  resolveEvidenceIdentity(actionResult.value || {}) ||
  resolveEvidenceIdentity(detail.value || {}) ||
  ''
))
const evidenceStatus = computed(() => resolveEvidenceStatus({
  ...(detail.value || {}),
  ...(actionResult.value || {}),
  evidenceStatus: detail.value?.evidenceStatus || actionResult.value?.evidenceStatus || query.value.get('evidenceStatus') || '',
  status: detail.value?.status || actionResult.value?.status || query.value.get('status') || '',
}))
const isCompletedView = computed(() => (
  isReadOnlyView.value ||
  effectiveStatus.value === 'APPROVED' ||
  effectiveStatus.value === 'REJECTED'
))
const nextStepText = computed(() => {
  if (effectiveStatus.value === 'APPROVED') {
    return '下一步：待执行上链，可进入审批记录或存证详情继续跟进。'
  }
  if (effectiveStatus.value === 'REJECTED') {
    return '下一步：申请已进入审批记录，可返回关联隐私数据继续修改后重新提交。'
  }
  return '下一步：完成审核意见后，提交通过或驳回。'
})
const effectiveReviewedAt = computed(() => detail.value?.reviewedAt || actionResult.value?.reviewedAt || '')
const effectiveReviewerName = computed(() => detail.value?.reviewerName || authStore.user.value?.name || '--')
const effectiveReviewComment = computed(() => detail.value?.reviewComment || actionResult.value?.reviewComment || reviewForm.reviewComment || '--')

const loadDetail = async () => {
  const applicationId = query.value.get('id')
  if (!applicationId) {
    detail.value = null
    return
  }

  loading.value = true
  try {
    detail.value = await evidenceStore.loadApplicationDetail(applicationId)
    reviewForm.reviewComment = detail.value?.reviewComment || ''
  } finally {
    loading.value = false
  }
}

const clearRedirectTimer = () => {
  if (redirectTimer) {
    window.clearTimeout(redirectTimer)
    redirectTimer = null
  }
}

const goApprovalCenter = () => {
  router.navigate(buildRouteWithQuery('/approval/center', {
    refreshedAt: Date.now().toString(),
  }))
}

const goApprovalRecords = () => {
  router.navigate(buildRouteWithQuery('/approval/records', {
    refreshedAt: Date.now().toString(),
    status: effectiveStatus.value || '',
    privacyDataId: detail.value?.privacyDataId || query.value.get('privacyDataId') || '',
  }))
}

const goPrivacyDetail = () => {
  router.navigate(buildRouteWithQuery('/privacy/detail', {
    id: detail.value?.privacyDataId || query.value.get('privacyDataId') || '',
  }))
}

const queueAutoRedirect = () => {
  clearRedirectTimer()
  redirecting.value = true
  redirectTimer = window.setTimeout(() => {
    if ((actionResult.value?.status || detail.value?.status || effectiveStatus.value) === 'APPROVED') {
      goEvidenceDetailReplace()
      return
    }
    goApprovalRecords()
  }, 1200)
}

const approve = async () => {
  const applicationId = query.value.get('id')
  if (!applicationId) {
    messageStore.warning('缺少存证申请标识，无法执行审批。')
    return
  }
  if (!canReviewAction.value) {
    messageStore.info('当前角色仅可查看审批详情，不能执行通过或驳回。')
    return
  }
  if (isCompletedView.value) {
    messageStore.info('当前申请已完成审批，不能重复处理。')
    return
  }

  submitting.value = true
  try {
    actionResult.value = await evidenceStore.approveApplication(applicationId, {
      reviewComment: reviewForm.reviewComment,
    })
    await loadDetail()
    queueAutoRedirect()
  } finally {
    submitting.value = false
  }
}

const reject = async () => {
  const applicationId = query.value.get('id')
  if (!applicationId) {
    messageStore.warning('缺少存证申请标识，无法执行驳回。')
    return
  }
  if (!reviewForm.reviewComment) {
    messageStore.info('请先填写驳回原因。')
    return
  }
  if (!canReviewAction.value) {
    messageStore.info('当前角色仅可查看审批详情，不能执行通过或驳回。')
    return
  }
  if (isCompletedView.value) {
    messageStore.info('当前申请已完成审批，不能重复处理。')
    return
  }

  submitting.value = true
  try {
    actionResult.value = await evidenceStore.rejectApplication(applicationId, {
      reviewComment: reviewForm.reviewComment,
    })
    await loadDetail()
    queueAutoRedirect()
  } finally {
    submitting.value = false
  }
}

const goList = () => {
  const source = query.value.get('source')
  if (source) {
    router.navigate(buildRouteWithQuery(source, {
      refreshedAt: Date.now().toString(),
    }))
    return
  }

  if (authStore.hasRole('SYS_ADMIN') || authStore.hasRole('COUNSELOR') || authStore.hasRole('TEACHING_ADMIN')) {
    goApprovalCenter()
    return
  }

  router.navigate('/evidence/list')
}

const goEvidenceDetail = () => {
  router.navigate(buildRouteWithQuery('/evidence/detail', {
    id: effectiveEvidenceId.value,
    applicationId: detail.value?.applicationId || query.value.get('id'),
    applicationNo: detail.value?.applicationNo || query.value.get('applicationNo'),
    privacyDataId: detail.value?.privacyDataId || query.value.get('privacyDataId'),
    status: effectiveStatus.value,
    evidenceStatus: evidenceStatus.value || 'PENDING_CHAIN',
  }))
}

const goEvidenceDetailReplace = () => {
  router.navigate(buildRouteWithQuery('/evidence/detail', {
    id: effectiveEvidenceId.value,
    applicationId: detail.value?.applicationId || query.value.get('id'),
    applicationNo: detail.value?.applicationNo || query.value.get('applicationNo'),
    privacyDataId: detail.value?.privacyDataId || query.value.get('privacyDataId'),
    status: effectiveStatus.value,
    evidenceStatus: evidenceStatus.value || 'PENDING_CHAIN',
    fromApproval: '1',
  }), true)
}

onMounted(loadDetail)
onUnmounted(clearRedirectTimer)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P14</span>
          <h3>存证审批详情</h3>
          <p>以处理单条待审申请为目标；审批完成后页面会切换为已完成视图，并自动返回审批中心。</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="goList">返回列表</button>
          <button class="secondary-button" type="button" @click="goEvidenceDetail">进入存证详情</button>
        </div>
      </div>

      <div v-if="loading" class="empty-block">正在加载申请详情...</div>
      <div v-else class="summary-grid">
        <div class="summary-card">
          <span>申请主键</span>
          <strong>{{ detail?.applicationId || query.get('id') || '--' }}</strong>
        </div>
        <div class="summary-card">
          <span>申请编号</span>
          <strong>{{ detail?.applicationNo || query.get('applicationNo') || '--' }}</strong>
        </div>
        <div class="summary-card">
          <span>隐私数据主键</span>
          <strong>{{ detail?.privacyDataId || query.get('privacyDataId') || '--' }}</strong>
        </div>
        <div class="summary-card">
          <span>申请状态</span>
          <span class="tag" :class="getTagClassByStatus(effectiveStatus)">
            {{ formatEvidenceApplicationStatus(effectiveStatus) }}
          </span>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">申请核验</span>
            <h3>当前申请摘要</h3>
          </div>
        </div>

        <dl class="detail-grid">
          <div>
            <dt>申请编号</dt>
            <dd>{{ detail?.applicationNo || '--' }}</dd>
          </div>
          <div>
            <dt>隐私数据主键</dt>
            <dd>{{ detail?.privacyDataId || '--' }}</dd>
          </div>
          <div>
            <dt>审核人</dt>
            <dd>{{ effectiveReviewerName }}</dd>
          </div>
          <div>
            <dt>当前状态</dt>
            <dd>{{ formatEvidenceApplicationStatus(effectiveStatus) }}</dd>
          </div>
          <div>
            <dt>审核意见</dt>
            <dd>{{ effectiveReviewComment }}</dd>
          </div>
          <div v-if="effectiveReviewedAt">
            <dt>审批时间</dt>
            <dd>{{ formatDateTime(effectiveReviewedAt) }}</dd>
          </div>
        </dl>

        <div class="notice-card top-gap">
          <strong>{{ isCompletedView ? '处理结果' : isReadOnlyView ? '只读查看' : '审批提示' }}</strong>
          <p>{{ nextStepText }}</p>
        </div>

        <div v-if="isCompletedView" class="result-card result-good top-gap">
          <strong>当前待办已处理完成</strong>
          <p>审批结果：{{ formatEvidenceApplicationStatus(effectiveStatus) }}</p>
          <p>审批人：{{ effectiveReviewerName }}</p>
          <p v-if="effectiveReviewedAt">审批时间：{{ formatDateTime(effectiveReviewedAt) }}</p>
          <p>{{ redirecting ? (effectiveStatus === 'APPROVED' ? '正在跳转到存证详情，继续执行上链登记...' : '正在返回审批记录...') : '你也可以直接查看审批记录、关联隐私数据或业务追溯。' }}</p>
        </div>
      </article>

      <aside class="panel detail-panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">{{ canReviewAction && !isCompletedView ? '审批操作' : '后续处理' }}</span>
            <h3>{{ canReviewAction && !isCompletedView ? '填写审核意见' : '查看下一步' }}</h3>
          </div>
        </div>

        <form v-if="canReviewAction && !isCompletedView" class="form-grid" @submit.prevent="approve">
          <div class="template-row">
            <button
              v-for="item in templates"
              :key="item"
              class="mini-tag-button"
              type="button"
              @click="reviewForm.reviewComment = item"
            >
              {{ item }}
            </button>
          </div>

          <label class="field">
            <span>审核意见</span>
            <textarea
              v-model.trim="reviewForm.reviewComment"
              rows="6"
              placeholder="请输入审核意见；驳回时该项必填。"
            ></textarea>
          </label>

          <div class="action-row">
            <button class="primary-button" type="submit" :disabled="submitting || isCompletedView">
              {{ submitting ? '处理中...' : '审批通过' }}
            </button>
            <button
              class="danger-button"
              type="button"
              :disabled="submitting || !reviewForm.reviewComment || isCompletedView"
              @click="reject"
            >
              {{ submitting ? '处理中...' : '驳回申请' }}
            </button>
          </div>
        </form>

        <div v-else class="form-grid">
          <div v-if="isReadOnlyView && !isCompletedView" class="notice-card">
            <strong>当前角色无审批动作权限</strong>
            <p>你可以查看申请内容与审批结果；若需要执行通过或驳回，请使用辅导员或教务管理员账号进入。</p>
          </div>

          <div v-if="isCompletedView" class="notice-card">
            <strong>已切换为只读态</strong>
            <p>审批意见输入框和通过/驳回按钮已隐藏，避免重复提交同一条待办。</p>
          </div>

          <div class="action-row">
            <button class="secondary-button" type="button" @click="goApprovalRecords">查看审批记录</button>
            <button class="ghost-button" type="button" @click="goEvidenceDetail">
              {{ evidenceStatus === 'PENDING_CHAIN' ? '去执行上链登记' : evidenceStatus === 'CHAINED' ? '查看存证详情' : '查看业务追溯' }}
            </button>
            <button class="ghost-button" type="button" @click="goPrivacyDetail">查看关联隐私数据</button>
          </div>

          <div v-if="actionResult" class="result-card result-good">
            <strong>审批已提交</strong>
            <p>申请主键：{{ actionResult.applicationId }}</p>
            <p>处理状态：{{ formatEvidenceApplicationStatus(actionResult.status) }}</p>
            <p v-if="effectiveReviewedAt">处理时间：{{ formatDateTime(effectiveReviewedAt) }}</p>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>
