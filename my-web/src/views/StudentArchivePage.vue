<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { privacyStore } from '../stores/privacy'
import { authorizationsStore } from '../stores/authorizations'
import { accessLogsStore } from '../stores/accessLogs'
import {
  buildRouteWithQuery,
  formatAuthorizationStatus,
  formatAuthorizationTargetType,
  formatDateTime,
  formatPrivacyDataType,
  formatPrivacyStatusForDisplay,
  getTagClassByStatus,
} from '../utils/helpers'
import { router } from '../router'

const route = computed(() => router.currentRoute.value)

const filters = reactive({
  studentId: '',
  dataType: '',
})

const activeTab = ref('privacy')

const archive = computed(() => privacyStore.state.archive)
const studentInfo = computed(() => archive.value.studentInfo || {})
const privacyRecords = computed(() => archive.value.records || [])
const activeAuthorizations = computed(() => authorizationsStore.state.activePageData.records || [])
const accessRecords = computed(() => accessLogsStore.state.pageData.records || [])

function maskStudentNo(value) {
  const text = String(value || '')
  if (!text) {
    return '--'
  }
  if (text.length <= 4) {
    return `${text.slice(0, 1)}**`
  }
  return `${text.slice(0, 3)}****${text.slice(-2)}`
}

function formatAccessResult(result) {
  const map = {
    SUCCESS: '访问成功',
    DENIED: '访问拒绝',
    REJECTED: '访问拒绝',
    FAILED: '访问失败',
  }
  return map[result] || result || '--'
}

function getAccessResultClass(result) {
  if (result === 'SUCCESS') {
    return 'tag-green'
  }
  if (['DENIED', 'REJECTED', 'FAILED'].includes(result)) {
    return 'tag-red'
  }
  return 'tag-blue'
}

async function loadBundle() {
  if (!filters.studentId) {
    return
  }

  await Promise.allSettled([
    privacyStore.loadArchive(filters.studentId, { dataType: filters.dataType }, { silent: true }),
    authorizationsStore.loadActivePage({
      pageNum: 1,
      pageSize: 10,
      studentId: filters.studentId,
    }, { silent: true }),
    accessLogsStore.loadPage({
      pageNum: 1,
      pageSize: 10,
      studentId: filters.studentId,
    }, { silent: true }),
  ])
}

function switchTab(tab) {
  activeTab.value = tab
}

function openPrivacyDetail(row) {
  router.navigate(buildRouteWithQuery('/privacy/detail', { id: row.id }))
}

function goAuthorizationList() {
  router.navigate(buildRouteWithQuery('/authorization/list', {
    tab: 'active',
    studentId: filters.studentId,
  }))
}

