<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AppDialog from '../components/AppDialog.vue'
import AppPagination from '../components/AppPagination.vue'
import { approvalsStore } from '../stores/approvals'
import { router } from '../router'
import {
  buildRouteWithQuery,
  formatApprovalBusinessType,
  formatApprovalStatusLabel,
  formatDateTime,
  getTagClassByStatus,
} from '../utils/helpers'

const route = computed(() => router.currentRoute.value)
const routeQuery = computed(() => route.value.query)

const filters = reactive({
  pageNum: 1,
  pageSize: 10,
  businessType: '',
  status: '',
  privacyDataId: '',
  studentId: '',
})

const detailOpen = ref(false)
const detail = ref(null)

const records = computed(() => approvalsStore.state.pageData.records)
const total = computed(() => approvalsStore.state.pageData.total)

const pageMeta = {
  code: 'P17',
  title: '审批记录查询',
  description: '独立查看审批历史记录，按审批结果、业务类型、隐私数据和学生维度筛选，并支持回看审批详情。',
}

const approvalStats = computed(() => ({
  total: total.value,
  approved: records.value.filter((item) => item.status === 'APPROVED').length,
  rejected: records.value.filter((item) => item.status === 'REJECTED').length,
}))

const truncatedComment = (value = '') => {
  const text = String(value || '')
  if (!text) {
    return '--'
  }
  return text.length > 24 ? `${text.slice(0, 24)}...` : text
}

const isEvidenceBusiness = (row = {}) => ['EVIDENCE', 'EVIDENCE_APPLICATION'].includes(row.businessType)

const buildEvidenceDetailQuery = (row = {}) => ({
  id: row.evidenceId || '',
  applicationId: row.applicationId || row.businessId || '',
  applicationNo: row.applicationNo || '',
  privacyDataId: row.privacyDataId || '',
  status: row.status || '',
})

const loadPage = async () => {
  await approvalsStore.loadPage(filters)
}

const resetFilters = async () => {
  Object.assign(filters, {
    pageNum: 1,
    pageSize: 10,
    businessType: '',
    status: routeQuery.value.get('status') || '',
    privacyDataId: routeQuery.value.get('privacyDataId') || '',
    studentId: '',
  })
  await loadPage()
}

const changePage = async (page) => {
  filters.pageNum = page
  await loadPage()
}

const openDetail = async (row) => {
  detailOpen.value = true
  detail.value = await approvalsStore.loadDetail(row.approvalId)
}

const goPrivacyDetail = (privacyDataId) => {
  if (!privacyDataId) {
    return
  }
  router.navigate(buildRouteWithQuery('/privacy/detail', {
    id: privacyDataId,
  }))
}

const goEvidenceApply = (row = {}) => {
  if (!isEvidenceBusiness(row)) {
    return
  }
  router.navigate(buildRouteWithQuery('/evidence/approval', {
    id: row.applicationId || row.businessId || '',
    applicationNo: row.applicationNo || '',
    privacyDataId: row.privacyDataId || '',
    status: row.status || '',
    source: '/approval/records',
  }))
}

const goEvidenceDetail = (row = {}) => {
  if (!isEvidenceBusiness(row)) {
    return
  }
  router.navigate(buildRouteWithQuery('/evidence/detail', buildEvidenceDetailQuery(row)))
}

const onSubmit = async () => {
  filters.pageNum = 1
  await loadPage()
}

