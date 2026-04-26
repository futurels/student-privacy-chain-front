<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { evidenceStore } from '../stores/evidence'
import { privacyStore } from '../stores/privacy'
import { router } from '../router'
import {
  buildRouteWithQuery,
  formatEvidenceTypeLabel,
  formatPrivacyDataType,
  formatPrivacyHandlingMode,
  formatPrivacyStatus,
  getPrivacySubmissionGate,
  getTagClassByStatus,
  resolvePrivacyEvidenceType,
  resolvePrivacyHandlingMode,
} from '../utils/helpers'
import { messageStore } from '../stores/message'

const query = computed(() => router.currentRoute.value.query)
const privacyDataId = computed(() => query.value.get('privacyDataId') || '')
const source = computed(() => query.value.get('source') || '')
const submitting = ref(false)
const refreshing = ref(false)
const detail = ref(null)

const form = reactive({
  evidenceType: 'STRUCTURED',
  description: '',
  confirmed: false,
})

const canSubmit = computed(() => Boolean(detail.value?.id && form.confirmed && !submitting.value))
const lockedEvidenceType = computed(() => resolvePrivacyEvidenceType(detail.value || {}))

const loadDetail = async (options = {}) => {
  const { silent = false } = options
  if (!privacyDataId.value) {
    detail.value = null
    if (!silent) {
      messageStore.warning('请先选择要提交的隐私数据。')
    }
    return null
  }

  refreshing.value = true
  try {
    detail.value = await privacyStore.loadDetail(privacyDataId.value)
    form.evidenceType = resolvePrivacyEvidenceType(detail.value)
    return detail.value
  } finally {
    refreshing.value = false
  }
}

const goBack = () => {
  if (source.value === 'p06') {
    router.navigate(buildRouteWithQuery('/files/manage', {
      privacyDataId: privacyDataId.value,
    }))
    return
  }

  router.navigate(buildRouteWithQuery('/privacy/detail', {
    id: privacyDataId.value,
  }))
}

const goList = () => {
  router.navigate(buildRouteWithQuery('/evidence/list', {
    tab: 'applications',
    privacyDataId: privacyDataId.value,
  }))
}

const submitApplication = async () => {
  const latest = await loadDetail({ silent: true })
  if (!latest?.id) {
    messageStore.warning('请先选择要提交的隐私数据。')
    return
  }

  const gate = getPrivacySubmissionGate(latest)
  if (!gate.canSubmit) {
    messageStore.warning(gate.message)
    return
  }

  if (!form.confirmed) {
    messageStore.info('请先勾选确认项，再提交存证申请。')
    return
  }

  submitting.value = true
  try {
    const result = await evidenceStore.submitApplication({
      privacyDataId: Number(latest.id),
      evidenceType: gate.evidenceType,
      description: form.description,
    })

    await loadDetail({ silent: true })
    router.navigate(buildRouteWithQuery('/evidence/list', {
      tab: 'applications',
      createdApplicationId: result.applicationId,
      createdApplicationNo: result.applicationNo,
      createdStatus: result.status,
      privacyDataId: latest.id,
    }))
  } finally {
    submitting.value = false
  }
}

watch(
  privacyDataId,
  async () => {
    await loadDetail({ silent: true })
  },
  { immediate: true },
)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P07</span>
          <h3>提交存证申请</h3>
          <p>基于当前隐私数据发起存证申请，提交前会先拉取最新详情，避免使用过期状态判断。</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="goBack">返回上一步</button>
          <button class="secondary-button" type="button" @click="goList">查看申请记录</button>
        </div>
      </div>

      <div v-if="detail" class="summary-grid">
        <div class="summary-card">
          <span>隐私数据ID</span>
          <strong>{{ detail.id }}</strong>
        </div>
        <div class="summary-card">
          <span>标题</span>
          <strong>{{ detail.title || '--' }}</strong>
        </div>
        <div class="summary-card">
          <span>数据类型</span>
          <strong>{{ formatPrivacyDataType(detail.dataType) }}</strong>
        </div>
        <div class="summary-card">
          <span>当前状态</span>
          <strong>
            <span class="tag" :class="getTagClassByStatus(detail.status)">
              {{ formatPrivacyStatus(detail.status) }}
            </span>
          </strong>
        </div>
        <div class="summary-card">
          <span>安全等级</span>
          <strong>{{ detail.securityLevel || '--' }}</strong>
        </div>
        <div class="summary-card">
          <span>附件数量</span>
          <strong>{{ detail.attachmentCount || detail.fileCount || 0 }}</strong>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">申请表单</span>
            <h3>{{ detail?.title || '当前隐私数据' }}</h3>
            <p>存证申请与隐私数据主记录绑定，不再依赖临时页面状态传参。</p>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="submitApplication">
          <label class="field">
            <span>隐私数据ID</span>
            <input :value="detail?.id || '--'" disabled />
          </label>

          <label class="field">
            <span>存证类型</span>
            <select v-model="form.evidenceType" disabled>
              <option value="STRUCTURED">结构化数据</option>
              <option value="FILE">附件文件</option>
            </select>
          </label>

          <label class="field">
            <span>申请说明</span>
            <textarea
              v-model.trim="form.description"
              rows="6"
              placeholder="请填写本次提交存证的用途说明，例如“用于共享校验与后续取证”。"
            ></textarea>
          </label>

          <label class="confirm-line">
            <input v-model="form.confirmed" type="checkbox" />
            <span>我已确认当前隐私数据、附件数量与存证类型无误，允许提交进入审核流程。</span>
          </label>

          <div class="action-row">
            <button class="primary-button" type="submit" :disabled="!canSubmit || refreshing">
              {{ submitting ? '提交中...' : '确认提交存证申请' }}
            </button>
          </div>
        </form>
      </article>

      <aside class="panel detail-panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">状态提示</span>
            <h3>提交前确认</h3>
          </div>
        </div>

        <div class="notice-card">
          <strong>当前可提交状态</strong>
          <p>{{ detail?.status ? getPrivacySubmissionGate(detail).message : '请先选择要提交的隐私数据。' }}</p>
        </div>

        <div class="notice-card">
          <strong>当前处理方式</strong>
          <p>{{ formatPrivacyHandlingMode(resolvePrivacyHandlingMode(detail || {})) }}</p>
        </div>

        <div class="notice-card">
          <strong>本次申请内容</strong>
          <p>存证类型：{{ formatEvidenceTypeLabel(lockedEvidenceType) }}</p>
          <p>关联附件：{{ detail?.attachmentCount || detail?.fileCount || 0 }} 个</p>
          <p>{{ resolvePrivacyHandlingMode(detail || {}) === 'STRUCTURED' ? '结构化数据不强制要求附件，内容完善即可提交。' : resolvePrivacyHandlingMode(detail || {}) === 'MIXED' ? '混合数据需要同时满足内容完善和附件已上传。' : '文件型数据必须先上传附件。' }}</p>
        </div>
      </aside>
    </section>
  </div>
</template>
