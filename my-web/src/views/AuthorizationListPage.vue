<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AppDialog from '../components/AppDialog.vue'
import AppPagination from '../components/AppPagination.vue'
import { router } from '../router'
import { authorizationsStore } from '../stores/authorizations'
import { messageStore } from '../stores/message'
import {
  buildRouteWithQuery,
  formatAuthorizationStatus,
  formatAuthorizationTargetType,
  formatDateTime,
  getTagClassByStatus,
} from '../utils/helpers'

const route = computed(() => router.currentRoute.value)
const query = computed(() => route.value.query)

const filters = reactive({
  pageNum: 1,
  pageSize: 10,
  privacyDataId: '',
  studentId: '',
  status: '',
  targetType: '',
})

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const pageError = ref('')

const records = computed(() => authorizationsStore.state.pageData.records)
const total = computed(() => authorizationsStore.state.pageData.total)

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

const resolveErrorMessage = (error) => error?.payload?.message || error?.message || '授权申请列表加载失败'

const loadPage = async () => {
  pageError.value = ''
  try {
    await authorizationsStore.loadPage(filters, { silent: true })
  } catch (error) {
    pageError.value = resolveErrorMessage(error)
    messageStore.error(pageError.value)
  }
}

const resetFilters = async () => {
  Object.assign(filters, {
    pageNum: 1,
    pageSize: 10,
    privacyDataId: query.value.get('privacyDataId') || '',
    studentId: '',
    status: '',
    targetType: '',
  })
  await loadPage()
}

const openDetail = async (row) => {
  detailOpen.value = true
  detailLoading.value = true
  try {
    detail.value = await authorizationsStore.loadDetail(row.applicationId, { silent: true })
  } catch (error) {
    messageStore.error(resolveErrorMessage(error))
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

const goApply = () => {
  router.navigate(buildRouteWithQuery('/authorization/apply', {
    privacyDataId: query.value.get('privacyDataId') || '',
  }))
}

const goPrivacyDetail = (privacyDataId) => {
  router.navigate(buildRouteWithQuery('/privacy/detail', { id: privacyDataId }))
}

const dismissCreatedNotice = () => {
  router.navigate(buildRouteWithQuery('/authorization/list', {
    privacyDataId: query.value.get('privacyDataId') || '',
  }))
}

const changePage = async (page) => {
  filters.pageNum = page
  await loadPage()
}

onMounted(async () => {
  filters.privacyDataId = query.value.get('privacyDataId') || ''
  await loadPage()
})
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P11</span>
          <h3>授权列表与详情</h3>
          <p>本阶段只开放授权申请列表与申请详情，用于回看学生发起的共享授权申请，不进入有效授权和撤销流程。</p>
        </div>
        <div class="action-row">
          <button class="secondary-button" type="button" @click="goApply">发起共享授权</button>
        </div>
      </div>

      <div v-if="createdReceipt" class="result-card result-good evidence-created-banner">
        <div>
          <strong>授权申请已提交</strong>
          <p>申请编号：{{ createdReceipt.applicationNo }}，当前状态：{{ formatAuthorizationStatus(createdReceipt.status) }}</p>
          <p>申请主键：{{ createdReceipt.applicationId }}</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="dismissCreatedNotice">收起提示</button>
        </div>
      </div>

      <div v-if="pageError" class="result-card result-bad evidence-created-banner">
        <div>
          <strong>授权申请列表加载失败</strong>
          <p>{{ pageError }}</p>
        </div>
      </div>

      <form class="toolbar authorization-filter-grid" @submit.prevent="loadPage">
        <input v-model.trim="filters.privacyDataId" placeholder="按隐私数据ID筛选" />
        <input v-model.trim="filters.studentId" placeholder="按学生ID筛选" />
        <select v-model="filters.status">
          <option value="">全部申请状态</option>
          <option value="PENDING_REVIEW">待审核</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已驳回</option>
        </select>
        <select v-model="filters.targetType">
          <option value="">全部目标对象</option>
          <option value="COUNSELOR">辅导员</option>
          <option value="TEACHING_ADMIN">教务管理员</option>
        </select>
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetFilters">重置</button>
        </div>
      </form>
    </section>

    <section class="panel">
      <div class="table-meta">
        <span>授权申请列表</span>
        <span>{{ authorizationsStore.loading.value ? '正在加载...' : '当前阶段只展示授权申请记录，不展示已生效授权与历史授权。' }}</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>申请主键</th>
            <th>申请编号</th>
            <th>隐私数据ID</th>
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
          <tr v-for="row in records" :key="row.applicationId">
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
                <button class="text-button" type="button" @click="openDetail(row)">查看详情</button>
                <button class="text-button" type="button" @click="goPrivacyDetail(row.privacyDataId)">查看关联隐私数据</button>
              </div>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="10" class="empty-cell">当前筛选条件下暂无授权申请记录</td>
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

    <AppDialog :open="detailOpen" title="授权申请详情" width="620px" @close="detailOpen = false">
      <div v-if="detailLoading" class="empty-block">正在加载申请详情...</div>
      <dl v-else-if="detail" class="detail-grid">
        <div>
          <dt>申请编号</dt>
          <dd>{{ detail.applicationNo || '--' }}</dd>
        </div>
        <div>
          <dt>隐私数据ID</dt>
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
      </dl>
      <div v-else class="empty-block">暂无申请详情</div>
    </AppDialog>
  </div>
</template>
