<script setup>
import { reactive } from 'vue'
import { router } from '../router'
import AttachmentManager from '../components/AttachmentManager.vue'

const context = reactive({
  id: router.currentRoute.value.query.get('id') || '',
  studentId: router.currentRoute.value.query.get('studentId') || '',
  dataType: router.currentRoute.value.query.get('dataType') || '',
  securityLevel: router.currentRoute.value.query.get('securityLevel') || '',
  title: router.currentRoute.value.query.get('title') || '隐私数据详情',
  contentDigest: router.currentRoute.value.query.get('contentDigest') || '',
  attachmentCount: router.currentRoute.value.query.get('attachmentCount') || '0',
  status: router.currentRoute.value.query.get('status') || '',
})

const goEdit = () => {
  router.navigate(`/privacy/edit?id=${context.id}&studentId=${context.studentId}&dataType=${context.dataType}&securityLevel=${context.securityLevel}`)
}
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P04</span>
          <h3>{{ context.title }}</h3>
          <p>第四阶段已接入附件区域，存证申请与授权申请仍保持占位状态。</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="router.navigate('/files/manage')">返回</button>
          <button class="secondary-button" type="button" @click="goEdit">编辑</button>
        </div>
      </div>

      <div class="detail-grid">
        <div>
          <dt>数据主键</dt>
          <dd>{{ context.id || '--' }}</dd>
        </div>
        <div>
          <dt>学生主键</dt>
          <dd>{{ context.studentId || '--' }}</dd>
        </div>
        <div>
          <dt>数据类型</dt>
          <dd>{{ context.dataType || '--' }}</dd>
        </div>
        <div>
          <dt>安全等级</dt>
          <dd>{{ context.securityLevel || '--' }}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>{{ context.status || '--' }}</dd>
        </div>
        <div>
          <dt>附件数量</dt>
          <dd>{{ context.attachmentCount }}</dd>
        </div>
        <div>
          <dt>内容摘要</dt>
          <dd><code class="inline-code">{{ context.contentDigest || '--' }}</code></dd>
        </div>
      </div>

      <div class="action-row top-gap">
        <button class="primary-button" type="button" disabled>提交存证申请</button>
        <button class="secondary-button" type="button" disabled>发起授权申请</button>
      </div>
    </section>

    <AttachmentManager
      title="隐私数据详情中的附件区域"
      :student-id="context.studentId"
      :data-type="context.dataType"
      :security-level="context.securityLevel"
      :readonly="false"
    />
  </div>
</template>
