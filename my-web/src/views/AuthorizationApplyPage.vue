<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { router } from '../router'
import { privacyStore } from '../stores/privacy'
import { authorizationsStore } from '../stores/authorizations'
import {
  buildRouteWithQuery,
  formatDateTime,
  getTagClassByStatus,
} from '../utils/helpers'
import { messageStore } from '../stores/message'

const query = computed(() => router.currentRoute.value.query)
const routePrivacyDataId = computed(() => query.value.get('privacyDataId') || '')
const source = computed(() => query.value.get('source') || '')

const selectedShareData = ref(null)
const drawerVisible = ref(false)
const listLoading = ref(false)
const detailLoading = ref(false)
const submitting = ref(false)

const shareableRecords = ref([])
const pageData = reactive({
  total: 0,
  pageNum: 1,
  pageSize: 10,
})

const filters = reactive({
  title: '',
  dataType: '',
})

const form = reactive({
  targetType: 'COUNSELOR',
  targetId: '',
  purpose: '',
  expireAt: '',
})

const dataTypeOptions = [
  { value: 'IDENTITY', label: '身份信息' },
  { value: 'GRADE', label: '成绩信息' },
  { value: 'STATUS', label: '学籍状态' },
  { value: 'HEALTH_REPORT', label: '健康报告' },
  { value: 'FILE', label: '文件材料' },
]

const targetTypeOptions = [
  { value: 'COUNSELOR', label: '辅导员' },
  { value: 'TEACHING_ADMIN', label: '教务管理员' },
]

const maxPage = computed(() => Math.max(1, Math.ceil(pageData.total / pageData.pageSize)))

const filteredRecords = computed(() => {
  const keyword = filters.title.trim().toLowerCase()
  if (!keyword) {
    return shareableRecords.value
  }
  return shareableRecords.value.filter((item) => String(item.title || '').toLowerCase().includes(keyword))
})

const resolvePrivacyId = (record = {}) => record.id || record.privacyDataId || record.privacy_data_id || ''

const resolveDataType = (record = {}) => record.dataTypeName || record.dataType || record.dataTypeCode || ''

const formatDataType = (record = {}) => {
  const type = resolveDataType(record)
  const map = {
    IDENTITY: '身份信息',
    GRADE: '成绩信息',
    STATUS: '学籍状态',
    HEALTH_REPORT: '健康报告',
    FILE: '文件材料',
  }
  return map[type] || type || '--'
}

const formatTargetType = (type) => targetTypeOptions.find((item) => item.value === type)?.label || type || '--'

const formatShareStatus = (status) => {
  const map = {
    CHAINED: '已完成存证',
    PENDING_CHAIN: '待上链',
    READY_FOR_EVIDENCE: '待提交存证',
    DRAFT: '草稿',
    FAILED: '存证失败',
    CHAIN_FAILED: '存证失败',
    INVALIDATED: '已作废',
  }
  return map[status] || status || '--'
}

const resolveChainStatus = (record = {}) => record.chainStatus || record.status || ''

const resolveCreatedAt = (record = {}) => (
  record.createdAt ||
  record.createTime ||
  record.created_at ||
  record.gmtCreate ||
  record.createdTime ||
  record.updateTime ||
  record.updatedAt ||
  record.updated_at ||
  ''
)

