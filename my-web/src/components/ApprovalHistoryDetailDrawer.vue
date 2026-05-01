<script setup>
import {
  formatApprovalBusinessType,
  formatApprovalStatusLabel,
  formatDateTime,
} from '../utils/helpers'

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
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="drawer-mask" @click.self="emit('close')">
      <aside class="drawer-panel">
        <header class="drawer-header">
          <div>
            <span class="page-chip">审批详情</span>
            <h3>审批记录详情</h3>
            <p>只展示审批记录本身，不展开后续业务追溯页面。</p>
          </div>
          <button class="ghost-button" type="button" @click="emit('close')">关闭</button>
        </header>

        <div class="drawer-body">
          <div v-if="loading" class="empty-block">正在加载审批记录详情...</div>

          <dl v-else-if="detail" class="detail-grid">
            <div>
              <dt>approvalId</dt>
              <dd>{{ detail.approvalId || '--' }}</dd>
            </div>
            <div>
              <dt>businessType</dt>
              <dd>{{ formatApprovalBusinessType(detail.businessType) }}</dd>
            </div>
            <div>
              <dt>businessId</dt>
              <dd>{{ detail.businessId || '--' }}</dd>
            </div>
            <div>
              <dt>reviewerId</dt>
              <dd>{{ detail.reviewerId || '--' }}</dd>
            </div>
            <div>
              <dt>reviewerName</dt>
              <dd>{{ detail.reviewerName || '--' }}</dd>
            </div>
            <div>
              <dt>status</dt>
              <dd>{{ formatApprovalStatusLabel(detail.status) }}</dd>
            </div>
            <div>
              <dt>reviewedAt</dt>
              <dd>{{ formatDateTime(detail.reviewedAt) }}</dd>
            </div>
            <div class="approval-detail-full">
              <dt>reviewComment</dt>
              <dd>{{ detail.reviewComment || '--' }}</dd>
            </div>
          </dl>

          <div v-else class="empty-block">暂无审批记录详情。</div>
        </div>
      </aside>
    </div>
  </teleport>
</template>
