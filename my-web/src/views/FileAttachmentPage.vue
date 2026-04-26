<script setup>
import { computed, ref, watch } from 'vue'
import AttachmentManager from '../components/AttachmentManager.vue'
import { privacyStore } from '../stores/privacy'
import { evidenceStore } from '../stores/evidence'
import { router } from '../router'
import {
  buildRouteWithQuery,
  formatDateTime,
  formatPrivacyDataType,
  formatPrivacyHandlingMode,
  formatPrivacyStatus,
  getPrivacySubmissionGate,
  getTagClassByStatus,
  resolvePrivacyHandlingMode,
} from '../utils/helpers'
import { messageStore } from '../stores/message'

const route = computed(() => router.currentRoute.value)
const privacyDataId = computed(() => route.value.query.get('privacyDataId') || '')
const currentPrivacy = ref(null)
const refreshing = ref(false)
const submitting = ref(false)

const hasPrivacyContext = computed(() => Boolean(privacyDataId.value))
const hasLoadedPrivacy = computed(() => Boolean(currentPrivacy.value))
const workspaceMode = computed(() => (hasPrivacyContext.value ? 'existing-privacy' : 'unbound'))

const debugWorkspace = (stage, extra = {}) => {
  if (!import.meta.env.DEV) {
    return
  }
  console.debug('[P06 workspace]', stage, {
    privacyDataId: privacyDataId.value,
    hasPrivacyContext: hasPrivacyContext.value,
    hasLoadedPrivacy: hasLoadedPrivacy.value,
    currentPrivacyId: currentPrivacy.value?.id || '',
    ...extra,
  })
}

const refreshCurrentPrivacy = async (options = {}) => {
  const { silent = false } = options
  if (!privacyDataId.value) {
    currentPrivacy.value = null
    debugWorkspace('refresh-skip-no-context')
    if (!silent) {
      messageStore.warning('请先创建或选择隐私数据。')
    }
    return null
  }

  refreshing.value = true
  debugWorkspace('refresh-start')
  try {
    currentPrivacy.value = await privacyStore.loadDetail(privacyDataId.value)
    debugWorkspace('refresh-success', {
      loadedTitle: currentPrivacy.value?.title || '',
      loadedStatus: currentPrivacy.value?.status || '',
    })
    return currentPrivacy.value
  } catch (error) {
    debugWorkspace('refresh-failed', {
      message: error.message || 'unknown-error',
    })
    throw error
  } finally {
    refreshing.value = false
    debugWorkspace('refresh-finish')
  }
}

const goList = () => {
  router.navigate('/privacy/list')
}

const goCreate = () => {
  router.navigate('/privacy/edit')
}

const goEdit = async () => {
  if (!privacyDataId.value) {
    messageStore.warning('请先从隐私数据列表中选择一条数据。')
    return
  }
  await refreshCurrentPrivacy({ silent: true })
  router.navigate(buildRouteWithQuery('/privacy/edit', { id: privacyDataId.value }))
}

const goDetail = async () => {
  if (!privacyDataId.value) {
    messageStore.warning('请先从隐私数据列表中选择一条数据。')
    return
  }
  await refreshCurrentPrivacy({ silent: true })
  router.navigate(buildRouteWithQuery('/privacy/detail', { id: privacyDataId.value }))
}

