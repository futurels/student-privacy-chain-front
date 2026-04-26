<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { filesStore } from '../stores/files'
import { filesApi } from '../api/files'
import { messageStore } from '../stores/message'
import { authStore } from '../stores/auth'
import { formatFileSize } from '../utils/file'
import { formatDateTime } from '../utils/helpers'

const props = defineProps({
  title: {
    type: String,
    default: '附件管理',
  },
  privacyDataId: {
    type: [String, Number],
    default: '',
  },
  privacyTitle: {
    type: String,
    default: '',
  },
  privacyStatus: {
    type: String,
    default: '',
  },
  studentId: {
    type: [String, Number],
    default: '',
  },
  dataType: {
    type: String,
    default: '',
  },
  securityLevel: {
    type: String,
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['files-updated'])

const manualQuery = reactive({
  fileId: '',
  cid: '',
})

const previewUrl = ref('')
const selectingFiles = ref(false)
const uploading = ref(false)
const fileInputRef = ref(null)
let selectionResetTimer = null
let scrollResetTimer = null

const files = computed(() => filesStore.state.files)
const canGenerateCid = computed(() => authStore.hasRole('SYS_ADMIN') || authStore.hasRole('TEACHING_ADMIN'))
const canUpload = computed(() => !props.readonly && Boolean(props.privacyDataId))
const entryModeLabel = computed(() => (props.privacyDataId ? '已有隐私数据附件模式' : '未选择隐私数据'))
const totalFiles = computed(() => files.value.length)
const cidReadyCount = computed(() => files.value.filter((item) => Boolean(item.cid)).length)
const pendingCidCount = computed(() => files.value.filter((item) => item.fileId && !item.cid && item.status !== 'FAILED').length)
const failedCount = computed(() => files.value.filter((item) => item.status === 'FAILED').length)

const debugUploadState = (stage, extra = {}) => {
  if (!import.meta.env.DEV) {
    return
  }
  console.debug('[AttachmentManager]', stage, {
    privacyDataId: props.privacyDataId,
    selectingFiles: selectingFiles.value,
    uploading: uploading.value,
    fileCount: files.value.length,
    ...extra,
  })
}

const getScrollContainer = () => document.querySelector('.shell-main')

const restoreWorkspaceScroll = (scrollTop) => {
  const container = getScrollContainer()
  if (!container || typeof scrollTop !== 'number') {
    return
  }
  container.scrollTop = scrollTop
  debugUploadState('scroll-restored', { scrollTop })
}

const preserveWorkspaceScroll = () => {
  const container = getScrollContainer()
  const scrollTop = container?.scrollTop ?? 0
  debugUploadState('scroll-captured', { scrollTop })
  // 文件选择框会触发浏览器焦点变化，这里恢复工作区滚动位置，避免上传后页面跳动。
  window.requestAnimationFrame(() => restoreWorkspaceScroll(scrollTop))
  if (scrollResetTimer) {
    window.clearTimeout(scrollResetTimer)
  }
  scrollResetTimer = window.setTimeout(() => restoreWorkspaceScroll(scrollTop), 160)
}

const fileStatusMap = {
  UPLOADING: { label: '上传中', className: 'tag-blue' },
  UPLOADED: { label: '已上传', className: 'tag-blue' },
  SUCCESS: { label: '成功', className: 'tag-green' },
  STORED: { label: '已入库', className: 'tag-green' },
  FAILED: { label: '失败', className: 'tag-red' },
}

const resolveFileStatus = (status) => fileStatusMap[status] || { label: status || '--', className: 'tag-blue' }

const scheduleSelectionReset = () => {
  if (selectionResetTimer) {
    window.clearTimeout(selectionResetTimer)
  }
  selectionResetTimer = window.setTimeout(() => {
    if (!uploading.value) {
      // 用户打开文件框后取消选择时，原生 input 不一定触发 change，需要定时回收选择态。
      selectingFiles.value = false
      debugUploadState('file-dialog-closed-without-selection')
    }
  }, 300)
}

const openFileDialog = () => {
  if (!canUpload.value || uploading.value) {
    return
  }
  selectingFiles.value = true
  preserveWorkspaceScroll()
  scheduleSelectionReset()
  fileInputRef.value?.click()
}

watch(
  () => props.privacyDataId,
  async (privacyDataId) => {
    debugUploadState('privacy-context-changed', { nextPrivacyDataId: privacyDataId })
    if (!privacyDataId) {
      // 未绑定隐私数据时不请求附件列表，避免把上一个详情页的附件误显示到当前页面。
      filesStore.reset()
      return
    }

    try {
      await filesStore.loadByPrivacyData(privacyDataId)
      debugUploadState('file-list-loaded')
    } catch (error) {
      debugUploadState('file-list-load-failed', { message: error.message || 'unknown-error' })
      messageStore.warning(error.message || '附件列表刷新失败，已保留当前工作区显示。')
    }
  },
  { immediate: true },
)

const onSelectFiles = async (event) => {
  const selectedFiles = Array.from(event.target.files || [])
  selectingFiles.value = true
  debugUploadState('file-input-change', { selectedCount: selectedFiles.length })

  if (!selectedFiles.length) {
    selectingFiles.value = false
    preserveWorkspaceScroll()
    return
  }

  if (!props.privacyDataId) {
    // 当前组件的主语义是“给已有隐私数据补附件”，缺少主键时不能继续上传。
    messageStore.warning('请先创建或选择隐私数据。')
    event.target.value = ''
    selectingFiles.value = false
    preserveWorkspaceScroll()
    return
  }

  if (!props.studentId || !props.dataType || !props.securityLevel) {
    messageStore.warning('请先补全学生档案、数据类型和安全等级。')
    event.target.value = ''
    selectingFiles.value = false
    preserveWorkspaceScroll()
    return
  }

  uploading.value = true
  debugUploadState('upload-start', {
    selectedNames: selectedFiles.map((file) => file.name),
  })
  try {
    // 多文件逐个上传，便于在 store 中按文件维护独立进度和失败状态。
    for (const file of selectedFiles) {
      await filesStore.upload({
        file,
        privacyDataId: String(props.privacyDataId),
        studentId: String(props.studentId),
        dataType: props.dataType,
        securityLevel: props.securityLevel,
      })
    }
    emit('files-updated')
    debugUploadState('upload-success')
  } catch (error) {
    debugUploadState('upload-failed', { message: error.message || 'unknown-error' })
    throw error
  } finally {
    uploading.value = false
    selectingFiles.value = false
    event.target.value = ''
    event.target.blur?.()
    preserveWorkspaceScroll()
    debugUploadState('upload-finish')
  }
}

const queryMetadata = async () => {
  if (manualQuery.fileId) {
    await filesStore.refreshMetadata(manualQuery.fileId)
    emit('files-updated')
  }
  if (manualQuery.cid) {
    const result = await filesApi.getIpfsByCid(manualQuery.cid)
    messageStore.info(`该 CID 已关联文件，文件ID=${result.fileId}。`)
  }
}

const withConfirm = (message) => window.confirm(message)

const preview = async (item) => {
  if (!withConfirm('预览敏感文件可能暴露隐私内容，是否继续？')) {
    return
  }
  previewUrl.value = await filesApi.previewFile(item.fileId)
  window.open(previewUrl.value, '_blank', 'noopener,noreferrer')
}

const download = async (item) => {
  if (!withConfirm('下载敏感文件可能在本地留下副本，是否继续？')) {
    return
  }
  await filesApi.downloadFile(item.fileId, item.originalName || '附件')
}

const verify = async (item) => {
  await filesStore.verify(item.fileId)
}

const refreshItemMetadata = async (fileId) => {
  await filesStore.refreshMetadata(fileId)
  emit('files-updated')
}

const uploadIpfs = async (item) => {
  const result = await filesApi.uploadToIpfs({ fileId: item.fileId, pin: true })
  // CID 由外部 IPFS 服务生成，生成后立即刷新本地元数据，保证列表与后端索引一致。
  await filesStore.refreshMetadata(item.fileId, '', true)
  emit('files-updated')
  messageStore.success(`CID 生成成功：${result.cid}`)
}

const copyText = async (text) => {
  if (!text || text === '--') {
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    messageStore.success('已复制到剪贴板。')
  } catch {
    messageStore.warning('当前环境暂不支持自动复制，请手工复制。')
  }
}
</script>

<template>
  <section class="panel attachment-panel">
    <div class="panel-header attachment-header-lite">
      <div>
        <div class="page-chip">{{ entryModeLabel }}</div>
        <h3>{{ title }}</h3>
        <p>{{ canUpload
          ? '当前页面正在为已存在的隐私数据补充附件，上传动作会绑定到当前 privacyDataId，不会切换到新的主数据上下文。'
          : '当前未选定隐私数据，附件区不会发起列表请求，也不会执行上传。请先从隐私数据列表或详情页进入。' }}</p>
      </div>
    </div>

    <div class="attachment-binding-strip">
      <div class="attachment-binding-main">
        <span class="attachment-strip-badge" :class="canUpload ? 'is-ready' : 'is-waiting'">
          {{ canUpload ? '已绑定' : '未绑定' }}
        </span>
        <div>
          <strong>{{ canUpload ? `当前绑定隐私数据ID：${privacyDataId}` : '请先创建或选择隐私数据' }}</strong>
          <p>{{ canUpload ? '上传成功后只会刷新当前隐私数据的附件列表和详情状态，不会创建新的隐私数据卡片。' : '当前没有 privacyDataId，不会发起附件列表请求，也不会进入上传流程。' }}</p>
        </div>
      </div>
      <div class="tag-row">
        <span class="tag tag-blue">{{ privacyTitle || '未绑定标题' }}</span>
        <span class="tag" :class="canUpload ? 'tag-green' : 'tag-red'">{{ privacyStatus || '待选择' }}</span>
      </div>
    </div>

    <div class="attachment-control-row">
      <div class="attachment-upload-inline" :class="{ disabled: !canUpload }">
        <div>
          <strong>{{ canUpload ? '为当前隐私数据补充附件' : '附件上传已禁用' }}</strong>
          <p>{{ canUpload ? '本次上传只会挂接到当前隐私数据，不会新建新的隐私数据记录。' : '请先从 P03、P04 或 P05 进入某条隐私数据的附件工作区。' }}</p>
          <p v-if="selectingFiles && !uploading">正在等待选择文件，当前工作区会保持原样显示。</p>
          <p v-if="uploading">正在上传文件，仅局部刷新附件列表与统计数据。</p>
        </div>
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          multiple
          :disabled="!canUpload || uploading"
          tabindex="-1"
          @change="onSelectFiles"
        />
        <button class="upload-trigger" :class="{ disabled: !canUpload }" type="button" :disabled="!canUpload || uploading" @click="openFileDialog">
          <span>{{ uploading ? '正在上传...' : canUpload ? '选择文件并挂接到当前数据' : '等待选择隐私数据' }}</span>
        </button>
      </div>

      <div class="attachment-search-inline">
        <div class="attachment-search-title">查询元数据</div>
        <div class="attachment-search-grid">
          <input v-model.trim="manualQuery.fileId" placeholder="按文件ID查询元数据" />
          <input v-model.trim="manualQuery.cid" placeholder="按 CID 查询文件索引（可选）" />
          <button class="secondary-button" type="button" @click="queryMetadata">查询</button>
        </div>
      </div>
    </div>

    <div class="attachment-support-row">
      <div class="attachment-guide-card">
        <div class="attachment-guide-title">附件工作说明</div>
        <div class="attachment-guide-list">
          <div class="attachment-guide-item">
            <strong>请求规则</strong>
            <span>只有拿到 privacyDataId 时，才会请求 `GET /api/files?privacyDataId=...`，并按当前数据刷新附件列表。</span>
          </div>
          <div class="attachment-guide-item">
            <strong>补附件语义</strong>
            <span>当前工作区默认是“给已有隐私数据补充附件”，不是“上传文件再新建一条数据”。</span>
          </div>
          <div class="attachment-guide-item">
            <strong>CID 用途</strong>
            <span>CID 可作为 IPFS 索引标识，供后续存证与链上关联流程使用。</span>
          </div>
        </div>
      </div>

      <div class="attachment-stats-card">
        <div class="attachment-search-title">当前附件概况</div>
        <div class="attachment-stats-grid">
          <div class="attachment-stat-item">
            <span>附件总数</span>
            <strong>{{ totalFiles }}</strong>
          </div>
          <div class="attachment-stat-item">
            <span>已生成 CID</span>
            <strong>{{ cidReadyCount }}</strong>
          </div>
          <div class="attachment-stat-item">
            <span>待生成 CID</span>
            <strong>{{ pendingCidCount }}</strong>
          </div>
          <div class="attachment-stat-item">
            <span>异常记录</span>
            <strong>{{ failedCount }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="table-meta attachment-table-meta">
      <span>附件列表</span>
      <span>{{ canUpload ? `当前记录数：${files.length}` : '请先创建或选择隐私数据' }}</span>
    </div>

    <div class="attachment-table-shell">
      <table class="data-table attachment-table">
        <thead>
          <tr>
            <th class="col-id">文件ID</th>
            <th class="col-name">文件名称</th>
            <th class="col-size">文件大小</th>
            <th class="col-type">文件类型</th>
            <th class="col-code">摘要</th>
            <th class="col-code">CID</th>
            <th class="col-status">状态</th>
            <th class="col-time">上传时间</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in files" :key="item.fileId || item.localId">
            <td>{{ item.fileId || '--' }}</td>
            <td>
              <div class="file-name-cell" :title="item.originalName || '--'">
                {{ item.originalName || '--' }}
              </div>
            </td>
            <td>{{ formatFileSize(item.fileSize) }}</td>
            <td>
              <div class="file-type-cell" :title="item.contentType || '--'">
                {{ item.contentType || '--' }}
              </div>
            </td>
            <td>
              <div class="code-cell">
                <code class="inline-code" :title="item.digest || '--'">{{ item.digest || '--' }}</code>
                <button class="copy-button" type="button" :disabled="!item.digest" @click="copyText(item.digest)">复制</button>
              </div>
            </td>
            <td>
              <div class="code-cell">
                <code class="inline-code" :title="item.cid || '--'">{{ item.cid || '--' }}</code>
                <button class="copy-button" type="button" :disabled="!item.cid" @click="copyText(item.cid)">复制</button>
              </div>
            </td>
            <td>
              <span class="tag" :class="resolveFileStatus(item.status).className">
                {{ resolveFileStatus(item.status).label }}
              </span>
              <div v-if="item.failedMessage" class="error-text">{{ item.failedMessage }}</div>
            </td>
            <td>{{ formatDateTime(item.uploadedAt) }}</td>
            <td>
              <div class="action-group">
                <button class="table-action" type="button" :disabled="!item.fileId" @click="preview(item)">预览</button>
                <button class="table-action" type="button" :disabled="!item.fileId" @click="download(item)">下载</button>
                <button class="table-action" type="button" :disabled="!item.fileId" @click="verify(item)">校验摘要</button>
                <button class="table-action" type="button" :disabled="!item.fileId" @click="refreshItemMetadata(item.fileId)">刷新元数据</button>
                <button
                  v-if="canGenerateCid"
                  class="table-action"
                  type="button"
                  :disabled="!item.fileId || item.cid"
                  @click="uploadIpfs(item)"
                >
                  生成 CID
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!files.length">
            <td colspan="9" class="empty-cell">
              <div class="attachment-empty">
                <strong>{{ canUpload ? '当前还没有附件' : '请先创建或选择隐私数据' }}</strong>
                <p>{{ canUpload ? '当前 privacyDataId 下还没有附件，上传后的附件会直接挂在这条隐私数据下面。' : '由于当前没有 privacyDataId，前端不会发起附件列表请求，也不会触发上传。' }}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
