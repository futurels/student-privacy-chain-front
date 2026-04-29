<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AppDialog from '../components/AppDialog.vue'
import AppPagination from '../components/AppPagination.vue'
import { evidenceStore } from '../stores/evidence'
import { authorizationsStore } from '../stores/authorizations'
import { authStore } from '../stores/auth'
import { messageStore } from '../stores/message'
import { router } from '../router'
import {
  buildRouteWithQuery,
  formatChainEvidenceStatus,
  formatAuthorizationStatus,
  formatAuthorizationTargetType,
  formatDateTime,
  formatEvidenceApplicationStatus,
  formatEvidenceStatus,
  formatEvidenceTypeLabel,
  formatVerifyStatus,
  getTagClassByStatus,
  resolveApprovalStatus,
  resolveEvidenceStatus,
  resolveVerifyStatus,
} from '../utils/helpers'

const route = computed(() => router.currentRoute.value)
const routeQuery = computed(() => route.value.query)
const routePath = computed(() => route.value.path)

const applicationFilters = reactive({
  pageNum: 1,
  pageSize: 10,
  privacyDataId: '',
  studentId: '',
  status: '',
  evidenceType: '',
})

const recordFilters = reactive({
  pageNum: 1,
  pageSize: 10,
  privacyDataId: '',
  studentId: '',
  status: '',
  startDate: '',
  endDate: '',
})

const detailOpen = ref(false)
const dialogLoading = ref(false)
const dialogDetail = ref(null)
const chainingRowKey = ref('')
const authorizationFilters = reactive({
  pageNum: 1,
  pageSize: 8,
  status: 'PENDING_REVIEW',
  privacyDataId: '',
  studentId: '',
  targetType: '',
})

const isApprovalCenter = computed(() => routePath.value === '/approval/center')
const isApprovalRecords = computed(() => routePath.value === '/approval/records')
const isApprovalMode = computed(() => isApprovalCenter.value || isApprovalRecords.value)
const showTabs = computed(() => !isApprovalMode.value)
const isApplicationTab = computed(() => evidenceStore.state.activeTab === 'applications')

const applications = computed(() => evidenceStore.state.applications)
const evidences = computed(() => evidenceStore.state.evidences)
const applicationTotal = computed(() => evidenceStore.state.applicationTotal)
const evidenceTotal = computed(() => evidenceStore.state.evidenceTotal)
const authorizationApplications = computed(() => authorizationsStore.state.pageData.records)
const authorizationTotal = computed(() => authorizationsStore.state.pageData.total)

const canReviewAction = computed(() => authStore.hasRole('COUNSELOR') || authStore.hasRole('TEACHING_ADMIN'))
const canOpenApprovalDetail = computed(() => canReviewAction.value || authStore.hasRole('SYS_ADMIN'))
const canChain = computed(() => authStore.hasRole('TEACHING_ADMIN'))

const getApprovalStatus = (row) => resolveApprovalStatus(row) || row.status
const getEvidenceStatus = (row) => resolveEvidenceStatus(row) || 'PENDING_CHAIN'
const getVerifyStatus = (row) => resolveVerifyStatus(row)
const getEvidenceId = (row = {}) => (
  row.evidenceId ||
  row.evidenceRecordId ||
  row.recordId ||
  row.evidence?.evidenceId ||
  row.record?.evidenceId ||
  row.evidenceRecord?.evidenceId ||
  ''
)
const hasChainWorkflow = (row) => ['PENDING_CHAIN', 'CHAIN_FAILED', 'CHAINING', 'CHAINED', 'INVALIDATED'].includes(getEvidenceStatus(row))
const canOpenEvidenceWorkflow = (row) => hasChainWorkflow(row) || Boolean(getEvidenceId(row))
const canExecuteChainFromApplication = (row) => (
  canChain.value &&
  ['PENDING_CHAIN', 'CHAIN_FAILED'].includes(getEvidenceStatus(row)) &&
  (getApprovalStatus(row) === 'APPROVED' || getEvidenceStatus(row) === 'PENDING_CHAIN' || getEvidenceStatus(row) === 'CHAIN_FAILED')
)
const showChainStatusForApplication = (row) => !isApprovalCenter.value && (getApprovalStatus(row) !== 'PENDING_REVIEW' || hasChainWorkflow(row))
const showEvidenceWorkflowAction = (row) => !isApprovalCenter.value && canOpenEvidenceWorkflow(row)
const getApplicationRowKey = (row = {}) => `${getEvidenceId(row) || row.applicationId || row.applicationNo || row.privacyDataId || ''}`
const isChainingRow = (row = {}) => chainingRowKey.value && chainingRowKey.value === getApplicationRowKey(row)

