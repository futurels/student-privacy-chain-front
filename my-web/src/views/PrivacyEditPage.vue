<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { router } from '../router'
import { authStore } from '../stores/auth'
import { messageStore } from '../stores/message'
import { privacyStore } from '../stores/privacy'
import {
  buildRouteWithQuery,
  formatPrivacyDataType,
  formatPrivacyHandlingMode,
  formatPrivacyStatus,
  resolvePrivacyHandlingMode,
} from '../utils/helpers'

const route = computed(() => router.currentRoute.value)
const currentId = computed(() => route.value.query.get('id') || '')
const saving = ref(false)
const currentStatus = ref('')

const isStudent = computed(() => authStore.hasRole('STUDENT'))
const isTeachingAdmin = computed(() => authStore.hasRole('TEACHING_ADMIN'))
const currentStudentProfileId = computed(() => authStore.user.value?.studentProfileId || null)

const form = reactive({
  studentId: '',
  dataType: '',
  title: '',
  content: '',
  securityLevel: '',
})

const isEdit = computed(() => Boolean(currentId.value))

const fillForm = (detail) => {
  form.studentId = detail.studentId ? String(detail.studentId) : ''
  form.dataType = detail.dataType || ''
  form.title = detail.title || ''
  form.content = detail.content || ''
  form.securityLevel = detail.securityLevel || ''
  currentStatus.value = detail.status || ''
}

const resetForm = () => {
  form.studentId = isStudent.value && currentStudentProfileId.value ? String(currentStudentProfileId.value) : ''
  form.dataType = ''
  form.title = ''
  form.content = ''
  form.securityLevel = ''
  currentStatus.value = ''
}

const loadDetail = async () => {
  if (!currentId.value) {
    resetForm()
    return
  }

  const detail = await privacyStore.loadDetail(currentId.value)
  if (detail) {
    fillForm(detail)
  }
}

const buildCreatePayload = () => {
  const payload = {
    dataType: form.dataType,
    title: form.title,
    content: form.content,
    securityLevel: form.securityLevel,
  }

  if (isStudent.value) {
    if (currentStudentProfileId.value || form.studentId) {
      payload.studentId = Number(currentStudentProfileId.value || form.studentId)
    }
    return payload
  }

  if (form.studentId) {
    payload.studentId = Number(form.studentId)
  }

  return payload
}

const buildUpdatePayload = () => ({
  title: form.title,
  content: form.content,
  securityLevel: form.securityLevel,
})

const save = async (toWorkspace = false) => {
  if (!isEdit.value && isStudent.value && !currentStudentProfileId.value) {
    messageStore.warning('当前未获取到本人学生档案标识，请重新登录后重试。')
    return
  }

  saving.value = true
  try {
    let result
    if (isEdit.value) {
      result = await privacyStore.update(currentId.value, buildUpdatePayload())
    } else {
      result = await privacyStore.create(buildCreatePayload())
    }

    const targetId = result?.id || currentId.value
    const latestDetail = await privacyStore.loadDetail(targetId)
    if (latestDetail) {
      fillForm(latestDetail)
    }

    if (toWorkspace) {
      router.navigate(buildRouteWithQuery('/files/manage', { privacyDataId: targetId }))
      return
    }

    router.navigate(buildRouteWithQuery('/privacy/detail', { id: targetId }))
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  if (isEdit.value) {
    router.navigate(buildRouteWithQuery('/privacy/detail', { id: currentId.value }))
    return
  }
  router.navigate('/privacy/list')
}

watch(
  currentId,
  async () => {
    await loadDetail()
  },
  { immediate: true },
)

watch(
  currentStudentProfileId,
  (studentProfileId) => {
    if (!isEdit.value && isStudent.value) {
      form.studentId = studentProfileId ? String(studentProfileId) : ''
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P05</span>
          <h3>{{ isEdit ? '编辑隐私数据' : '新建隐私数据' }}</h3>
          <p>先完成隐私数据本身的维护，再进入附件工作区或提交存证申请，避免在一个页面里堆叠所有动作。</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="goBack">返回</button>
          <button class="secondary-button" type="button" :disabled="saving" @click="save(false)">
            {{ saving ? '保存中...' : '保存并查看详情' }}
          </button>
          <button class="primary-button" type="button" :disabled="saving" @click="save(true)">
            {{ saving ? '保存中...' : '保存并管理附件' }}
          </button>
        </div>
      </div>

      <div v-if="isEdit" class="summary-grid">
        <div class="summary-card">
          <span>隐私数据ID</span>
          <strong>{{ currentId }}</strong>
        </div>
        <div class="summary-card">
          <span>数据类型</span>
          <strong>{{ formatPrivacyDataType(form.dataType) }}</strong>
        </div>
        <div class="summary-card">
          <span>当前状态</span>
          <strong>{{ formatPrivacyStatus(currentStatus) }}</strong>
        </div>
      </div>

      <div class="notice-card">
        <strong>提交流程提示</strong>
        <p>{{ resolvePrivacyHandlingMode({ dataType: form.dataType }) === 'STRUCTURED' ? '当前数据类型按结构化数据处理。内容完善后可直接进入 P07 提交存证申请，不强制要求附件。' : resolvePrivacyHandlingMode({ dataType: form.dataType }) === 'MIXED' ? '当前数据类型按混合数据处理。提交前需要同时完善内容并上传附件。' : '当前数据类型按文件型处理。保存后请前往 P06 上传至少一个附件，再提交存证申请。' }}</p>
      </div>

      <div class="notice-card">
        <strong>当前处理方式</strong>
        <p>{{ form.dataType ? formatPrivacyHandlingMode(resolvePrivacyHandlingMode({ dataType: form.dataType })) : '请先选择数据类型，页面会自动决定处理方式。' }}</p>
      </div>

      <div v-if="isStudent" class="notice-card">
        <strong>当前归属</strong>
        <p>{{ currentStudentProfileId ? `当前登录学生档案ID：${currentStudentProfileId}，新建数据将自动归属于本人。` : '当前登录身份为学生，保存时会自动归属于本人，无需手工填写所属学生。' }}</p>
      </div>

      <form class="form-grid" @submit.prevent="save(false)">
        <label v-if="isTeachingAdmin" class="field">
          <span>所属学生档案ID</span>
          <input v-model.trim="form.studentId" required placeholder="请输入学生档案ID" />
        </label>
        <label class="field">
          <span>数据类型</span>
          <select v-model="form.dataType" required>
            <option value="">请选择数据类型</option>
            <option value="IDENTITY">身份信息</option>
            <option value="GRADE">成绩信息</option>
            <option value="STATUS">学籍状态</option>
            <option value="HEALTH_REPORT">健康报告</option>
          </select>
        </label>
        <label class="field">
          <span>安全等级</span>
          <select v-model="form.securityLevel" required>
            <option value="">请选择安全等级</option>
            <option value="S1">S1</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
          </select>
        </label>
        <label class="field">
          <span>标题</span>
          <input v-model.trim="form.title" required />
        </label>
        <label class="field">
          <span>内容</span>
          <textarea v-model.trim="form.content" rows="8" placeholder="请输入结构化隐私数据内容"></textarea>
        </label>
      </form>
    </section>
  </div>
</template>