onMounted(async () => {
  Object.assign(filters, {
    status: routeQuery.value.get('status') || '',
    privacyDataId: routeQuery.value.get('privacyDataId') || '',
  })
  await loadPage()
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

      <div class="notice-card">
        <strong>数据源说明</strong>
        <p>P17 当前仅使用审批历史接口 `/api/approvals`，主键 `approvalId` 只用于审批记录详情，不再参与存证详情接口请求。</p>
      </div>

      <form class="toolbar approval-filter-grid" @submit.prevent="onSubmit">
        <select v-model="filters.status">
          <option value="">全部审批结果</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已驳回</option>
        </select>
        <select v-model="filters.businessType">
          <option value="">全部业务类型</option>
          <option value="EVIDENCE">存证审批</option>
          <option value="AUTHORIZATION">授权审批</option>
        </select>
        <input v-model.trim="filters.privacyDataId" placeholder="按隐私数据ID筛选" />
        <input v-model.trim="filters.studentId" placeholder="按学生ID筛选" />
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetFilters">重置</button>
        </div>
      </form>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <span>审批记录总数</span>
        <strong>{{ total }}</strong>
      </article>
      <article class="metric-card">
        <span>已通过</span>
        <strong>{{ approvalStats.approved }}</strong>
      </article>
      <article class="metric-card">
        <span>已驳回</span>
        <strong>{{ approvalStats.rejected }}</strong>
      </article>
      <article class="metric-card">
        <span>当前筛选</span>
        <strong>{{ filters.status ? formatApprovalStatusLabel(filters.status) : '全部结果' }}</strong>
      </article>
    </section>

    <section class="panel">
      <div class="table-meta">
        <span>审批历史列表</span>
        <span>{{ approvalsStore.loading.value ? '正在加载审批记录...' : '支持分页筛选与详情回看。' }}</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>审批记录ID</th>
            <th>业务类型</th>
            <th>申请编号</th>
            <th>隐私数据ID</th>
            <th>审批人</th>
            <th>审批结果</th>
            <th>审批时间</th>
            <th>审批意见</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in records" :key="row.approvalId">
            <td>{{ row.approvalId }}</td>
            <td>{{ formatApprovalBusinessType(row.businessType) }}</td>
            <td>{{ row.applicationNo || '--' }}</td>
            <td>{{ row.privacyDataId || '--' }}</td>
            <td>{{ row.reviewerName || '--' }}</td>
            <td>
              <span class="tag" :class="getTagClassByStatus(row.status)">
                {{ formatApprovalStatusLabel(row.status) }}
              </span>
            </td>
            <td>{{ formatDateTime(row.reviewedAt) }}</td>
            <td :title="row.reviewComment || ''">{{ truncatedComment(row.reviewComment) }}</td>
            <td>
              <div class="action-row">
                <button class="text-button" type="button" @click="openDetail(row)">查看详情</button>
                <button
                  v-if="isEvidenceBusiness(row)"
                  class="text-button"
                  type="button"
                  @click="goEvidenceApply(row)"
                >
                  查看关联申请
                </button>
                <button
                  v-if="isEvidenceBusiness(row)"
                  class="text-button"
                  type="button"
                  @click="goEvidenceDetail(row)"
                >
                  查看存证详情
                </button>
                <button class="text-button" type="button" @click="goPrivacyDetail(row.privacyDataId)">查看关联隐私数据</button>
              </div>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="9" class="empty-cell">当前筛选条件下暂无审批记录。</td>
          </tr>
        </tbody>
      </table>

      <AppPagination
        :page-num="filters.pageNum"
        :page-size="filters.pageSize"
        :total="total"
        @change="changePage"
      />
    </section>

    <AppDialog :open="detailOpen" title="审批记录详情" width="720px" @close="detailOpen = false">
      <div v-if="approvalsStore.detailLoading.value" class="empty-block">正在加载审批记录详情...</div>
      <dl v-else-if="detail" class="detail-grid">
        <div>
          <dt>审批记录ID</dt>
          <dd>{{ detail.approvalId || '--' }}</dd>
        </div>
        <div>
          <dt>业务类型</dt>
          <dd>{{ formatApprovalBusinessType(detail.businessType) }}</dd>
        </div>
        <div>
          <dt>业务主键</dt>
          <dd>{{ detail.businessId || '--' }}</dd>
        </div>
        <div>
          <dt>申请编号</dt>
          <dd>{{ detail.applicationNo || '--' }}</dd>
        </div>
        <div>
          <dt>审批人ID</dt>
          <dd>{{ detail.reviewerId || '--' }}</dd>
        </div>
        <div>
          <dt>审批人</dt>
          <dd>{{ detail.reviewerName || '--' }}</dd>
        </div>
        <div>
          <dt>审批结果</dt>
          <dd>{{ formatApprovalStatusLabel(detail.status) }}</dd>
        </div>
        <div>
          <dt>审批时间</dt>
          <dd>{{ formatDateTime(detail.reviewedAt) }}</dd>
        </div>
        <div>
          <dt>隐私数据ID</dt>
          <dd>{{ detail.privacyDataId || '--' }}</dd>
        </div>
        <div>
          <dt>学生ID</dt>
          <dd>{{ detail.studentId || '--' }}</dd>
        </div>
        <div>
          <dt>学生姓名</dt>
          <dd>{{ detail.studentName || '--' }}</dd>
        </div>
        <div>
          <dt>审批意见</dt>
          <dd>{{ detail.reviewComment || '--' }}</dd>
        </div>
      </dl>
      <template #footer>
        <div class="action-row">
          <button
            v-if="detail && isEvidenceBusiness(detail)"
            class="secondary-button"
            type="button"
            @click="goEvidenceApply(detail)"
          >
            查看关联申请
          </button>
          <button
            v-if="detail && isEvidenceBusiness(detail)"
            class="ghost-button"
            type="button"
            @click="goEvidenceDetail(detail)"
          >
            查看存证详情
          </button>
          <button class="ghost-button" type="button" @click="goPrivacyDetail(detail?.privacyDataId)">查看关联隐私数据</button>
          <button class="ghost-button" type="button" @click="detailOpen = false">关闭</button>
        </div>
      </template>
    </AppDialog>
  </div>
</template>
