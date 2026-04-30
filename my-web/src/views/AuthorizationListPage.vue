<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AppDialog from '../components/AppDialog.vue'
import AppPagination from '../components/AppPagination.vue'
import { router } from '../router'
import { authStore } from '../stores/auth'
import { authorizationsStore } from '../stores/authorizations'
import {
  buildRouteWithQuery,
  formatAuthorizationStatus,
  formatAuthorizationTargetType,
  formatDateTime,
  getTagClassByStatus,
} from '../utils/helpers'

const route = computed(() => router.currentRoute.value)
const query = computed(() => route.value.query)
const activeTab = ref('applications')

const applicationFilters = reactive({
  pageNum: 1,
  pageSize: 10,
  privacyDataId: '',
  studentId: '',
  status: '',
  targetType: '',
})

const activeFilters = reactive({
  pageNum: 1,
  pageSize: 10,
  studentId: '',
  privacyDataId: '',
  targetType: '',
})

const historyFilters = reactive({
  pageNum: 1,
  pageSize: 10,
  studentId: '',
  status: '',
})

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

const accessOpen = ref(false)
const accessLoading = ref(false)
const accessDetail = ref(null)
const accessError = ref(null)
const accessSourceRow = ref(null)
const accessExpectedDenied = ref(false)

const revokeOpen = ref(false)
const revokeLoading = ref(false)
const revokeRow = ref(null)
const revokeForm = reactive({
  reason: '',
})

const applicationRecords = computed(() => authorizationsStore.state.pageData.records)
const applicationTotal = computed(() => authorizationsStore.state.pageData.total)
const activeRecords = computed(() => authorizationsStore.state.activePageData.records)
const activeTotal = computed(() => authorizationsStore.state.activePageData.total)
const historyRecords = computed(() => authorizationsStore.state.historyPageData.records)
const historyTotal = computed(() => authorizationsStore.state.historyPageData.total)
const revokeResult = computed(() => authorizationsStore.state.lastRevocationResult)

const createdReceipt = computed(() => {
  const applicationNo = query.value.get('createdApplicationNo') || ''
  if (!applicationNo) {
    return null
  }
  return {
    applicationId: query.value.get('createdApplicationId') || '--',
    applicationNo,
    status: query.value.get('createdStatus') || '--',
  }
})

const canAccessAuthorizedData = computed(() => authStore.hasAnyRole(['COUNSELOR', 'TEACHING_ADMIN']))
const canOpenAccessLogs = computed(() => authStore.hasAnyRole(['STUDENT', 'SYS_ADMIN']))
const canOpenArchive = computed(() => authStore.hasAnyRole(['COUNSELOR', 'TEACHING_ADMIN']))
const canRevokeAuthorization = computed(() => authStore.hasAnyRole(['STUDENT', 'TEACHING_ADMIN']))

const applicationStats = computed(() => ({
  total: applicationTotal.value,
  pending: applicationRecords.value.filter((item) => item.status === 'PENDING_REVIEW').length,
  approved: applicationRecords.value.filter((item) => item.status === 'APPROVED').length,
  rejected: applicationRecords.value.filter((item) => item.status === 'REJECTED').length,
}))

const activeStats = computed(() => ({
  total: activeTotal.value,
  active: activeRecords.value.filter((item) => item.status === 'ACTIVE').length,
  counselor: activeRecords.value.filter((item) => item.targetType === 'COUNSELOR').length,
  admin: activeRecords.value.filter((item) => item.targetType === 'TEACHING_ADMIN').length,
}))

const historyStats = computed(() => ({
  total: historyTotal.value,
  revoked: historyRecords.value.filter((item) => item.status === 'REVOKED').length,
  expired: historyRecords.value.filter((item) => item.status === 'EXPIRED').length,
  other: historyRecords.value.filter((item) => !['REVOKED', 'EXPIRED'].includes(item.status)).length,
}))

const accessFields = computed(() => {
  const source = accessDetail.value?.privacyData || {}
  return Object.entries(source).map(([key, value]) => ({
    key,
    label: ({
      id: '隐私数据主键',
      dataType: '数据类型',
      title: '标题',
      maskedContent: '脱敏内容',
    })[key] || key,
    value: formatAccessValue(key, value),
  }))
})

function maskMiddle(value) {
  const text = String(value || '')
  if (!text) {
    return '--'
  }
  if (text.length <= 4) {
    return `${text.slice(0, 1)}**`
  }
  return `${text.slice(0, 2)}***${text.slice(-2)}`
}