const pageMeta = computed(() => {
  if (isApprovalCenter.value) {
    return {
      code: 'P13',
      title: '审批中心',
      description: '集中查看待审存证申请，并进入审批详情执行审核处理。',
      tableTitle: '待审申请列表',
      tableHint: '默认聚焦待审申请，支持按隐私数据、学生和存证类型筛选。',
    }
  }

  if (isApprovalRecords.value) {
    return {
      code: 'P17',
      title: '审批记录查询',
      description: '查看已处理申请记录，支持回看关联隐私数据并继续业务处理。',
      tableTitle: '已处理申请列表',
      tableHint: '默认展示已通过记录，可切换为驳回记录继续排查。',
    }
  }

  return {
    code: 'P08',
    title: '存证申请与记录列表',
    description: '统一查看存证申请与上链记录，并随时返回关联的隐私数据继续处理。',
    tableTitle: isApplicationTab.value ? '存证申请列表' : '存证记录列表',
    tableHint: isApplicationTab.value ? '保留申请查询与详情回看能力。' : '保留存证记录查询与详情校验能力。',
  }
})

const createdReceipt = computed(() => {
  const applicationNo = routeQuery.value.get('createdApplicationNo') || ''
  if (!applicationNo) {
    return null
  }

  return {
    applicationId: routeQuery.value.get('createdApplicationId') || '--',
    applicationNo,
    status: routeQuery.value.get('createdStatus') || '--',
    privacyDataId: routeQuery.value.get('privacyDataId') || '--',
  }
})

const visibleApplications = computed(() => {
  if (isApprovalCenter.value) {
    return applications.value.filter((item) => getApprovalStatus(item) === 'PENDING_REVIEW')
  }

  if (isApprovalRecords.value) {
    return applications.value.filter((item) => (
      ['APPROVED', 'REJECTED'].includes(getApprovalStatus(item)) ||
      hasChainWorkflow(item)
    ))
  }

  return applications.value
})

const applicationStats = computed(() => {
  const list = visibleApplications.value
  return {
    total: isApprovalMode.value ? list.length : applicationTotal.value,
    pending: list.filter((item) => getApprovalStatus(item) === 'PENDING_REVIEW').length,
    approved: list.filter((item) => getApprovalStatus(item) === 'APPROVED' || hasChainWorkflow(item)).length,
    rejected: list.filter((item) => getApprovalStatus(item) === 'REJECTED').length,
  }
})

const recordStats = computed(() => {
  const list = evidences.value
  return {
    total: evidenceTotal.value,
    chained: list.filter((item) => getEvidenceStatus(item) === 'CHAINED').length,
    invalidated: list.filter((item) => getEvidenceStatus(item) === 'INVALIDATED').length,
    failed: list.filter((item) => getEvidenceStatus(item) === 'CHAIN_FAILED').length,
  }
})

const loadApplications = () => evidenceStore.loadApplications(applicationFilters)
const loadEvidences = () => evidenceStore.loadEvidences(recordFilters)
const loadAuthorizationTodo = () => authorizationsStore.loadPage(authorizationFilters)

const switchTab = async (tab) => {
  if (isApprovalMode.value) {
    return
  }

  evidenceStore.setActiveTab(tab)
  if (tab === 'applications') {
    await loadApplications()
  } else {
    await loadEvidences()
  }
}

const resetApplicationFilters = async () => {
  Object.assign(applicationFilters, {
    pageNum: 1,
    pageSize: 10,
    privacyDataId: routeQuery.value.get('privacyDataId') || '',
    studentId: '',
    status: routeQuery.value.get('status') || (isApprovalCenter.value ? 'PENDING_REVIEW' : isApprovalRecords.value ? 'APPROVED' : ''),
    evidenceType: '',
  })
  await loadApplications()
}

