<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AuditLogDetailDrawer from '../components/AuditLogDetailDrawer.vue'
import AuditLogFilterForm from '../components/AuditLogFilterForm.vue'
import AuditLogTable from '../components/AuditLogTable.vue'
import { auditLogStore } from '../stores/auditLog'
import { createAuditLogFilters } from '../types/audit-log'

const filters = reactive(createAuditLogFilters())
const detailOpen = ref(false)
const detail = ref(null)

const records = computed(() => auditLogStore.state.pageData.records)
const total = computed(() => auditLogStore.state.pageData.total)

async function loadPage() {
  await auditLogStore.loadPage(filters, { silent: true })
}

async function submitFilters() {
  filters.pageNum = 1
  await loadPage()
}

async function resetFilters() {
  Object.assign(filters, createAuditLogFilters())
  await loadPage()
}

async function changePage(page) {
  filters.pageNum = page
  await loadPage()
}

async function openDetail(row) {
  detailOpen.value = true
  detail.value = null
  detail.value = await auditLogStore.loadDetail(row.logId, { silent: true })
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
          <span class="page-chip">P18</span>
          <h3>审计日志中心</h3>
          <p>本页只提供系统审计日志查询与详情查看，作为后续业务追溯详情的统一日志入口，不提前展开后续追溯与配置页面。</p>
        </div>
      </div>

      <AuditLogFilterForm
        :filters="filters"
        @submit="submitFilters"
        @reset="resetFilters"
      />
    </section>

    <AuditLogTable
      :records="records"
      :total="total"
      :page-num="filters.pageNum"
      :page-size="filters.pageSize"
      :loading="auditLogStore.loading.value"
      @detail="openDetail"
      @change-page="changePage"
    />

    <AuditLogDetailDrawer
      :open="detailOpen"
      :loading="auditLogStore.detailLoading.value"
      :detail="detail"
      @close="detailOpen = false"
    />
  </div>
</template>