function formatAccessValue(key, value) {
  if (value === undefined || value === null || value === '') {
    return '--'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  if (key === 'maskedContent') {
    return value
  }
  if (['id', 'dataType', 'title'].includes(key)) {
    return value
  }
  return maskMiddle(value)
}

function getAuthorizationTagClass(status) {
  if (status === 'ACTIVE') {
    return 'tag-green'
  }
  return getTagClassByStatus(status)
}

function resolveStudentId(row = {}) {
  return row.studentId || activeFilters.studentId || applicationFilters.studentId || historyFilters.studentId || ''
}

async function loadApplications() {
  await authorizationsStore.loadPage(applicationFilters, { silent: true })
}

async function loadActiveAuthorizations() {
  await authorizationsStore.loadActivePage(activeFilters, { silent: true })
}

async function loadHistoryAuthorizations() {
  await authorizationsStore.loadHistoryPage(historyFilters, { silent: true })
}

async function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'applications') {
    await loadApplications()
  } else if (tab === 'active') {
    await loadActiveAuthorizations()
  } else {
    await loadHistoryAuthorizations()
  }
}

async function resetApplicationFilters() {
  Object.assign(applicationFilters, {
    pageNum: 1,
    pageSize: 10,
    privacyDataId: query.value.get('privacyDataId') || '',
    studentId: '',
    status: '',
    targetType: '',
  })
  await loadApplications()
}

async function resetActiveFilters() {
  Object.assign(activeFilters, {
    pageNum: 1,
    pageSize: 10,
    studentId: '',
    privacyDataId: '',
    targetType: '',
  })
  await loadActiveAuthorizations()
}

async function resetHistoryFilters() {
  Object.assign(historyFilters, {
    pageNum: 1,
    pageSize: 10,
    studentId: '',
    status: '',
  })
  await loadHistoryAuthorizations()
}

async function openApplicationDetail(row) {
  detailOpen.value = true
  detailLoading.value = true
  try {
    detail.value = await authorizationsStore.loadDetail(row.applicationId, { silent: true })
  } finally {
    detailLoading.value = false
  }
}

async function openAuthorizedData(row, expectDenied = false) {
  accessOpen.value = true
  accessLoading.value = true
  accessDetail.value = null
  accessError.value = null
  accessSourceRow.value = row
  accessExpectedDenied.value = expectDenied
  try {
    accessDetail.value = await authorizationsStore.accessAuthorizedData(row.authorizationId, {
      silent: true,
      skipForbiddenRedirect: expectDenied,
    })
  } catch (error) {
    accessError.value = {
      status: error.status || 0,
      message: error.message || '访问失败',
    }
  } finally {
    accessLoading.value = false
  }
}

function openRevokeDialog(row) {
  revokeRow.value = row
  revokeForm.reason = ''
  revokeOpen.value = true
}

async function submitRevoke() {
  if (!revokeRow.value?.authorizationId) {
    return
  }

  revokeLoading.value = true
  try {
    await authorizationsStore.revoke(revokeRow.value.authorizationId, { reason: revokeForm.reason.trim() }, { silent: true })
    revokeOpen.value = false
    await Promise.allSettled([
      loadActiveAuthorizations(),
      loadHistoryAuthorizations(),
    ])
  } finally {
    revokeLoading.value = false
  }
}

function goApply() {
  router.navigate(buildRouteWithQuery('/authorization/apply', {
    privacyDataId: query.value.get('privacyDataId') || '',
  }))
}

function goPrivacyDetail(privacyDataId) {
  router.navigate(buildRouteWithQuery('/privacy/detail', { id: privacyDataId }))
}

function goApproval(row) {
  router.navigate(buildRouteWithQuery('/authorization/approval', {
    id: row.applicationId,
    applicationNo: row.applicationNo,
    privacyDataId: row.privacyDataId,
    studentId: row.studentId,
    targetType: row.targetType,
    targetId: row.targetId,
    purpose: row.purpose,
    expireAt: row.expireAt,
    status: row.status,
  }))
}

function goAccessLogs(row = accessSourceRow.value || {}) {
  router.navigate(buildRouteWithQuery('/access/logs', {
    studentId: resolveStudentId(row),
    privacyDataId: row.privacyDataId || '',
  }))
}