const resetRecordFilters = async () => {
  Object.assign(recordFilters, {
    pageNum: 1,
    pageSize: 10,
    privacyDataId: routeQuery.value.get('privacyDataId') || '',
    studentId: '',
    status: '',
    startDate: '',
    endDate: '',
  })
  await loadEvidences()
}

const openApplicationDetail = async (row) => {
  dialogLoading.value = true
  detailOpen.value = true
  try {
    dialogDetail.value = await evidenceStore.loadApplicationDetail(row.applicationId)
  } finally {
    dialogLoading.value = false
  }
}

const goApproval = (row) => {
  router.navigate(buildRouteWithQuery('/evidence/approval', {
    id: row.applicationId,
    applicationNo: row.applicationNo,
    privacyDataId: row.privacyDataId,
    status: getApprovalStatus(row),
    source: routePath.value,
  }))
}

const goAuthorizationApproval = (row) => {
  router.navigate(buildRouteWithQuery('/authorization/approval', {
    id: row.applicationId,
    applicationNo: row.applicationNo,
    privacyDataId: row.privacyDataId,
    status: row.status,
    source: routePath.value,
  }))
}

const goEvidenceDetail = (row) => {
  router.navigate(buildRouteWithQuery('/evidence/detail', {
    id: getEvidenceId(row),
    applicationId: row.applicationId || '',
    privacyDataId: row.privacyDataId,
    status: getApprovalStatus(row),
    evidenceStatus: getEvidenceStatus(row),
  }))
}

const goChainFromApprovedApplication = async (row) => {
  if (isApprovalCenter.value) {
    return
  }

  if (!canExecuteChainFromApplication(row)) {
    if (isApprovalRecords.value) {
      if (getEvidenceId(row)) {
        goEvidenceDetail(row)
        return
      }
      router.navigate(buildRouteWithQuery('/evidence/detail', {
        applicationId: row.applicationId,
        applicationNo: row.applicationNo,
        privacyDataId: row.privacyDataId,
        status: getApprovalStatus(row),
        evidenceStatus: getEvidenceStatus(row),
        source: routePath.value,
      }))
      return
    }

    if (getEvidenceId(row)) {
      goEvidenceDetail(row)
      return
    }
  }

  if (isApprovalRecords.value) {
    if (getEvidenceId(row)) {
      goEvidenceDetail(row)
      return
    }
    router.navigate(buildRouteWithQuery('/evidence/detail', {
      applicationId: row.applicationId,
      applicationNo: row.applicationNo,
      privacyDataId: row.privacyDataId,
      status: getApprovalStatus(row),
      evidenceStatus: getEvidenceStatus(row),
      source: routePath.value,
    }))
    return
  }

  if (isChainingRow(row)) {
    return
  }

  const sourceId = row.applicationId || getEvidenceId(row) || ''
  if (!sourceId) {
    messageStore.warning('当前行缺少有效的存证主键，暂时无法执行上链登记。')
    return
  }

  chainingRowKey.value = getApplicationRowKey(row)
  try {
    const result = await evidenceStore.chainEvidence(sourceId, {
      channelName: 'student-privacy-channel',
    })
    await loadApplications()
    router.navigate(buildRouteWithQuery('/evidence/detail', {
      id: getEvidenceId(result),
      applicationId: result.applicationId || row.applicationId || '',
      applicationNo: result.applicationNo || row.applicationNo || '',
      privacyDataId: result.privacyDataId || row.privacyDataId || '',
      status: getApprovalStatus(result) || getApprovalStatus(row),
      evidenceStatus: getEvidenceStatus(result) || getEvidenceStatus(row),
      source: routePath.value,
    }))
  } finally {
    chainingRowKey.value = ''
  }
}

const goPrivacyDetail = (privacyDataId) => {
  router.navigate(buildRouteWithQuery('/privacy/detail', {
    id: privacyDataId,
  }))
}

const goPrivacyWorkspace = (privacyDataId) => {
  router.navigate(buildRouteWithQuery('/files/manage', {
    privacyDataId,
  }))
}

const goPrivacyEdit = (privacyDataId) => {
  router.navigate(buildRouteWithQuery('/privacy/edit', {
    id: privacyDataId,
  }))
}

const dismissCreatedNotice = () => {
  router.navigate(buildRouteWithQuery('/evidence/list', {
    tab: isApplicationTab.value ? 'applications' : 'evidences',
    privacyDataId: routeQuery.value.get('privacyDataId') || '',
  }))
}

