<script setup>
import AppPagination from './AppPagination.vue'
import {
  formatApprovalBusinessType,
  formatApprovalStatusLabel,
  formatDateTime,
  getTagClassByStatus,
} from '../utils/helpers'

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
</script>

<template>
  <section class="panel">
    <div class="table-meta">
      <span>审批记录列表</span>
      <span>{{ loading ? '正在加载审批记录...' : '支持审批历史分页与详情查看' }}</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>applicationNo</th>
          <th>businessType</th>
          <th>reviewerName</th>
          <th>status</th>
          <th>reviewedAt</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in records" :key="row.approvalId || row.applicationNo || row.reviewedAt">
          <td>{{ row.applicationNo || '--' }}</td>
          <td>{{ formatApprovalBusinessType(row.businessType) }}</td>
          <td>{{ row.reviewerName || '--' }}</td>
          <td>
            <span class="tag" :class="getTagClassByStatus(row.status)">
              {{ formatApprovalStatusLabel(row.status) }}
            </span>
          </td>
          <td>{{ formatDateTime(row.reviewedAt) }}</td>
          <td>
            <button class="text-button" type="button" @click="emit('detail', row)">查看详情</button>
          </td>
        </tr>
        <tr v-if="!records.length">
          <td colspan="6" class="empty-cell">当前筛选条件下暂无审批记录。</td>
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