const submitEvidenceFromWorkspace = async () => {
  if (!privacyDataId.value) {
    messageStore.warning('请先创建或选择隐私数据。')
    return
  }

  submitting.value = true
  try {
    const latest = await refreshCurrentPrivacy({ silent: true })
    if (!latest?.id) {
      messageStore.warning('当前隐私数据详情尚未加载完成，请稍后重试。')
      return
    }

    const gate = getPrivacySubmissionGate(latest)
    if (!gate.canSubmit) {
      messageStore.info(gate.message)
      return
    }

    const result = await evidenceStore.submitApplication({
      privacyDataId: Number(latest.id),
      evidenceType: gate.evidenceType,
      description: `${latest.title || `隐私数据 ${latest.id}`} 发起的存证申请`,
    })

    await refreshCurrentPrivacy({ silent: true })
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

const goEvidenceList = (tab = 'applications') => {
  if (!privacyDataId.value) {
    messageStore.warning('请先创建或选择隐私数据。')
    return
  }

  router.navigate(buildRouteWithQuery('/evidence/list', {
    tab,
    privacyDataId: privacyDataId.value,
  }))
}

watch(
  privacyDataId,
  async () => {
    await refreshCurrentPrivacy({ silent: true })
  },
  { immediate: true },
)
</script>

<template>
  <div class="page-stack p06-page">
    <section class="p06-header-lite">
      <div>
        <div class="page-chip">P06</div>
        <h3>文件上传与附件管理</h3>
        <p>{{ workspaceMode === 'existing-privacy'
          ? '当前页面正在为已有隐私数据补充附件。进入页面后会按 privacyDataId 重新拉取最新详情，上传成功后只刷新当前数据上下文。'
          : '当前未选定隐私数据。此入口不会执行上传，也不会伪装成当前数据附件工作区。请先从隐私数据列表、详情页或编辑页进入。' }}</p>
      </div>

      <div class="action-row">
        <button class="ghost-button" type="button" @click="goList">返回隐私数据列表</button>
        <button class="secondary-button" type="button" :disabled="!hasPrivacyContext" @click="goDetail">查看详情</button>
      </div>
    </section>

    <section v-if="!hasPrivacyContext" class="panel">
      <div class="empty-block">
        <strong>当前未选择隐私数据</strong>
        <p>P06 默认定位为“当前隐私数据的附件工作区”。没有 privacyDataId 时，本页不会上传文件，也不会创建新的隐私数据记录。</p>
      </div>
      <div class="notice-card">
        <strong>入口说明</strong>
        <p>如果你的目标是给已有隐私数据补充附件，请从 P03 的“管理附件”、P04 的“管理附件”或 P05 的“保存并管理附件”进入，本页会自动绑定到对应的 privacyDataId。</p>
      </div>
      <div class="action-row">
        <button class="secondary-button" type="button" @click="goList">前往我的隐私数据</button>
        <button class="primary-button" type="button" @click="goCreate">新建隐私数据</button>
      </div>
    </section>

    <template v-else>
      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="page-chip">当前工作对象</div>
            <h3>{{ currentPrivacy?.title || `隐私数据 ${privacyDataId}` }}</h3>
            <p>当前模式是“为已有隐私数据补充附件”。保存、上传附件、刷新元数据和生成 CID 后，页面只会自动同步这条隐私数据的最新状态。</p>
          </div>
          <div class="action-row">
            <button class="secondary-button" type="button" :disabled="refreshing" @click="goEdit">继续完善</button>
            <button class="primary-button" type="button" :disabled="submitting || refreshing || !privacyDataId" @click="submitEvidenceFromWorkspace">
              {{ submitting ? '提交中...' : '提交存证申请' }}
            </button>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>隐私数据ID</span>
            <strong>{{ currentPrivacy?.id || privacyDataId }}</strong>
          </div>
          <div class="summary-card">
            <span>标题</span>
            <strong>{{ currentPrivacy?.title || '--' }}</strong>
          </div>
          <div class="summary-card">
            <span>数据类型</span>
            <strong>{{ formatPrivacyDataType(currentPrivacy?.dataType) }}</strong>
          </div>
          <div class="summary-card">
            <span>状态</span>
            <strong>
              <span class="tag" :class="getTagClassByStatus(currentPrivacy?.status)">
                {{ formatPrivacyStatus(currentPrivacy?.status) }}
              </span>
            </strong>
          </div>
          <div class="summary-card">
            <span>安全等级</span>
            <strong>{{ currentPrivacy?.securityLevel || '--' }}</strong>
          </div>
          <div class="summary-card">
            <span>更新时间</span>
            <strong>{{ formatDateTime(currentPrivacy?.updatedAt || currentPrivacy?.updateTime || currentPrivacy?.createdAt || currentPrivacy?.createTime) }}</strong>
          </div>
        </div>

        <div v-if="!hasLoadedPrivacy" class="notice-card top-gap">
          <strong>正在同步当前数据详情</strong>
          <p>附件工作区保持可见，当前仅在后台刷新这条隐私数据的最新摘要与状态。</p>
        </div>

        <div class="action-row top-gap">
          <button class="secondary-button" type="button" @click="goEvidenceList('applications')">查看申请</button>
          <button class="secondary-button" type="button" @click="goEvidenceList('evidences')">查看记录</button>
        </div>

        <div class="notice-card top-gap">
          <strong>附件补充说明</strong>
          <p>当前上传动作会把文件挂接到隐私数据ID {{ currentPrivacy?.id || privacyDataId }}，不会切换到新的隐私数据上下文。</p>
        </div>

        <div class="notice-card top-gap">
          <strong>当前处理方式</strong>
          <p>{{ formatPrivacyHandlingMode(resolvePrivacyHandlingMode(currentPrivacy || {})) }}</p>
        </div>

        <div class="notice-card top-gap">
          <strong>提交规则</strong>
          <p>{{ resolvePrivacyHandlingMode(currentPrivacy || {}) === 'STRUCTURED'
            ? '当前属于结构化数据，内容完善后即可直接提交存证申请，不强制要求附件。'
            : resolvePrivacyHandlingMode(currentPrivacy || {}) === 'MIXED'
              ? '当前属于混合数据，既要完善内容，也要先上传附件。'
              : '当前属于文件型数据，提交存证前请先上传至少一个附件。' }}</p>
        </div>
      </section>

      <AttachmentManager
        title="当前隐私数据的附件工作区"
        :privacy-data-id="currentPrivacy?.id || privacyDataId"
        :privacy-title="currentPrivacy?.title || ''"
        :privacy-status="formatPrivacyStatus(currentPrivacy?.status)"
        :student-id="currentPrivacy?.studentId || ''"
        :data-type="currentPrivacy?.dataType || ''"
        :security-level="currentPrivacy?.securityLevel || ''"
        @files-updated="refreshCurrentPrivacy({ silent: true })"
      />
    </template>
  </div>
</template>
