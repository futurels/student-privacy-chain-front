<script setup>
import AppPagination from './AppPagination.vue'
import { formatDateTime } from '../utils/helpers'

defineProps({
  records: {
    type: Array,
    default: () => [],
  },
  total: {
    type: Number,
    default: 0,
  },
  pageNum: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['detail', 'change-page'])

function formatAuditResult(result) {
  const map = {
    SUCCESS: '成功',
    FAILED: '失败',
    DENIED: '拒绝',
  }
  return map[result] || result || '--'
}

function getAuditResultClass(result) {
  if (result === 'SUCCESS') {
    return 'tag-green'
  }
  if (['FAILED', 'DENIED'].includes(result)) {
    return 'tag-red'
  }
  return 'tag-blue'
}
</script>

<template>
  <section class="panel">
    <div class="table-meta">
      <span>审计日志列表</span>
      <span>{{ loading ? '正在加载审计日志...' : '仅提供日志查询与详情查看' }}</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>logId</th>
          <th>operatorName</th>
          <th>action</th>
          <th>businessType</th>
          <th>businessId</th>
          <th>result</th>
          <th>occurredAt</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in records" :key="row.logId || row.occurredAt">
          <td>{{ row.logId || '--' }}</td>
          <td>{{ row.operatorName || '--' }}</td>
          <td>{{ row.action || '--' }}</td>
          <td>{{ row.businessType || '--' }}</td>
          <td>{{ row.businessId || '--' }}</td>
          <td>
            <span class="tag" :class="getAuditResultClass(row.result)">
              {{ formatAuditResult(row.result) }}
            </span>
          </td>
          <td>{{ formatDateTime(row.occurredAt) }}</td>
          <td>
            <button class="text-button" type="button" @click="emit('detail', row)">查看详情</button>
          </td>
        </tr>
        <tr v-if="!records.length">
          <td colspan="8" class="empty-cell">当前筛选条件下暂无审计日志。</td>
        </tr>
      </tbody>
    </table>

    <AppPagination
      :page-num="pageNum"
      :page-size="pageSize"
      :total="total"
      @change="emit('change-page', $event)"
    />
  </section>
</template>
