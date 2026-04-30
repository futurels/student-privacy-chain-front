<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AppPagination from '../components/AppPagination.vue'
import { accessLogsStore } from '../stores/accessLogs'
import { authorizationsStore } from '../stores/authorizations'
import { authStore } from '../stores/auth'
import { formatDateTime } from '../utils/helpers'
import { router } from '../router'

const query = computed(() => router.currentRoute.value.query)

const filters = reactive({
  pageNum: 1,
  pageSize: 10,
  studentId: '',
  privacyDataId: '',
})

const expireCheckLoading = ref(false)
const expireCheckResult = ref(null)

const records = computed(() => accessLogsStore.state.pageData.records)
const total = computed(() => accessLogsStore.state.pageData.total)
const showExpireCheckEntry = computed(() => authStore.hasRole('SYS_ADMIN'))

const stats = computed(() => ({
  total: total.value,
  success: records.value.filter((item) => item.result === 'SUCCESS').length,
  denied: records.value.filter((item) => ['DENIED', 'REJECTED'].includes(item.result)).length,
  failed: records.value.filter((item) => item.result === 'FAILED').length,
}))

function formatAccessResult(result) {
  const map = {
    SUCCESS: '访问成功',
    DENIED: '访问拒绝',
    REJECTED: '访问拒绝',
    FAILED: '访问失败',
  }
  return map[result] || result || '--'
}

function getResultClass(result) {
  if (result === 'SUCCESS') {
    return 'tag-green'
  }
  if (['DENIED', 'REJECTED', 'FAILED'].includes(result)) {
    return 'tag-red'
  }
  return 'tag-blue'
}

async function loadPage() {
  await accessLogsStore.loadPage(filters, { silent: true })
}

async function refreshPage() {
  filters.pageNum = 1
  await loadPage()
}

async function resetFilters() {
  Object.assign(filters, {
    pageNum: 1,
    pageSize: 10,
    studentId: '',
    privacyDataId: '',
  })
  await loadPage()
}

async function changePage(page) {
  filters.pageNum = page
  await loadPage()
}

async function triggerExpireCheck() {
  expireCheckLoading.value = true
  try {
    expireCheckResult.value = await authorizationsStore.triggerExpireCheck({ silent: true })
    await refreshPage()
  } finally {
    expireCheckLoading.value = false
  }
}

onMounted(async () => {
  filters.studentId = query.value.get('studentId') || ''
  filters.privacyDataId = query.value.get('privacyDataId') || ''
  await loadPage()
})
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P12</span>
          <h3>访问记录与联动验证</h3>
          <p>本页用于验证“查看授权数据 -> 写访问留痕 -> 撤销或到期后访问失败”的联动结果，支持按 studentId 与 privacyDataId 查询。</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="refreshPage">刷新记录</button>
        </div>
      </div>

      <div v-if="expireCheckResult" class="result-card result-good">
        <strong>到期授权回收触发完成</strong>
        <p>本次扫描 {{ expireCheckResult.checkedCount || 0 }} 条，识别到期 {{ expireCheckResult.expiredCount || 0 }} 条，成功回收 {{ expireCheckResult.revokedCount || 0 }} 条。</p>
      </div>

      <form class="toolbar access-filter-grid" @submit.prevent="loadPage">
        <input v-model.trim="filters.studentId" placeholder="按 studentId 查询" />
        <input v-model.trim="filters.privacyDataId" placeholder="按 privacyDataId 查询" />
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetFilters">重置</button>
        </div>
      </form>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <span>记录总数</span>
        <strong>{{ stats.total }}</strong>
      </article>
      <article class="metric-card">
        <span>访问成功</span>
        <strong>{{ stats.success }}</strong>
      </article>
      <article class="metric-card">
        <span>访问拒绝</span>
        <strong>{{ stats.denied }}</strong>
      </article>
      <article class="metric-card">
        <span>访问失败</span>
        <strong>{{ stats.failed }}</strong>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="table-meta">
          <span>访问记录列表</span>
          <span>{{ accessLogsStore.loading.value ? '正在加载...' : `当前共 ${total} 条访问留痕` }}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>日志主键</th>
              <th>授权主键</th>
              <th>访问者</th>
              <th>隐私数据 ID</th>
              <th>访问时间</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in records" :key="row.logId">
              <td>{{ row.logId }}</td>
              <td>{{ row.authorizationId || '--' }}</td>
              <td>{{ row.accessorName || '--' }}</td>
              <td>{{ row.privacyDataId || '--' }}</td>
              <td>{{ formatDateTime(row.accessTime) }}</td>
              <td>
                <span class="tag" :class="getResultClass(row.result)">
                  {{ formatAccessResult(row.result) }}
                </span>
              </td>
            </tr>
            <tr v-if="!records.length">
              <td colspan="6" class="empty-cell">当前没有符合条件的访问记录。</td>
            </tr>
          </tbody>
        </table>

        <AppPagination
          :page-num="filters.pageNum"
          :page-size="filters.pageSize"
          :total="total"
          @change="changePage"
        />
      </article>

      <aside class="panel detail-panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">联动提示</span>
            <h3>验证说明</h3>
          </div>
        </div>

        <div class="notice-card">
          <strong>当前查询范围</strong>
          <p>studentId：{{ filters.studentId || '未限定' }}</p>
          <p>privacyDataId：{{ filters.privacyDataId || '未限定' }}</p>
        </div>

        <div class="notice-card">
          <strong>验证路径</strong>
          <p>先到 P11 有效授权页签调用“查看授权数据”，确认成功写入访问留痕；再撤销授权或触发到期回收，回到本页刷新记录，观察访问结果是否变化。</p>
        </div>

        <div class="notice-card">
          <strong>结果解读</strong>
          <p>SUCCESS 表示访问通过；DENIED 或 REJECTED 通常表示授权已撤销、已到期或不再满足访问条件；FAILED 表示后端访问处理异常。</p>
        </div>

        <div v-if="showExpireCheckEntry" class="notice-card">
          <strong>管理端手工触发</strong>
          <p>当前账号可直接调用 API-46，对到期授权执行一次手工回收扫描，用于联调自动到期回收逻辑。</p>
          <div class="action-row">
            <button class="secondary-button" type="button" :disabled="expireCheckLoading" @click="triggerExpireCheck">
              {{ expireCheckLoading ? '触发中...' : '触发到期回收' }}
            </button>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>