onMounted(async () => {
  filters.studentId = route.value.query.get('studentId') || ''
  filters.dataType = route.value.query.get('dataType') || ''
  activeTab.value = route.value.query.get('tab') || 'privacy'
  if (filters.studentId) {
    await loadBundle()
  }
})
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P16</span>
          <h3>学生档案总览</h3>
          <p>本页只做基础版联动，补充授权与访问标签页，不做复杂统计和时间线。</p>
        </div>
      </div>

      <form class="toolbar archive-filter-grid" @submit.prevent="loadBundle">
        <input v-model.trim="filters.studentId" placeholder="请输入学生主键" />
        <select v-model="filters.dataType">
          <option value="">全部数据类型</option>
          <option value="IDENTITY">身份信息</option>
          <option value="GRADE">成绩信息</option>
          <option value="STATUS">学籍状态</option>
          <option value="HEALTH_REPORT">健康报告</option>
        </select>
        <div class="action-row">
          <button class="secondary-button" type="submit">查询档案</button>
        </div>
      </form>
    </section>

    <section class="summary-grid">
      <div class="summary-card">
        <span>学生主键</span>
        <strong>{{ studentInfo.studentId || filters.studentId || '--' }}</strong>
      </div>
      <div class="summary-card">
        <span>学号</span>
        <strong>{{ maskStudentNo(studentInfo.studentNo) }}</strong>
      </div>
      <div class="summary-card">
        <span>姓名</span>
        <strong>{{ studentInfo.studentName || '--' }}</strong>
      </div>
      <div class="summary-card">
        <span>隐私数据条数</span>
        <strong>{{ privacyRecords.length }}</strong>
      </div>
      <div class="summary-card">
        <span>有效授权条数</span>
        <strong>{{ activeAuthorizations.length }}</strong>
      </div>
      <div class="summary-card">
        <span>访问记录条数</span>
        <strong>{{ accessRecords.length }}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="tabs-row">
        <button class="tab-button" :class="{ active: activeTab === 'privacy' }" type="button" @click="switchTab('privacy')">
          隐私数据
        </button>
        <button class="tab-button" :class="{ active: activeTab === 'authorization' }" type="button" @click="switchTab('authorization')">
          有效授权
        </button>
        <button class="tab-button" :class="{ active: activeTab === 'access' }" type="button" @click="switchTab('access')">
          访问记录
        </button>
      </div>

      <div v-if="!filters.studentId" class="empty-block">请输入学生主键后再查看档案。</div>

      <template v-else>
        <table v-if="activeTab === 'privacy'" class="data-table">
          <thead>
            <tr>
              <th>隐私数据ID</th>
              <th>数据类型</th>
              <th>标题</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in privacyRecords" :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ formatPrivacyDataType(row.dataType) }}</td>
              <td>{{ row.title || '--' }}</td>
              <td>
                <span class="tag" :class="getTagClassByStatus(row.status)">
                  {{ formatPrivacyStatusForDisplay(row.status) }}
                </span>
              </td>
              <td>
                <button class="text-button" type="button" @click="openPrivacyDetail(row)">查看详情</button>
              </td>
            </tr>
            <tr v-if="!privacyRecords.length">
              <td colspan="5" class="empty-cell">当前学生档案下暂无隐私数据记录。</td>
            </tr>
          </tbody>
        </table>

        <table v-if="activeTab === 'authorization'" class="data-table">
          <thead>
            <tr>
              <th>授权主键</th>
              <th>隐私数据ID</th>
              <th>目标对象类型</th>
              <th>目标对象标识</th>
              <th>到期时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in activeAuthorizations" :key="row.authorizationId || `${row.privacyDataId}-${row.targetId}`">
              <td>{{ row.authorizationId || '--' }}</td>
              <td>{{ row.privacyDataId || '--' }}</td>
              <td>{{ formatAuthorizationTargetType(row.targetType) }}</td>
              <td>{{ row.targetId || '--' }}</td>
              <td>{{ formatDateTime(row.expireAt) }}</td>
              <td>
                <span class="tag tag-green">{{ formatAuthorizationStatus(row.status) }}</span>
              </td>
            </tr>
            <tr v-if="!activeAuthorizations.length">
              <td colspan="6" class="empty-cell">当前学生档案下暂无有效授权记录。</td>
            </tr>
          </tbody>
        </table>

        <table v-if="activeTab === 'access'" class="data-table">
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
            <tr v-for="row in accessRecords" :key="row.logId">
              <td>{{ row.logId }}</td>
              <td>{{ row.authorizationId || '--' }}</td>
              <td>{{ row.accessorName || '--' }}</td>
              <td>{{ row.privacyDataId || '--' }}</td>
              <td>{{ formatDateTime(row.accessTime) }}</td>
              <td>
                <span class="tag" :class="getAccessResultClass(row.result)">
                  {{ formatAccessResult(row.result) }}
                </span>
              </td>
            </tr>
            <tr v-if="!accessRecords.length">
              <td colspan="6" class="empty-cell">当前学生档案下暂无访问记录。</td>
            </tr>
          </tbody>
        </table>

        <div class="action-row top-gap">
          <button class="ghost-button" type="button" @click="goAuthorizationList">前往 P11 查看有效授权</button>
        </div>
      </template>
    </section>
  </div>
</template>
