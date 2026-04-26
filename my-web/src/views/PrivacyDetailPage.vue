<script setup>
import { computed, ref, watch } from 'vue'
import { router } from '../router'
import { privacyStore } from '../stores/privacy'
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
const privacyDataId = computed(() => route.value.query.get('id') || '')
const detail = ref(null)
const refreshing = ref(false)

const refreshDetail = async (options = {}) => {
  const { silent = false } = options
  if (!privacyDataId.value) {
    detail.value = null
    if (!silent) {
      messageStore.warning('请先选择要查看的隐私数据。')
    }
    return null
  }

  refreshing.value = true
  try {
    detail.value = await privacyStore.loadDetail(privacyDataId.value)
    return detail.value
  } finally {
    refreshing.value = false
  }
}

const goBack = () => {
  router.navigate('/privacy/list')
}

const goEdit = async () => {
  const latest = await refreshDetail({ silent: true })
  if (!latest?.id) {
    messageStore.warning('当前隐私数据详情尚未加载完成，请稍后重试。')
    return
  }
  router.navigate(buildRouteWithQuery('/privacy/edit', { id: privacyDataId.value }))
}

const goWorkspace = async () => {
  const latest = await refreshDetail({ silent: true })
  if (!latest?.id) {
    messageStore.warning('当前隐私数据详情尚未加载完成，请稍后重试。')
    return
  }
  router.navigate(buildRouteWithQuery('/files/manage', { privacyDataId: privacyDataId.value }))
}

const goEvidenceApply = async () => {
  const latest = await refreshDetail({ silent: true })
  if (!latest?.id) {
    messageStore.warning('当前隐私数据详情尚未加载完成，请稍后重试。')
    return
  }

  const gate = getPrivacySubmissionGate(latest)
  if (!gate.canSubmit) {
    messageStore.info(gate.message)
    return
  }

  router.navigate(buildRouteWithQuery('/evidence/apply', {
    privacyDataId: privacyDataId.value,
    source: 'p04',
  }))
}

const goApplications = () => {
  router.navigate(buildRouteWithQuery('/evidence/list', {
    tab: 'applications',
    privacyDataId: privacyDataId.value,
  }))
}

const goRecords = () => {
  router.navigate(buildRouteWithQuery('/evidence/list', {
    tab: 'evidences',
    privacyDataId: privacyDataId.value,
  }))
}

watch(
  privacyDataId,
  async () => {
    await refreshDetail({ silent: true })
  },
  { immediate: true },
)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P04</span>
          <h3>{{ detail?.title || '隐私数据详情' }}</h3>
          <p>围绕当前隐私数据查看状态、继续完善内容、进入附件工作区，并从这里分发到存证申请与记录页面。</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="goBack">返回列表</button>
          <button class="secondary-button" type="button" :disabled="refreshing" @click="goEdit">继续完善</button>
          <button class="secondary-button" type="button" :disabled="refreshing" @click="goWorkspace">管理附件</button>
          <button class="primary-button" type="button" :disabled="refreshing" @click="goEvidenceApply">提交存证申请</button>
        </div>
      </div>

      <div v-if="detail" class="content-grid">
        <article class="panel detail-panel">
          <div class="panel-header">
            <div>
              <span class="page-chip">基础信息</span>
              <h3>数据摘要</h3>
            </div>
          </div>

          <dl class="detail-grid">
            <div>
              <dt>隐私数据ID</dt>
              <dd>{{ detail.id }}</dd>
            </div>
            <div>
              <dt>学生主键</dt>
              <dd>{{ detail.studentId || '--' }}</dd>
            </div>
            <div>
              <dt>数据类型</dt>
              <dd>{{ formatPrivacyDataType(detail.dataType) }}</dd>
            </div>
            <div>
              <dt>安全等级</dt>
              <dd>{{ detail.securityLevel || '--' }}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>
                <span class="tag" :class="getTagClassByStatus(detail.status)">
                  {{ formatPrivacyStatus(detail.status) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>附件数量</dt>
              <dd>{{ detail.attachmentCount || detail.fileCount || 0 }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ formatDateTime(detail.updatedAt || detail.updateTime || detail.createdAt || detail.createTime) }}</dd>
            </div>
          </dl>
        </article>

        <aside class="panel detail-panel">
          <div class="panel-header">
            <div>
              <span class="page-chip">业务动作</span>
              <h3>后续处理</h3>
            </div>
          </div>

          <div class="notice-card">
            <strong>当前状态</strong>
            <p>{{ formatPrivacyStatus(detail.status) }}</p>
            <p>{{ detail.status ? getPrivacySubmissionGate(detail).message : '请先加载隐私数据详情。' }}</p>
          </div>

          <div class="notice-card">
            <strong>当前处理方式</strong>
            <p>{{ formatPrivacyHandlingMode(resolvePrivacyHandlingMode(detail)) }}</p>
          </div>

          <div class="notice-card">
            <strong>数据内容</strong>
            <p>{{ detail.content || '暂无结构化内容' }}</p>
          </div>

          <div class="notice-card">
            <strong>提交规则</strong>
            <p>{{ resolvePrivacyHandlingMode(detail) === 'STRUCTURED' ? '当前属于结构化数据，内容完善后即可直接提交存证申请。' : resolvePrivacyHandlingMode(detail) === 'MIXED' ? '当前属于混合数据，既要完善内容，也要先上传附件。' : '当前属于文件型数据，提交存证前请先上传至少一个附件。' }}</p>
          </div>

          <div class="action-row">
            <button class="secondary-button" type="button" @click="goApplications">查看申请</button>
            <button class="secondary-button" type="button" @click="goRecords">查看记录</button>
          </div>
        </aside>
      </div>

      <div v-else class="empty-block">正在加载隐私数据详情...</div>
    </section>
  </div>
</template>