const formatTxId = (txId = '') => {
  const value = String(txId || '')
  if (!value) {
    return '--'
  }
  if (value.length <= 24) {
    return value
  }
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

const canSelectShareData = (record = {}) => (
  record.canShare === true ||
  (record.status === 'CHAINED' && record.chainStatus === 'CHAINED')
)

const isSelected = (record = {}) => String(resolvePrivacyId(record)) === String(resolvePrivacyId(selectedShareData.value || {}))

const summaryText = computed(() => {
  if (!selectedShareData.value?.id) {
    return '请选择需要共享的隐私数据。'
  }

  const title = selectedShareData.value.title || `隐私数据 ${selectedShareData.value.id}`
  const target = form.targetId
    ? `${formatTargetType(form.targetType)}（${form.targetId}）`
    : '待填写目标对象。'
  const purpose = form.purpose || '待填写授权用途。'
  const expireAt = form.expireAt ? formatDateTime(form.expireAt) : '待选择到期时间。'

  return `将授权「${formatDataType(selectedShareData.value)} - ${title}」共享给「${target}」，用途为「${purpose}」，到期时间为「${expireAt}」。`
})

const selectedPrivacyDataId = computed(() => resolvePrivacyId(selectedShareData.value || ''))

const normalizeExpireAt = (value) => {
  if (!value) {
    return ''
  }
  return value.length === 16 ? `${value}:00` : value
}

const loadShareableData = async () => {
  listLoading.value = true
  try {
    const result = await privacyStore.loadShareablePrivacyData({
      pageNum: pageData.pageNum,
      pageSize: pageData.pageSize,
      dataType: filters.dataType,
    })
    shareableRecords.value = result.records || []
    pageData.total = result.total || 0
    pageData.pageNum = result.pageNum || pageData.pageNum
    pageData.pageSize = result.pageSize || pageData.pageSize
    return shareableRecords.value
  } finally {
    listLoading.value = false
  }
}

const setSelectedShareData = (record) => {
  selectedShareData.value = record || null
  privacyStore.selectShareData(record || null)
}

const loadDetailById = async (id, options = {}) => {
  const { silent = false } = options
  if (!id) {
    setSelectedShareData(null)
    if (!silent) {
      messageStore.warning('请先选择需要共享的数据')
    }
    return null
  }

  detailLoading.value = true
  try {
    const detail = await privacyStore.loadDetail(id)
    setSelectedShareData(detail)
    return detail
  } finally {
    detailLoading.value = false
  }
}

const initByRoute = async () => {
  if (routePrivacyDataId.value) {
    await loadDetailById(routePrivacyDataId.value, { silent: true })
    return
  }
  setSelectedShareData(null)
}

const openDrawer = async () => {
  drawerVisible.value = true
  pageData.pageNum = 1
  await loadShareableData()
}

const closeDrawer = () => {
  drawerVisible.value = false
}

const searchData = async () => {
  pageData.pageNum = 1
  await loadShareableData()
}

const resetFilters = async () => {
  filters.title = ''
  filters.dataType = ''
  pageData.pageNum = 1
  await loadShareableData()
}

const resetForm = () => {
  setSelectedShareData(null)
  form.targetType = 'COUNSELOR'
  form.targetId = ''
  form.purpose = ''
  form.expireAt = ''
}

const changePage = async (delta) => {
  const nextPage = pageData.pageNum + delta
  if (nextPage < 1 || nextPage > maxPage.value) {
    return
  }
  pageData.pageNum = nextPage
  await loadShareableData()
}

const selectPrivacyData = (row) => {
  if (!canSelectShareData(row)) {
    messageStore.warning(row.shareBlockReason || '该数据暂不可共享')
    return
  }
  setSelectedShareData(row)
  closeDrawer()
}

const copyTxId = async (txId) => {
  if (!txId) {
    return
  }
  await navigator.clipboard?.writeText(txId)
  messageStore.success('交易哈希已复制')
}

const goBack = () => {
  if (source.value === 'p04') {
    router.navigate(buildRouteWithQuery('/privacy/detail', { id: routePrivacyDataId.value || selectedPrivacyDataId.value }))
    return
  }

  if (source.value === 'p03') {
    router.navigate('/privacy/list')
    return
  }

  router.navigate('/privacy/list')
}

const goList = () => {
  router.navigate(buildRouteWithQuery('/authorization/list', {
    privacyDataId: selectedPrivacyDataId.value || routePrivacyDataId.value,
  }))
}

const validateForm = () => {
  if (!selectedShareData.value) {
    messageStore.warning('请先选择需要共享的数据')
    return false
  }
  if (selectedShareData.value.canShare === false) {
    messageStore.warning(selectedShareData.value.shareBlockReason || '该数据暂不可共享')
    return false
  }
  if (selectedShareData.value.status !== 'CHAINED') {
    messageStore.warning('该数据尚未完成存证，不能发起共享授权')
    return false
  }
  if (selectedShareData.value.chainStatus && selectedShareData.value.chainStatus !== 'CHAINED') {
    messageStore.warning('该数据尚未完成区块链存证，不能发起共享授权')
    return false
  }
  if (!form.targetType) {
    messageStore.warning('请选择目标对象类型')
    return false
  }
  if (!targetTypeOptions.some((item) => item.value === form.targetType)) {
    messageStore.warning('目标对象类型仅支持辅导员或教务管理员')
    return false
  }
  if (!form.targetId.trim()) {
    messageStore.warning('请输入目标对象标识')
    return false
  }
  if (!form.expireAt) {
    messageStore.warning('请选择授权到期时间')
    return false
  }
  if (new Date(form.expireAt).getTime() <= Date.now()) {
    messageStore.warning('到期时间必须晚于当前时间')
    return false
  }
  if (!form.purpose.trim()) {
    messageStore.warning('请填写授权用途')
    return false
  }
  return true
}

const isSourceNotChainedError = (error = {}) => {
  const message = error.message || error.payload?.message || ''
  return (
    error.code === 'AUTHZ_400_04' ||
    error.code === 'AUTHORIZATION_SOURCE_NOT_CHAINED' ||
    error.payload?.errorCode === 'AUTHORIZATION_SOURCE_NOT_CHAINED' ||
    message.includes('尚未完成存证') ||
    message.includes('尚未完成区块链存证') ||
    message.includes('缺少链上交易凭证')
  )
}

const submitApplication = async () => {
  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const submittedPrivacyDataId = selectedShareData.value.id
    const result = await authorizationsStore.submitApplication({
      privacyDataId: Number(submittedPrivacyDataId),
      targetType: form.targetType,
      targetId: form.targetId.trim(),
      purpose: form.purpose.trim(),
      expireAt: normalizeExpireAt(form.expireAt),
    }, { silent: true })

    resetForm()
    router.navigate(buildRouteWithQuery('/authorization/list', {
      privacyDataId: result.privacyDataId || submittedPrivacyDataId,
      createdApplicationId: result.applicationId,
      createdApplicationNo: result.applicationNo,
      createdStatus: result.status,
    }))
  } catch (error) {
    const content = error.payload?.message || error.message || '提交授权申请失败'
    if (isSourceNotChainedError(error)) {
      messageStore.warning(content)
    } else {
      messageStore.error(content)
    }
  } finally {
    submitting.value = false
  }
}

