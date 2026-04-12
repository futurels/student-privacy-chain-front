<script setup>
import { reactive, ref } from 'vue'
import { router } from '../router'
import AttachmentManager from '../components/AttachmentManager.vue'
import { messageStore } from '../stores/message'

const form = reactive({
  studentId: router.currentRoute.value.query.get('studentId') || '',
  dataType: router.currentRoute.value.query.get('dataType') || '',
  title: router.currentRoute.value.query.get('title') || '',
  content: '',
  securityLevel: router.currentRoute.value.query.get('securityLevel') || '',
})

const step = ref(1)

const next = () => {
  step.value = Math.min(3, step.value + 1)
}

const previous = () => {
  step.value = Math.max(1, step.value - 1)
}

const saveDraft = () => {
  messageStore.info('第四阶段重点是附件联调，基础表单提交在当前工作区仍为占位状态。')
}
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P05</span>
          <h3>新增/编辑隐私数据</h3>
          <p>分步表单保持简洁，第三步接入附件上传、元数据和文件状态管理。</p>
        </div>
      </div>

      <div class="stepper">
        <div class="step-item" :class="{ active: step >= 1 }">1. 基础信息</div>
        <div class="step-item" :class="{ active: step >= 2 }">2. 内容填写</div>
        <div class="step-item" :class="{ active: step >= 3 }">3. 附件管理</div>
      </div>

      <form class="form-grid" @submit.prevent="saveDraft">
        <template v-if="step === 1">
          <label class="field">
            <span>学生主键 studentId</span>
            <input v-model.trim="form.studentId" required />
          </label>
          <label class="field">
            <span>数据类型 dataType</span>
            <select v-model="form.dataType" required>
              <option value="">请选择数据类型</option>
              <option value="IDENTITY">IDENTITY</option>
              <option value="GRADE">GRADE</option>
              <option value="STATUS">STATUS</option>
              <option value="HEALTH_REPORT">HEALTH_REPORT</option>
            </select>
          </label>
          <label class="field">
            <span>标题 title</span>
            <input v-model.trim="form.title" required />
          </label>
        </template>

        <template v-if="step === 2">
          <label class="field">
            <span>内容 content</span>
            <textarea v-model.trim="form.content" rows="8" placeholder="请输入结构化内容"></textarea>
          </label>
          <label class="field">
            <span>安全等级 securityLevel</span>
            <select v-model="form.securityLevel" required>
              <option value="">请选择安全等级</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
            </select>
          </label>
        </template>

        <template v-if="step === 3">
          <AttachmentManager
            title="新增/编辑页中的附件区域"
            :student-id="form.studentId"
            :data-type="form.dataType"
            :security-level="form.securityLevel"
          />
        </template>

        <div class="action-row">
          <button v-if="step > 1" class="ghost-button" type="button" @click="previous">上一步</button>
          <button v-if="step < 3" class="secondary-button" type="button" @click="next">下一步</button>
          <button v-if="step === 3" class="primary-button" type="submit">保存草稿占位</button>
        </div>
      </form>
    </section>
  </div>
</template>