const changeApplicationPage = async (page) => {
  applicationFilters.pageNum = page
  await loadApplications()
}

const changeRecordPage = async (page) => {
  recordFilters.pageNum = page
  await loadEvidences()
}

const changeAuthorizationPage = async (page) => {
  authorizationFilters.pageNum = page
  await loadAuthorizationTodo()
}

onMounted(async () => {
  applicationFilters.privacyDataId = routeQuery.value.get('privacyDataId') || ''
  recordFilters.privacyDataId = routeQuery.value.get('privacyDataId') || ''

  if (isApprovalCenter.value) {
    applicationFilters.status = routeQuery.value.get('status') || 'PENDING_REVIEW'
    authorizationFilters.privacyDataId = routeQuery.value.get('privacyDataId') || ''
    authorizationFilters.status = 'PENDING_REVIEW'
    evidenceStore.setActiveTab('applications')
    await Promise.allSettled([loadApplications(), loadAuthorizationTodo()])
    return
  }

  if (isApprovalRecords.value) {
    applicationFilters.status = routeQuery.value.get('status') || 'APPROVED'
    evidenceStore.setActiveTab('applications')
    await loadApplications()
    return
  }

  const initialTab = routeQuery.value.get('tab') === 'evidences' ? 'evidences' : 'applications'
  evidenceStore.setActiveTab(initialTab)

  if (initialTab === 'applications') {
    await loadApplications()
  } else {
    await loadEvidences()
  }
})
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">{{ pageMeta.code }}</span>
          <h3>{{ pageMeta.title }}</h3>
          <p>{{ pageMeta.description }}</p>
        </div>
      </div>

      <div v-if="createdReceipt" class="result-card result-good evidence-created-banner">
        <div>
          <strong>存证申请已提交</strong>
          <p>申请编号：{{ createdReceipt.applicationNo }}，当前状态：{{ formatEvidenceApplicationStatus(createdReceipt.status) }}</p>
          <p>关联隐私数据ID：{{ createdReceipt.privacyDataId }}</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="dismissCreatedNotice">收起提示</button>
        </div>
      </div>

      <div v-if="showTabs" class="tabs-row">
        <button
          class="tab-button"
          :class="{ active: isApplicationTab }"
          type="button"
          @click="switchTab('applications')"
        >
          存证申请
        </button>
        <button
          class="tab-button"
          :class="{ active: !isApplicationTab }"
          type="button"
          @click="switchTab('evidences')"
        >
          存证记录
        </button>
      </div>

      <div v-if="isApprovalCenter" class="notice-card">
        <strong>待审入口</strong>
        <p>这里默认聚焦待审申请，辅导员与教务管理员可直接进入审批详情执行通过或驳回，系统管理员以查看总览为主。</p>
      </div>

      <div v-if="isApprovalRecords" class="notice-card">
        <strong>记录说明</strong>
        <p>这里用于回看已处理申请。默认展示已通过记录，可切换为驳回记录，并随时回到关联隐私数据继续处理。</p>
      </div>

      <form v-if="isApplicationTab" class="toolbar" @submit.prevent="loadApplications">
        <input v-model.trim="applicationFilters.privacyDataId" placeholder="按隐私数据ID筛选" />
        <input v-model.trim="applicationFilters.studentId" placeholder="按学生主键筛选" />
        <select v-model="applicationFilters.status">
          <option value="">全部申请状态</option>
          <option value="PENDING_REVIEW">待审核</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已驳回</option>
        </select>
        <select v-model="applicationFilters.evidenceType">
          <option value="">全部存证类型</option>
          <option value="STRUCTURED">结构化数据</option>
          <option value="FILE">附件文件</option>
        </select>
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetApplicationFilters">重置</button>
        </div>
      </form>

      <form v-else class="toolbar evidence-filter-grid" @submit.prevent="loadEvidences">
        <input v-model.trim="recordFilters.privacyDataId" placeholder="按隐私数据ID筛选" />
        <input v-model.trim="recordFilters.studentId" placeholder="按学生主键筛选" />
        <select v-model="recordFilters.status">
          <option value="">全部存证状态</option>
          <option value="CHAINING">上链中</option>
          <option value="CHAINED">已存证</option>
          <option value="INVALIDATED">已作废</option>
          <option value="CHAIN_FAILED">上链失败</option>
        </select>
        <input v-model="recordFilters.startDate" type="date" />
        <input v-model="recordFilters.endDate" type="date" />
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetRecordFilters">重置</button>
        </div>
      </form>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <span>{{ isApplicationTab ? '申请总数' : '记录总数' }}</span>
        <strong>{{ isApplicationTab ? applicationStats.total : recordStats.total }}</strong>
      </article>
      <article class="metric-card">
        <span>{{ isApplicationTab ? '待审核' : '已存证' }}</span>
        <strong>{{ isApplicationTab ? applicationStats.pending : recordStats.chained }}</strong>
      </article>
      <article class="metric-card">
        <span>{{ isApplicationTab ? '已通过' : '已作废' }}</span>
        <strong>{{ isApplicationTab ? applicationStats.approved : recordStats.invalidated }}</strong>
      </article>
      <article class="metric-card">
        <span>{{ isApplicationTab ? '已驳回' : '异常状态' }}</span>
        <strong>{{ isApplicationTab ? applicationStats.rejected : recordStats.failed }}</strong>
      </article>
    </section>

    <section v-if="isApprovalCenter" class="panel">
      <div class="table-meta">
        <span>授权待办列表</span>
        <span>{{ authorizationsStore.loading.value ? '正在加载...' : '仅展示待审核授权申请，进入详情后执行通过或驳回。' }}</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>申请主键</th>
            <th>申请编号</th>
            <th>隐私数据ID</th>
            <th>目标对象</th>
            <th>用途</th>
            <th>到期时间</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in authorizationApplications" :key="row.applicationId">
            <td>{{ row.applicationId }}</td>
            <td>{{ row.applicationNo || '--' }}</td>
            <td>{{ row.privacyDataId || '--' }}</td>
            <td>{{ formatAuthorizationTargetType(row.targetType) }} / {{ row.targetId || '--' }}</td>
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
                <button
                  v-if="canReviewAction"
                  class="text-button"
                  type="button"
                  @click="goAuthorizationApproval(row)"
                >
                  授权审批详情
                </button>
                <button class="text-button" type="button" @click="goPrivacyDetail(row.privacyDataId)">查看关联隐私数据</button>
              </div>
            </td>
          </tr>
          <tr v-if="!authorizationApplications.length">
            <td colspan="9" class="empty-cell">当前没有待审核授权申请。</td>
          </tr>
        </tbody>
      </table>

      <AppPagination
        :page-num="authorizationFilters.pageNum"
        :page-size="authorizationFilters.pageSize"
        :total="authorizationTotal"
        @change="changeAuthorizationPage"
      />
    </section>

    <section class="panel">
      <div class="table-meta">
        <span>{{ pageMeta.tableTitle }}</span>
        <span>{{ evidenceStore.loading.value ? '正在加载...' : pageMeta.tableHint }}</span>
      </div>

      <table v-if="isApplicationTab" class="data-table">
        <thead>
          <tr>
            <th>申请主键</th>
            <th>申请编号</th>
            <th>隐私数据ID</th>
            <th>存证类型</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleApplications" :key="row.applicationId">
            <td>{{ row.applicationId }}</td>
            <td>{{ row.applicationNo || '--' }}</td>
            <td>{{ row.privacyDataId || '--' }}</td>
            <td>{{ formatEvidenceTypeLabel(row.evidenceType) }}</td>
            <td>
              <div class="tag-row">
                <span class="tag" :class="getTagClassByStatus(getApprovalStatus(row))">
                  审批：{{ formatEvidenceApplicationStatus(getApprovalStatus(row)) }}
                </span>
                <span
                  v-if="showChainStatusForApplication(row)"
                  class="tag"
                  :class="getTagClassByStatus(getEvidenceStatus(row))"
                >
                  存证：{{ formatChainEvidenceStatus(getEvidenceStatus(row)) }}
                </span>
              </div>
            </td>
            <td>{{ formatDateTime(row.submittedAt) }}</td>
            <td>
              <div class="action-row" :class="{ 'approval-center-action-row': isApprovalCenter }">
                <button class="text-button" type="button" @click="openApplicationDetail(row)">查看申请</button>
                <button class="text-button" type="button" @click="goPrivacyDetail(row.privacyDataId)">查看关联隐私数据</button>
                <button class="text-button" type="button" @click="goPrivacyWorkspace(row.privacyDataId)">返回数据工作区</button>
                <button
                  v-if="showEvidenceWorkflowAction(row)"
                  class="text-button"
                  type="button"
                  @click="goChainFromApprovedApplication(row)"
                >
                  {{ canExecuteChainFromApplication(row) ? '执行上链登记' : '查看存证详情' }}
                </button>
                <button
                  v-if="getApprovalStatus(row) === 'REJECTED'"
                  class="text-button"
                  type="button"
                  @click="goPrivacyEdit(row.privacyDataId)"
                >
                  继续修改后重提
                </button>
                <button
                  v-if="canOpenApprovalDetail && (getApprovalStatus(row) === 'PENDING_REVIEW' || isApprovalRecords)"
                  class="text-button"
                  type="button"
                  @click="goApproval(row)"
                >
                  {{ canReviewAction ? '审批详情' : '查看审批详情' }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!visibleApplications.length">
            <td colspan="7" class="empty-cell">
              {{ isApprovalCenter ? '当前没有待审核申请。' : isApprovalRecords ? '当前没有已处理审批记录。' : '当前没有符合条件的存证申请。' }}
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>存证主键</th>
            <th>存证编号</th>
            <th>隐私数据ID</th>
            <th>交易哈希</th>
            <th>状态</th>
            <th>存证时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in evidences" :key="row.evidenceId">
            <td>{{ row.evidenceId }}</td>
            <td>{{ row.evidenceNo || '--' }}</td>
            <td>{{ row.privacyDataId || '--' }}</td>
            <td><code class="inline-code">{{ row.txId || '--' }}</code></td>
            <td>
              <span class="tag" :class="getTagClassByStatus(getEvidenceStatus(row))">
                {{ formatChainEvidenceStatus(getEvidenceStatus(row)) }}
              </span>
            </td>
            <td>{{ formatDateTime(row.chainAt || row.evidenceTime) }}</td>
            <td>
              <div class="action-row">
                <button class="text-button" type="button" @click="goEvidenceDetail(row)">详情校验</button>
                <button class="text-button" type="button" @click="goPrivacyDetail(row.privacyDataId)">查看关联隐私数据</button>
                <button class="text-button" type="button" @click="goPrivacyWorkspace(row.privacyDataId)">返回数据工作区</button>
              </div>
            </td>
          </tr>
          <tr v-if="!evidences.length">
            <td colspan="7" class="empty-cell">当前没有符合条件的存证记录。</td>
          </tr>
        </tbody>
      </table>

      <AppPagination
        v-if="isApplicationTab"
        :page-num="applicationFilters.pageNum"
        :page-size="applicationFilters.pageSize"
        :total="applicationTotal"
        @change="changeApplicationPage"
      />
      <AppPagination
        v-else
        :page-num="recordFilters.pageNum"
        :page-size="recordFilters.pageSize"
        :total="evidenceTotal"
        @change="changeRecordPage"
      />
    </section>

    <AppDialog :open="detailOpen" title="存证申请详情" width="560px" @close="detailOpen = false">
      <div v-if="dialogLoading" class="empty-block">正在加载申请详情...</div>
      <dl v-else-if="dialogDetail" class="detail-grid">
        <div>
          <dt>申请主键</dt>
          <dd>{{ dialogDetail.applicationId }}</dd>
        </div>
        <div>
          <dt>申请编号</dt>
          <dd>{{ dialogDetail.applicationNo || '--' }}</dd>
        </div>
        <div>
          <dt>隐私数据ID</dt>
          <dd>{{ dialogDetail.privacyDataId || '--' }}</dd>
        </div>
        <div>
          <dt>申请状态</dt>
          <dd>{{ formatEvidenceApplicationStatus(dialogDetail.status) }}</dd>
        </div>
        <div>
          <dt>审核人</dt>
          <dd>{{ dialogDetail.reviewerName || '--' }}</dd>
        </div>
        <div>
          <dt>审核意见</dt>
          <dd>{{ dialogDetail.reviewComment || '--' }}</dd>
        </div>
      </dl>
    </AppDialog>
  </div>
</template>

<style scoped>
.approval-center-action-row > :nth-child(3) {
  display: none;
}
</style>
