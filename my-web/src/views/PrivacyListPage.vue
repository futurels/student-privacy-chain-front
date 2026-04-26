<script setup>
import { computed, onMounted, reactive } from 'vue'
import AppPagination from '../components/AppPagination.vue'
import { privacyStore } from '../stores/privacy'
import { router } from '../router'
import {
  buildRouteWithQuery,
  formatDateTime,
  formatPrivacyDataType,
  formatPrivacyHandlingMode,
  formatPrivacyStatusForDisplay,
  getPrivacySubmissionGate,
  getTagClassByStatus,
  resolvePrivacyHandlingMode,
} from '../utils/helpers'
import { messageStore } from '../stores/message'

const filters = reactive({
  pageNum: 1,
  pageSize: 10,
  title: '',
  dataType: '',
  status: '',
})

const records = computed(() => privacyStore.state.pageData.records)
const total = computed(() => privacyStore.state.pageData.total)

const loadPage = () => privacyStore.loadPage(filters)

const resetFilters = async () => {
  Object.assign(filters, {
    pageNum: 1,
    pageSize: 10,
    title: '',
    dataType: '',
    status: '',
  })
  await loadPage()
}

const changePage = async (page) => {
  filters.pageNum = page
  await loadPage()
}

const openCreate = () => {
  router.navigate('/privacy/edit')
}

const openDetail = (row) => {
  router.navigate(buildRouteWithQuery('/privacy/detail', { id: row.id }))
}

const continueEdit = (row) => {
  router.navigate(buildRouteWithQuery('/privacy/edit', { id: row.id }))
}

const manageAttachments = (row) => {
  router.navigate(buildRouteWithQuery('/files/manage', { privacyDataId: row.id }))
}

const submitEvidence = (row) => {
  const gate = getPrivacySubmissionGate(row)
  if (!gate.canSubmit) {
    messageStore.info(gate.message)
    return
  }

  router.navigate(buildRouteWithQuery('/evidence/apply', {
    privacyDataId: row.id,
    source: 'p03',
  }))
}

const viewApplications = (row) => {
  router.navigate(buildRouteWithQuery('/evidence/list', {
    tab: 'applications',
    privacyDataId: row.id,
  }))
}

const getEvidenceId = (row = {}) => (
  row.evidenceId ||
  row.evidenceRecordId ||
  row.recordId ||
  row.evidence?.evidenceId ||
  row.record?.evidenceId ||
  row.evidenceRecord?.evidenceId ||
  ''
)

const viewRecords = (row) => {
  const evidenceId = getEvidenceId(row)
  if (evidenceId) {
    router.navigate(buildRouteWithQuery('/evidence/detail', {
      id: evidenceId,
      privacyDataId: row.id,
    }))
    return
  }

  router.navigate(buildRouteWithQuery('/evidence/list', {
    tab: 'evidences',
    privacyDataId: row.id,
  }))
}

const resolveAttachmentCount = (row) => row.attachmentCount || row.fileCount || row.attachCount || 0
const resolveUpdatedTime = (row) => row.updatedAt || row.updateTime || row.modifiedAt || row.createdAt || row.createTime
const getSubmissionHint = (row) => (
  resolvePrivacyHandlingMode(row) === 'STRUCTURED'
    ? '结构化数据内容完善后即可提交。'
    : resolvePrivacyHandlingMode(row) === 'MIXED'
      ? '混合数据需先完善内容并上传附件。'
      : '文件型数据需先上传附件。'
)

onMounted(loadPage)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P03</span>
          <h3>我的隐私数据</h3>
          <p>以隐私数据为中心查看、继续完善、管理附件和提交存证申请，支持中断后回来继续处理。</p>
        </div>
        <div class="action-row">
          <button class="primary-button" type="button" @click="openCreate">新建隐私数据</button>
        </div>
      </div>

      <form class="toolbar" @submit.prevent="loadPage">
        <input v-model.trim="filters.title" placeholder="按标题筛选" />
        <select v-model="filters.dataType">
          <option value="">全部数据类型</option>
          <option value="IDENTITY">身份信息</option>
          <option value="GRADE">成绩信息</option>
          <option value="STATUS">学籍状态</option>
          <option value="HEALTH_REPORT">健康报告</option>
        </select>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="DRAFT">草稿</option>
          <option value="READY_FOR_EVIDENCE">待提交存证</option>
          <option value="PENDING_REVIEW">审核中</option>
          <option value="PENDING_CHAIN">待执行上链</option>
          <option value="REJECTED">已驳回 / 待重新提交</option>
          <option value="CHAINED">已上链</option>
          <option value="CHAIN_FAILED">上链失败</option>
        </select>
        <div class="action-row">
          <button class="secondary-button" type="submit">查询</button>
          <button class="ghost-button" type="button" @click="resetFilters">重置</button>
        </div>
      </form>
    </section>

    <section class="panel">
      <div class="table-meta">
        <span>隐私数据列表</span>
        <span>{{ privacyStore.loading.value ? '正在加载...' : `共 ${total} 条记录` }}</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>数据类型</th>
            <th>安全等级</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>附件数量</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in records" :key="row.id">
            <td>
              <button class="text-button" type="button" @click="openDetail(row)">
                {{ row.title || `隐私数据 ${row.id}` }}
              </button>
              <div class="table-subtext">{{ formatPrivacyHandlingMode(resolvePrivacyHandlingMode(row)) }}：{{ getSubmissionHint(row) }}</div>
            </td>
            <td>{{ formatPrivacyDataType(row.dataType) }}</td>
            <td>{{ row.securityLevel || '--' }}</td>
            <td>
              <span class="tag" :class="getTagClassByStatus(row.status)">
                {{ formatPrivacyStatusForDisplay(row.status) }}
              </span>
            </td>
            <td>{{ formatDateTime(resolveUpdatedTime(row)) }}</td>
            <td>{{ resolveAttachmentCount(row) }}</td>
            <td>
              <div class="action-row">
                <button class="text-button" type="button" @click="continueEdit(row)">继续完善</button>
                <button class="text-button" type="button" @click="manageAttachments(row)">管理附件</button>
                <button class="text-button" type="button" @click="submitEvidence(row)">提交存证</button>
                <button class="text-button" type="button" @click="viewApplications(row)">查看申请</button>
                <button class="text-button" type="button" @click="viewRecords(row)">查看记录</button>
              </div>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="7" class="empty-cell">当前还没有隐私数据记录，可以先新建一条数据后再继续附件和存证流程。</td>
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
  </div>
</template>