watch(
  routePrivacyDataId,
  async () => {
    await initByRoute()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  privacyStore.clearSelectedShareData()
})
</script>

<template>
  <div class="authorization-apply page-stack">
    <section class="panel intro-panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P10 发起共享授权</span>
          <h3>发起共享授权</h3>
          <p>只有已完成区块链存证的数据才能发起共享授权。未完成存证的数据请先完成存证申请、审批和上链登记。</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="goBack">返回上一页</button>
          <button class="secondary-button" type="button" @click="goList">查看申请列表</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header compact-header">
        <div>
          <span class="page-chip">共享数据</span>
          <h3>已选择共享数据</h3>
        </div>
        <button class="secondary-button" type="button" @click="openDrawer">
          {{ selectedShareData ? '重新选择共享数据' : '选择共享数据' }}
        </button>
      </div>

      <div v-if="detailLoading" class="empty-block compact-empty">正在加载隐私数据...</div>

      <div v-else-if="selectedShareData" class="selected-data-card">
        <div class="selected-data-main">
          <strong>{{ selectedShareData.title || `隐私数据 ${selectedShareData.id}` }}</strong>
          <div class="selected-data-tags">
            <span class="tag tag-blue">{{ formatDataType(selectedShareData) }}</span>
            <span class="tag tag-blue">安全等级：{{ selectedShareData.securityLevel || '--' }}</span>
            <span class="tag" :class="getTagClassByStatus(resolveChainStatus(selectedShareData))">
              {{ formatShareStatus(resolveChainStatus(selectedShareData)) }}
            </span>
          </div>
        </div>
        <div class="selected-data-meta">
          <span>数据ID：{{ selectedShareData.id }}</span>
          <span>存证编号：{{ selectedShareData.evidenceNo || '--' }}</span>
          <span>交易哈希：{{ formatTxId(selectedShareData.txId) }}</span>
          <span>创建时间：{{ formatDateTime(resolveCreatedAt(selectedShareData)) }}</span>
        </div>
      </div>

      <div v-else class="empty-block compact-empty">
        <strong>请选择一条已完成区块链存证的数据发起共享授权</strong>
        <p>当前页面只展示可共享数据，草稿、待提交存证和待上链数据不会出现在选择列表中。</p>
        <button class="primary-button" type="button" @click="openDrawer">选择共享数据</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header compact-header">
        <div>
          <span class="page-chip">申请表单</span>
          <h3>授权对象与策略</h3>
        </div>
      </div>

      <form class="auth-form-grid" @submit.prevent="submitApplication">
        <label class="field">
          <span>目标对象类型</span>
          <select v-model="form.targetType">
            <option v-for="item in targetTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>目标对象标识</span>
          <input v-model.trim="form.targetId" placeholder="请输入被授权对象账号、工号或机构标识" />
        </label>

        <label class="field">
          <span>授权到期时间</span>
          <input v-model="form.expireAt" type="datetime-local" />
        </label>

        <label class="field full-field">
          <span>授权用途</span>
          <textarea
            v-model.trim="form.purpose"
            rows="5"
            placeholder="请填写授权用途，例如：成绩核验、学籍核验、竞赛报名材料审查"
          ></textarea>
        </label>
      </form>
    </section>

    <section class="panel">
      <div class="panel-header compact-header">
        <div>
          <span class="page-chip">预览区</span>
          <h3>申请摘要预览</h3>
        </div>
      </div>

      <div class="preview-summary">
        <p>{{ summaryText }}</p>
        <div class="summary-footnote">提交后申请将进入审批流程，审批通过后授权才会生效。</div>
      </div>
    </section>

    <section class="submit-bar">
      <button class="ghost-button" type="button" @click="goBack">返回上一页</button>
      <button class="secondary-button" type="button" @click="goList">查看申请列表</button>
      <button class="ghost-button" type="button" @click="resetForm">重置</button>
      <button class="primary-button" type="button" :disabled="submitting || detailLoading" @click="submitApplication">
        {{ submitting ? '提交中...' : '提交授权申请' }}
      </button>
    </section>

    <div v-if="drawerVisible" class="drawer-mask" @click.self="closeDrawer">
      <aside class="privacy-drawer">
        <div class="drawer-header">
          <div>
            <span class="page-chip">选择共享数据</span>
            <h3>选择共享数据</h3>
            <p>仅展示已完成区块链存证、可发起共享授权的数据。</p>
          </div>
          <button class="ghost-button" type="button" @click="closeDrawer">关闭</button>
        </div>

        <div class="drawer-filters">
          <input v-model.trim="filters.title" placeholder="按标题关键词搜索" @keyup.enter="searchData" />
          <select v-model="filters.dataType">
            <option value="">全部数据类型</option>
            <option v-for="item in dataTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <div class="chain-only-badge">已完成存证</div>
          <button class="secondary-button" type="button" @click="searchData">查询</button>
          <button class="ghost-button" type="button" @click="resetFilters">重置</button>
        </div>

        <div v-if="listLoading" class="empty-block compact-empty">正在加载可共享隐私数据...</div>
        <div v-else-if="!filteredRecords.length" class="empty-block compact-empty">
          <strong>暂无可共享数据</strong>
          <p>当前没有已完成存证的数据。你可以先到“我的隐私数据”中提交存证申请，待审核并完成上链后再发起共享授权。</p>
        </div>
        <div v-else class="drawer-list">
          <article
            v-for="row in filteredRecords"
            :key="resolvePrivacyId(row)"
            class="drawer-item"
            :class="{ active: isSelected(row) }"
          >
            <div class="drawer-item-main">
              <strong>{{ row.title || `隐私数据 ${resolvePrivacyId(row)}` }}</strong>
              <div class="selected-data-tags">
                <span class="tag tag-blue">{{ formatDataType(row) }}</span>
                <span class="tag tag-blue">安全等级：{{ row.securityLevel || '--' }}</span>
                <span class="tag" :class="getTagClassByStatus(resolveChainStatus(row))">
                  {{ formatShareStatus(resolveChainStatus(row)) }}
                </span>
              </div>
              <div class="drawer-item-meta">
                <span>ID：{{ resolvePrivacyId(row) }}</span>
                <span>存证编号：{{ row.evidenceNo || '--' }}</span>
                <span>创建时间：{{ formatDateTime(resolveCreatedAt(row)) }}</span>
              </div>
              <div class="tx-row">
                <span>交易哈希：{{ formatTxId(row.txId) }}</span>
                <button v-if="row.txId" class="text-button" type="button" @click="copyTxId(row.txId)">复制</button>
              </div>
            </div>
            <button
              class="secondary-button"
              type="button"
              :disabled="!canSelectShareData(row)"
              @click="selectPrivacyData(row)"
            >
              {{ canSelectShareData(row) ? (isSelected(row) ? '已选择' : '选择') : (row.shareBlockReason || '暂不可共享') }}
            </button>
          </article>
        </div>

        <div class="drawer-pagination">
          <span>第 {{ pageData.pageNum }} 页 / 共 {{ maxPage }} 页，共 {{ pageData.total }} 条</span>
          <div class="action-row">
            <button class="ghost-button" type="button" :disabled="pageData.pageNum <= 1" @click="changePage(-1)">上一页</button>
            <button class="ghost-button" type="button" :disabled="pageData.pageNum >= maxPage" @click="changePage(1)">下一页</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.authorization-apply {
  max-width: 1180px;
  margin: 0 auto;
}

