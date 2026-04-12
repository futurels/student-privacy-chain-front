<script setup>
import { reactive } from 'vue'
import AttachmentManager from '../components/AttachmentManager.vue'

const context = reactive({
  studentId: '',
  dataType: '',
  securityLevel: '',
})
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P06</span>
          <h3>文件上传与附件管理</h3>
          <p>本阶段仅实现文件上传、元数据、摘要、CID、预览与下载能力。</p>
        </div>
      </div>

      <form class="toolbar toolbar-files">
        <input v-model.trim="context.studentId" placeholder="请输入学生主键 studentId" />
        <select v-model="context.dataType">
          <option value="">请选择数据类型</option>
          <option value="IDENTITY">IDENTITY</option>
          <option value="GRADE">GRADE</option>
          <option value="STATUS">STATUS</option>
          <option value="HEALTH_REPORT">HEALTH_REPORT</option>
        </select>
        <select v-model="context.securityLevel">
          <option value="">请选择安全等级</option>
          <option value="S1">S1</option>
          <option value="S2">S2</option>
          <option value="S3">S3</option>
        </select>
      </form>
    </section>

    <AttachmentManager
      title="P06 附件管理工作区"
      :student-id="context.studentId"
      :data-type="context.dataType"
      :security-level="context.securityLevel"
    />
  </div>
</template>
