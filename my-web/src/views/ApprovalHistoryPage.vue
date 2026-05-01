<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import ApprovalHistoryDetailDrawer from '../components/ApprovalHistoryDetailDrawer.vue'
import ApprovalHistoryFilterForm from '../components/ApprovalHistoryFilterForm.vue'
import ApprovalHistoryTable from '../components/ApprovalHistoryTable.vue'
import { approvalHistoryStore } from '../stores/approvalHistory'
import { createApprovalHistoryFilters } from '../types/approval'
import { formatApprovalBusinessType, formatApprovalStatusLabel } from '../utils/helpers'

const filters = reactive(createApprovalHistoryFilters())
const detailOpen = ref(false)
const detail = ref(null)

const records = computed(() => approvalHistoryStore.state.pageData.records)
const total = computed(() => approvalHistoryStore.state.pageData.total)

const stats = computed(() => ({
  total: total.value,
  approved: records.value.filter((item) => item.status === 'APPROVED').length,
  rejected: records.value.filter((item) => item.status === 'REJECTED').length,
}))

async function loadPage() {
  await approvalHistoryStore.loadPage(filters, { silent: true })
}

async function submitFilters() {
  filters.pageNum = 1
  await loadPage()
}

async function resetFilters() {
  Object.assign(filters, createApprovalHistoryFilters())
  await loadPage()
}

async function changePage(page) {
  filters.pageNum = page
  await loadPage()
}

async function openDetail(row) {
  detailOpen.value = true
  detail.value = null
  detail.value = await approvalHistoryStore.loadDetail(row.approvalId, { silent: true })
}

onMounted(async () => {
  await loadPage()
})
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P17</span>
          <h3>审批记录查询</h3>
          <p>作为审批历史统一入口，仅提供分页筛选和详情展示，为后续审计中心与业务追溯能力预留入口，不提前展开后续页面。</p>
        </div>
      </div>

      <ApprovalHistoryFilterForm
        :filters="filters"
        @submit="submitFilters"
        @reset="resetFilters"
      />
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <span>审批记录总数</span>
        <strong>{{ stats.total }}</strong>
      </article>
      <article class="metric-card">
        <span>已通过</span>
        <strong>{{ stats.approved }}</strong>
      </article>
      <article class="metric-card">
        <span>已驳回</span>
        <strong>{{ stats.rejected }}</strong>
      </article>
      <article class="metric-card">
        <span>当前筛选</span>
        <strong>
          {{ filters.businessType ? formatApprovalBusinessType(filters.businessType) : '全部业务' }}
          /
          {{ filters.status ? formatApprovalStatusLabel(filters.status) : '全部结果' }}
        </strong>
      </article>
    </section>

    <ApprovalHistoryTable
      :records="records"
      :total="total"
      :page-num="filters.pageNum"
      :page-size="filters.pageSize"
      :loading="approvalHistoryStore.loading.value"
      @detail="openDetail"
      @change-page="changePage"
    />

    <ApprovalHistoryDetailDrawer
      :open="detailOpen"
      :loading="approvalHistoryStore.detailLoading.value"
      :detail="detail"
      @close="detailOpen = false"
    />
  </div>
</template>
