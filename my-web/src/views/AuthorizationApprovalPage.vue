<script setup>
import { computed, onMounted, ref } from 'vue'
import { router } from '../router'
import { authorizationsStore } from '../stores/authorizations'
import { messageStore } from '../stores/message'
import {
  buildRouteWithQuery,
  formatAuthorizationStatus,
  formatAuthorizationTargetType,
  formatDateTime,
  formatPrivacyDataType,
  getTagClassByStatus,
} from '../utils/helpers'

const query = computed(() => router.currentRoute.value.query)
const applicationId = computed(() => query.value.get('id') || query.value.get('applicationId') || '')
const source = computed(() => query.value.get('source') || '/approval/center')

const detail = ref(null)
const loading = ref(false)
const submitting = ref(false)
const rejectReason = ref('')
const actionResult = ref(null)

const isPending = computed(() => (actionResult.value?.status || detail.value?.status) === 'PENDING_REVIEW')

const resolveTitle = computed(() => (
  detail.value?.privacyTitle ||
  detail.value?.privacyDataTitle ||
  detail.value?.title ||
  `隐私数据 ${detail.value?.privacyDataId || '--'}`
))

const loadDetail = async () => {
  if (!applicationId.value) {
    messageStore.warning('缺少授权申请主键')
    return
  }

  loading.value = true
  try {
    detail.value = await authorizationsStore.loadDetail(applicationId.value)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.navigate(source.value || '/approval/center')
}

const goAuthorizationList = () => {
  router.navigate(buildRouteWithQuery('/authorization/list', {
    privacyDataId: detail.value?.privacyDataId || '',
  }))
}

const approve = async () => {
  if (!detail.value?.applicationId || submitting.value) {
    return
  }

  submitting.value = true
  try {
    actionResult.value = await authorizationsStore.approve(detail.value.applicationId, {
      reviewComment: '审批通过',
    })
    await loadDetail()
  } finally {
    submitting.value = false
  }
}

const reject = async () => {
  if (!detail.value?.applicationId || submitting.value) {
    return
  }

  if (!rejectReason.value.trim()) {
    messageStore.warning('驳回申请时请填写驳回原因')
    return
  }

  submitting.value = true
  try {
    actionResult.value = await authorizationsStore.reject(detail.value.applicationId, {
      reviewComment: rejectReason.value.trim(),
      reason: rejectReason.value.trim(),
    })
    await loadDetail()
  } finally {
    submitting.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P15 授权审批详情</span>
          <h3>授权审批详情</h3>
          <p>核对授权申请的数据对象、被授权对象和授权策略后，执行通过或驳回。本阶段只处理授权申请审批。</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="goBack">返回审批中心</button>
          <button class="secondary-button" type="button" @click="goAuthorizationList">查看申请列表</button>
        </div>
      </div>
    </section>

    <div v-if="loading" class="panel empty-block">正在加载授权审批详情...</div>

    <template v-else-if="detail">
      <section class="metric-grid">
        <article class="metric-card">
          <span>申请编号</span>
          <strong>{{ detail.applicationNo || '--' }}</strong>
        </article>
        <article class="metric-card">
          <span>当前状态</span>
          <strong>
            <span class="tag" :class="getTagClassByStatus(detail.status)">
              {{ formatAuthorizationStatus(detail.status) }}
            </span>
          </strong>
        </article>
        <article class="metric-card">
          <span>隐私数据ID</span>
          <strong>{{ detail.privacyDataId || '--' }}</strong>
        </article>
        <article class="metric-card">
          <span>到期时间</span>
          <strong>{{ formatDateTime(detail.expireAt) }}</strong>
        </article>
      </section>

      <section class="approval-grid">
        <article class="panel">
          <div class="panel-header compact-header">
            <div>
              <span class="page-chip">数据对象</span>
              <h3>被授权隐私数据</h3>
            </div>
          </div>
          <dl class="detail-grid">
            <div>
              <dt>数据标题</dt>
              <dd>{{ resolveTitle }}</dd>
            </div>
            <div>
              <dt>数据类型</dt>
              <dd>{{ detail.dataTypeName || formatPrivacyDataType(detail.dataType) }}</dd>
            </div>
            <div>
              <dt>安全等级</dt>
              <dd>{{ detail.securityLevel || '--' }}</dd>
            </div>
            <div>
              <dt>存证编号</dt>
              <dd>{{ detail.evidenceNo || '--' }}</dd>
            </div>
            <div>
              <dt>交易哈希</dt>
              <dd><code class="inline-code">{{ detail.txId || '--' }}</code></dd>
            </div>
          </dl>
        </article>

        <article class="panel">
          <div class="panel-header compact-header">
            <div>
              <span class="page-chip">授权对象</span>
              <h3>被授权对象</h3>
            </div>
          </div>
          <dl class="detail-grid">
            <div>
              <dt>对象类型</dt>
              <dd>{{ formatAuthorizationTargetType(detail.targetType) }}</dd>
            </div>
            <div>
              <dt>对象标识</dt>
              <dd>{{ detail.targetId || '--' }}</dd>
            </div>
            <div>
              <dt>申请学生</dt>
              <dd>{{ detail.studentName || detail.studentId || '--' }}</dd>
            </div>
            <div>
              <dt>提交时间</dt>
              <dd>{{ formatDateTime(detail.submittedAt) }}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section class="panel">
        <div class="panel-header compact-header">
          <div>
            <span class="page-chip">授权策略</span>
            <h3>用途与审批意见</h3>
          </div>
        </div>
        <dl class="detail-grid">
          <div>
            <dt>授权用途</dt>
            <dd>{{ detail.purpose || '--' }}</dd>
          </div>
          <div>
            <dt>授权到期时间</dt>
            <dd>{{ formatDateTime(detail.expireAt) }}</dd>
          </div>
          <div>
            <dt>审批意见</dt>
            <dd>{{ detail.reviewComment || actionResult?.reviewComment || '--' }}</dd>
          </div>
          <div>
            <dt>审批时间</dt>
            <dd>{{ formatDateTime(detail.reviewedAt || actionResult?.reviewedAt) }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <div class="panel-header compact-header">
          <div>
            <span class="page-chip">审批操作</span>
            <h3>{{ isPending ? '处理授权申请' : '审批结果' }}</h3>
          </div>
        </div>

        <div v-if="isPending" class="review-form">
          <label class="field">
            <span>驳回原因</span>
            <textarea
              v-model.trim="rejectReason"
              rows="4"
              placeholder="驳回时必须填写原因；审批通过可不填写。"
            ></textarea>
          </label>
          <div class="action-row">
            <button class="primary-button" type="button" :disabled="submitting" @click="approve">
              {{ submitting ? '处理中...' : '审批通过' }}
            </button>
            <button class="danger-button" type="button" :disabled="submitting" @click="reject">
              驳回申请
            </button>
          </div>
        </div>

        <div v-else class="notice-card">
          <strong>当前申请已处理</strong>
          <p>学生端 P11 授权申请列表会展示最新审批状态。</p>
        </div>
      </section>
    </template>

    <section v-else class="panel empty-block">暂无授权审批详情</section>
  </div>
</template>

<style scoped>
.approval-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.compact-header {
  align-items: center;
}

.review-form {
  display: grid;
  gap: 16px;
}

.danger-button {
  border: 0;
  border-radius: 14px;
  padding: 12px 18px;
  background: #c93a32;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

.danger-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 900px) {
  .approval-grid {
    grid-template-columns: 1fr;
  }
}
</style>