.intro-panel {
  overflow: hidden;
}

.compact-header {
  align-items: center;
}

.compact-empty {
  min-height: auto;
  padding: 22px 24px;
  display: grid;
  gap: 10px;
  justify-items: flex-start;
}

.selected-data-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border: 1px solid rgba(33, 85, 165, 0.16);
  border-radius: 18px;
  background: linear-gradient(135deg, #f7fbff 0%, #edf5ff 100%);
}

.selected-data-main {
  display: grid;
  gap: 12px;
}

.selected-data-main strong {
  color: #1f2d3d;
  font-size: 22px;
}

.selected-data-tags,
.selected-data-meta,
.drawer-item-meta,
.tx-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  color: #5f7395;
  font-size: 13px;
}

.selected-data-meta {
  align-content: center;
  justify-content: flex-end;
  min-width: 300px;
}

.auth-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.full-field {
  grid-column: 1 / -1;
}

.preview-summary {
  display: grid;
  gap: 14px;
  padding: 22px;
  border: 1px solid rgba(33, 85, 165, 0.12);
  border-radius: 18px;
  background: #f8fbff;
}

.preview-summary p {
  margin: 0;
  color: #1f2d3d;
  font-size: 17px;
  line-height: 1.8;
}

.summary-footnote {
  color: #5f7395;
  font-size: 14px;
}