function goStudentArchive(row = accessSourceRow.value || {}) {
  const studentId = resolveStudentId(row)
  if (!studentId) {
    return
  }
  router.navigate(buildRouteWithQuery('/student/archive', {
    studentId,
    tab: 'access',
  }))
}

function dismissCreatedNotice() {
  router.navigate(buildRouteWithQuery('/authorization/list', {
    privacyDataId: query.value.get('privacyDataId') || '',
  }))
}

async function changeApplicationPage(page) {
  applicationFilters.pageNum = page
  await loadApplications()
}

async function changeActivePage(page) {
  activeFilters.pageNum = page
  await loadActiveAuthorizations()
}

async function changeHistoryPage(page) {
  historyFilters.pageNum = page
  await loadHistoryAuthorizations()
}

onMounted(async () => {
  const routeTab = query.value.get('tab')
  if (routeTab === 'active' || routeTab === 'history') {
    activeTab.value = routeTab
  } else {
    activeTab.value = 'applications'
  }

  applicationFilters.privacyDataId = query.value.get('privacyDataId') || ''
  activeFilters.studentId = query.value.get('studentId') || ''
  activeFilters.privacyDataId = query.value.get('privacyDataId') || ''
  historyFilters.studentId = query.value.get('studentId') || ''
  historyFilters.status = query.value.get('status') || ''

  if (activeTab.value === 'active') {
    await loadActiveAuthorizations()
  } else if (activeTab.value === 'history') {
    await loadHistoryAuthorizations()
  } else {
    await loadApplications()
  }
})
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P11</span>
          <h3>授权申请、有效授权与历史授权</h3>
          <p>本小段补充有效授权撤销、历史授权查询，以及撤销后访问失败的联动验证。</p>
        </div>
        <div class="action-row">
          <button class="secondary-button" type="button" @click="goApply">发起共享授权</button>
        </div>
      </div>

      <div v-if="createdReceipt" class="result-card result-good">
        <strong>授权申请已提交</strong>
        <p>申请编号：{{ createdReceipt.applicationNo }}，当前状态：{{ formatAuthorizationStatus(createdReceipt.status) }}</p>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="dismissCreatedNotice">收起提示</button>
        </div>
      </div>

      <div v-if="revokeResult" class="result-card result-good">
        <strong>撤销结果已刷新</strong>
        <p>授权编号：{{ revokeResult.authorizationId || '--' }}，状态：{{ formatAuthorizationStatus(revokeResult.status) }}，撤销时间：{{ formatDateTime(revokeResult.revokedAt) }}</p>
      </div>

      <div class="tabs-row">
        <button class="tab-button" :class="{ active: activeTab === 'applications' }" type="button" @click="switchTab('applications')">
          授权申请
        </button>
        <button class="tab-button" :class="{ active: activeTab === 'active' }" type="button" @click="switchTab('active')">
          有效授权
        </button>
        <button class="tab-button" :class="{ active: activeTab === 'history' }" type="button" @click="switchTab('history')">
          历史授权
        </button>
      </div>

      <form v-if="activeTab === 'applications'" class="toolbar authorization-filter-grid" @submit.prevent="loadApplications">
        <input v-model.trim="applicationFilters.privacyDataId" placeholder="按隐私数据 ID 筛选" />
        <input v-model.trim="applicationFilters.studentId" placeholder="按学生主键筛选" />
        <select v-model="applicationFilters.status">
          <option value="">全部申请状态</option>
          <option value="PENDING_REVIEW">待审核</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已驳回</option>
        </select>
        <select v-model="applicationFilters.targetType">
          <option value="">全部目标对象</option>
          <option value="COUNSELOR">辅导员</option>
          <option value="TEACHING_ADMIN">教务管理员</option>
        </select>
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetApplicationFilters">重置</button>
        </div>
      </form>

      <form v-else-if="activeTab === 'active'" class="toolbar authorization-filter-grid" @submit.prevent="loadActiveAuthorizations">
        <input v-model.trim="activeFilters.studentId" placeholder="按学生主键筛选" />
        <input v-model.trim="activeFilters.privacyDataId" placeholder="按隐私数据 ID 筛选" />
        <select v-model="activeFilters.targetType">
          <option value="">全部目标对象</option>
          <option value="COUNSELOR">辅导员</option>
          <option value="TEACHING_ADMIN">教务管理员</option>
        </select>
        <div></div>
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetActiveFilters">重置</button>
        </div>
      </form>

      <form v-else class="toolbar authorization-filter-grid" @submit.prevent="loadHistoryAuthorizations">
        <input v-model.trim="historyFilters.studentId" placeholder="按学生主键筛选" />
        <select v-model="historyFilters.status">
          <option value="">全部历史状态</option>
          <option value="REVOKED">已撤销</option>
          <option value="EXPIRED">已到期</option>
        </select>
        <div></div>
        <div></div>
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetHistoryFilters">重置</button>
        </div>
      </form>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <span>{{ activeTab === 'applications' ? '申请总数' : activeTab === 'active' ? '有效授权总数' : '历史授权总数' }}</span>
        <strong>{{ activeTab === 'applications' ? applicationStats.total : activeTab === 'active' ? activeStats.total : historyStats.total }}</strong>
      </article>
      <article class="metric-card">
        <span>{{ activeTab === 'applications' ? '待审核' : activeTab === 'active' ? '生效中' : '已撤销' }}</span>
        <strong>{{ activeTab === 'applications' ? applicationStats.pending : activeTab === 'active' ? activeStats.active : historyStats.revoked }}</strong>
      </article>
      <article class="metric-card">
        <span>{{ activeTab === 'applications' ? '已通过' : activeTab === 'active' ? '辅导员对象' : '已到期' }}</span>
        <strong>{{ activeTab === 'applications' ? applicationStats.approved : activeTab === 'active' ? activeStats.counselor : historyStats.expired }}</strong>
      </article>
      <article class="metric-card">
        <span>{{ activeTab === 'applications' ? '已驳回' : activeTab === 'active' ? '教务对象' : '其他状态' }}</span>
        <strong>{{ activeTab === 'applications' ? applicationStats.rejected : activeTab === 'active' ? activeStats.admin : historyStats.other }}</strong>
      </article>
    </section>

    <section class="panel">
      <div class="table-meta">
        <span>{{ activeTab === 'applications' ? '授权申请列表' : activeTab === 'active' ? '有效授权列表' : '历史授权列表' }}</span>
        <span>{{ authorizationsStore.loading.value ? '正在加载...' : '已同步当前页数据' }}</span>
      </div>

      <table v-if="activeTab === 'applications'" class="data-table">
        <thead>
          <tr>
            <th>申请主键</th>
            <th>申请编号</th>
            <th>隐私数据 ID</th>
            <th>目标对象类型</th>
            <th>目标对象标识</th>
            <th>用途</th>
            <th>到期时间</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in applicationRecords" :key="row.applicationId">
            <td>{{ row.applicationId }}</td>
            <td>{{ row.applicationNo || '--' }}</td>
            <td>{{ row.privacyDataId || '--' }}</td>
            <td>{{ formatAuthorizationTargetType(row.targetType) }}</td>
            <td>{{ row.targetId || '--' }}</td>
            <td :title="row.purpose || '--'">{{ row.purpose || '--' }}</td>
            <td>{{ formatDateTime(row.expireAt) }}</td>
            <td>
              <span class="tag" :class="getTagClassByStatus(row.status)">
                {{ formatAuthorizationStatus(row.status) }}
              </span>
            </td>
            <td>{{ formatDateTime(row.submittedAt) }}</td>
            <td>
              <div class="action-row">
                <button class="text-button" type="button" @click="openApplicationDetail(row)">查看详情</button>
                <button class="text-button" type="button" @click="goPrivacyDetail(row.privacyDataId)">关联数据</button>
                <button
                  v-if="authStore.hasAnyRole(['COUNSELOR', 'TEACHING_ADMIN']) && row.status === 'PENDING_REVIEW'"
                  class="text-button"
                  type="button"
                  @click="goApproval(row)"
                >
                  审批详情
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!applicationRecords.length">
            <td colspan="10" class="empty-cell">当前筛选条件下暂无授权申请记录。</td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="activeTab === 'active'" class="data-table">
        <thead>
          <tr>
            <th>授权主键</th>
            <th>隐私数据 ID</th>
            <th>学生主键</th>
            <th>目标对象类型</th>
            <th>目标对象标识</th>
            <th>到期时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in activeRecords" :key="row.authorizationId || `${row.privacyDataId}-${row.targetId}`">
            <td>{{ row.authorizationId || '--' }}</td>
            <td>{{ row.privacyDataId || '--' }}</td>
            <td>{{ resolveStudentId(row) || '--' }}</td>
            <td>{{ formatAuthorizationTargetType(row.targetType) }}</td>
            <td>{{ row.targetId || '--' }}</td>
            <td>{{ formatDateTime(row.expireAt) }}</td>
            <td>
              <span class="tag" :class="getAuthorizationTagClass(row.status)">
                {{ formatAuthorizationStatus(row.status) }}
              </span>
            </td>
            <td>
              <div class="action-row">
                <button
                  v-if="canAccessAuthorizedData"
                  class="text-button"
                  type="button"
                  @click="openAuthorizedData(row)"
                >
                  查看授权数据
                </button>
                <button
                  v-if="canRevokeAuthorization && row.status === 'ACTIVE'"
                  class="text-button danger"
                  type="button"
                  @click="openRevokeDialog(row)"
                >
                  撤销
                </button>
                <button
                  v-if="canOpenAccessLogs"
                  class="text-button"
                  type="button"
                  @click="goAccessLogs(row)"
                >
                  查看访问记录
                </button>
                <button
                  v-if="canOpenArchive && resolveStudentId(row)"
                  class="text-button"
                  type="button"
                  @click="goStudentArchive(row)"
                >
                  学生档案
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!activeRecords.length">
            <td colspan="8" class="empty-cell">当前没有生效中的授权记录。</td>
          </tr>
        </tbody>
      </table>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>authorizationId</th>
            <th>privacyDataId</th>
            <th>status</th>
            <th>expireAt</th>
            <th>revokedAt</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in historyRecords" :key="row.authorizationId || `${row.privacyDataId}-${row.revokedAt}`">
            <td>{{ row.authorizationId || '--' }}</td>
            <td>{{ row.privacyDataId || '--' }}</td>
            <td>
              <span class="tag" :class="getTagClassByStatus(row.status)">
                {{ formatAuthorizationStatus(row.status) }}
              </span>
            </td>
            <td>{{ formatDateTime(row.expireAt) }}</td>
            <td>{{ formatDateTime(row.revokedAt) }}</td>
            <td>
              <div class="action-row">
                <button
                  v-if="canAccessAuthorizedData"
                  class="text-button"
                  type="button"
                  @click="openAuthorizedData(row, true)"
                >
                  验证访问失败
                </button>
                <button
                  v-if="canOpenAccessLogs"
                  class="text-button"
                  type="button"
                  @click="goAccessLogs(row)"
                >
                  查看访问记录
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!historyRecords.length">
            <td colspan="6" class="empty-cell">当前没有历史授权记录。</td>
          </tr>
        </tbody>
      </table>

      <AppPagination
        v-if="activeTab === 'applications'"
        :page-num="applicationFilters.pageNum"
        :page-size="applicationFilters.pageSize"
        :total="applicationTotal"
        @change="changeApplicationPage"
      />
      <AppPagination
        v-else-if="activeTab === 'active'"
        :page-num="activeFilters.pageNum"
        :page-size="activeFilters.pageSize"
        :total="activeTotal"
        @change="changeActivePage"
      />
      <AppPagination
        v-else
        :page-num="historyFilters.pageNum"
        :page-size="historyFilters.pageSize"
        :total="historyTotal"
        @change="changeHistoryPage"
      />
    </section>

    <AppDialog :open="detailOpen" title="授权申请详情" width="620px" @close="detailOpen = false">
      <div v-if="detailLoading" class="empty-block">正在加载申请详情...</div>
      <dl v-else-if="detail" class="detail-grid">
        <div>
          <dt>申请编号</dt>
          <dd>{{ detail.applicationNo || '--' }}</dd>
        </div>
        <div>
          <dt>隐私数据 ID</dt>
          <dd>{{ detail.privacyDataId || '--' }}</dd>
        </div>
        <div>
          <dt>目标对象类型</dt>
          <dd>{{ formatAuthorizationTargetType(detail.targetType) }}</dd>
        </div>
        <div>
          <dt>目标对象标识</dt>
          <dd>{{ detail.targetId || '--' }}</dd>
        </div>
        <div>
          <dt>用途</dt>
          <dd>{{ detail.purpose || '--' }}</dd>
        </div>
        <div>
          <dt>到期时间</dt>
          <dd>{{ formatDateTime(detail.expireAt) }}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>{{ formatAuthorizationStatus(detail.status) }}</dd>
        </div>
        <div>
          <dt>审批意见</dt>
          <dd>{{ detail.reviewComment || '--' }}</dd>
        </div>
      </dl>
      <div v-else class="empty-block">暂无申请详情。</div>
    </AppDialog>

    <AppDialog :open="accessOpen" title="授权访问验证" width="720px" @close="accessOpen = false">
      <div v-if="accessLoading" class="empty-block">正在读取授权数据...</div>
      <template v-else-if="accessError">
        <div class="result-card result-good">
          <strong>{{ accessExpectedDenied ? '访问失败验证完成' : '访问失败' }}</strong>
          <p>{{ accessExpectedDenied ? '撤销或过期后的授权已无法继续访问。' : '本次授权访问未成功，请检查授权状态。' }}</p>
          <p>接口提示：{{ accessError.message }}</p>
        </div>
        <div class="action-row top-gap">
          <button
            v-if="canOpenAccessLogs"
            class="secondary-button"
            type="button"
            @click="goAccessLogs()"
          >
            查看访问记录
          </button>
          <button
            v-if="canOpenArchive && resolveStudentId(accessSourceRow)"
            class="secondary-button"
            type="button"
            @click="goStudentArchive()"
          >
            进入学生档案访问标签页
          </button>
        </div>
      </template>
      <template v-else-if="accessDetail">
        <div :class="['result-card', accessExpectedDenied ? 'result-bad' : 'result-good']">
          <strong>{{ accessExpectedDenied ? '访问验证异常' : '授权数据访问成功' }}</strong>
          <p>授权主键：{{ accessDetail.authorizationId || accessSourceRow?.authorizationId || '--' }}</p>
          <p v-if="accessExpectedDenied">该授权已处于历史状态，但接口仍返回了访问结果，请和后端一起核查状态流转。</p>
          <p v-else>{{ accessDetail.accessLogged ? '访问留痕已写入，可继续查看访问记录。' : '访问结果已返回，但后端未显式确认留痕状态。' }}</p>
        </div>

        <div class="key-value-list top-gap">
          <div v-for="item in accessFields" :key="item.key" class="key-value-item">
            <span>{{ item.label }}</span>
            <div class="masked-block">{{ item.value }}</div>
          </div>
        </div>

        <div class="action-row top-gap">
          <button
            v-if="canOpenAccessLogs"
            class="secondary-button"
            type="button"
            @click="goAccessLogs()"
          >
            查看访问记录
          </button>
          <button
            v-if="canOpenArchive && resolveStudentId(accessSourceRow)"
            class="secondary-button"
            type="button"
            @click="goStudentArchive()"
          >
            进入学生档案访问标签页
          </button>
        </div>
      </template>
      <div v-else class="empty-block">暂无授权访问结果。</div>
    </AppDialog>

    <AppDialog :open="revokeOpen" title="撤销有效授权" width="620px" @close="revokeOpen = false">
      <div class="result-card result-bad">
        <strong>确认撤销当前有效授权</strong>
        <p>只有状态为 ACTIVE 的授权才允许撤销。撤销后，被授权方应无法再通过该授权访问隐私数据。</p>
      </div>

      <dl v-if="revokeRow" class="detail-grid top-gap">
        <div>
          <dt>授权主键</dt>
          <dd>{{ revokeRow.authorizationId || '--' }}</dd>
        </div>
        <div>
          <dt>隐私数据 ID</dt>
          <dd>{{ revokeRow.privacyDataId || '--' }}</dd>
        </div>
        <div>
          <dt>目标对象</dt>
          <dd>{{ formatAuthorizationTargetType(revokeRow.targetType) }}</dd>
        </div>
        <div>
          <dt>到期时间</dt>
          <dd>{{ formatDateTime(revokeRow.expireAt) }}</dd>
        </div>
      </dl>

      <label class="field top-gap">
        <span>撤销原因</span>
        <textarea v-model.trim="revokeForm.reason" rows="4" placeholder="例如：共享用途已完成、申请方已变更、提前停止访问等"></textarea>
      </label>

      <template #footer>
        <button class="ghost-button" type="button" @click="revokeOpen = false">取消</button>
        <button class="danger-button" type="button" :disabled="revokeLoading" @click="submitRevoke">
          {{ revokeLoading ? '撤销中...' : '确认撤销' }}
        </button>
      </template>
    </AppDialog>
  </div>
</template>
