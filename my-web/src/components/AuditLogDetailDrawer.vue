<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  detail: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

function formatAuditResult(result) {
  const map = {
    SUCCESS: '成功',
    FAILED: '失败',
    DENIED: '拒绝',
  }
  return map[result] || result || '--'
}
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="drawer-mask" @click.self="emit('close')">
      <aside class="drawer-panel">
        <header class="drawer-header">
          <div>
            <span class="page-chip">P18 详情</span>
            <h3>审计日志详情</h3>
            <p>只展示日志记录本身，为后续业务追溯详情保留统一入口。</p>
          </div>
          <button class="ghost-button" type="button" @click="emit('close')">关闭</button>
        </header>

        <div class="drawer-body">
          <div v-if="loading" class="empty-block">正在加载审计日志详情...</div>

          <dl v-else-if="detail" class="detail-grid">
            <div>
              <dt>logId</dt>
              <dd>{{ detail.logId || '--' }}</dd>
            </div>
            <div>
              <dt>operatorId</dt>
              <dd>{{ detail.operatorId || '--' }}</dd>
            </div>
            <div>
              <dt>operatorName</dt>
              <dd>{{ detail.operatorName || '--' }}</dd>
            </div>
            <div>
              <dt>action</dt>
              <dd>{{ detail.action || '--' }}</dd>
            </div>
            <div>
              <dt>businessType</dt>
              <dd>{{ detail.businessType || '--' }}</dd>
            </div>
            <div>
              <dt>businessId</dt>
              <dd>{{ detail.businessId || '--' }}</dd>
            </div>
            <div>
              <dt>ip</dt>
              <dd>{{ detail.ip || '--' }}</dd>
            </div>
            <div>
              <dt>result</dt>
              <dd>{{ formatAuditResult(detail.result) }}</dd>
            </div>
            <div class="approval-detail-full">
              <dt>detail</dt>
              <dd>{{ detail.detail || '--' }}</dd>
            </div>
          </dl>

          <div v-else class="empty-block">暂无审计日志详情。</div>
        </div>
      </aside>
    </div>
  </teleport>
</template>