.submit-bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0 4px;
  background: linear-gradient(180deg, rgba(244, 248, 253, 0.1), #f4f8fd 55%);
}

.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: flex-end;
  background: rgba(13, 32, 61, 0.28);
}

.privacy-drawer {
  width: min(760px, 92vw);
  height: 100vh;
  padding: 24px;
  overflow-y: auto;
  background: #f7fbff;
  box-shadow: -18px 0 48px rgba(13, 32, 61, 0.18);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.drawer-header h3 {
  margin: 10px 0 4px;
  color: #1f2d3d;
  font-size: 24px;
}

.drawer-header p {
  margin: 0;
  color: #5f7395;
}

.drawer-filters {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto auto auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.chain-only-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  background: #eaf7f0;
  color: #16824b;
  font-weight: 700;
  white-space: nowrap;
}

.drawer-list {
  display: grid;
  gap: 12px;
}

.drawer-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid rgba(33, 85, 165, 0.12);
  border-radius: 18px;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.drawer-item.active {
  border-color: rgba(33, 85, 165, 0.42);
  background: #eef5ff;
  box-shadow: 0 12px 28px rgba(27, 74, 146, 0.08);
}

.drawer-item-main {
  display: grid;
  gap: 10px;
}

.drawer-item-main strong {
  color: #1f2d3d;
  font-size: 17px;
}

.drawer-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  color: #5f7395;
  font-size: 14px;
}

@media (max-width: 900px) {
  .selected-data-card,
  .drawer-item,
  .drawer-pagination {
    align-items: flex-start;
    flex-direction: column;
  }

  .selected-data-meta {
    justify-content: flex-start;
    min-width: 0;
  }

  .auth-form-grid,
  .drawer-filters {
    grid-template-columns: 1fr;
  }

  .submit-bar {
    flex-wrap: wrap;
  }
}
</style>
