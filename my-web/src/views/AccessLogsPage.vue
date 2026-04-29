<script setup>
import { computed, onMounted, reactive } from 'vue'
import AppPagination from '../components/AppPagination.vue'
import { accessLogsStore } from '../stores/accessLogs'
import { formatDateTime } from '../utils/helpers'
import { router } from '../router'

const query = computed(() => router.currentRoute.value.query)

const filters = reactive({
  pageNum: 1,
  pageSize: 10,
  studentId: '',
  privacyDataId: '',
})

const records = computed(() => accessLogsStore.state.pageData.records)
const total = computed(() => accessLogsStore.state.pageData.total)

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
          <h3>访问记录与通知</h3>
          <p>本页只对接访问留痕查询，支持按 studentId 与 privacyDataId 查看访问记录。</p>
        </div>
      </div>

      <form class="toolbar access-filter-grid" @submit.prevent="loadPage">
        <input v-model.trim="filters.studentId" placeholder="按学生主键筛选" />
        <input v-model.trim="filters.privacyDataId" placeholder="按隐私数据ID筛选" />
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
              <th>隐私数据ID</th>
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
            <span class="page-chip">访问提醒</span>
            <h3>说明与通知</h3>
          </div>
        </div>

        <div class="notice-card">
          <strong>当前查询范围</strong>
          <p>学生主键：{{ filters.studentId || '未限定' }}</p>
          <p>隐私数据ID：{{ filters.privacyDataId || '未限定' }}</p>
        </div>

        <div class="notice-card">
          <strong>使用说明</strong>
          <p>访问成功意味着后端已允许读取授权数据；访问拒绝或失败时，可结合授权状态进一步排查。</p>
        </div>

        <div class="notice-card">
          <strong>联动入口</strong>
          <p>如需从授权侧回看来源，可先到 P11 有效授权页签访问数据，再回到本页验证访问留痕是否生成。</p>
        </div>
      </aside>
    </section>
  </div>
</template>
