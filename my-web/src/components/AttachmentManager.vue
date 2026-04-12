<script setup>
import { computed, reactive, ref } from 'vue'
import { filesStore } from '../stores/files'
import { filesApi } from '../api/files'
import { messageStore } from '../stores/message'
import { authStore } from '../stores/auth'
import { formatFileSize } from '../utils/file'

const props = defineProps({
  title: {
    type: String,
    default: '附件管理',
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

const manualQuery = reactive({
  fileId: '',
  cid: '',
})
const previewUrl = ref('')

const files = computed(() => filesStore.state.files)
const canGenerateCid = computed(() => authStore.hasRole('SYS_ADMIN') || authStore.hasRole('TEACHING_ADMIN'))

const onSelectFiles = async (event) => {
  const selectedFiles = Array.from(event.target.files || [])
  if (!selectedFiles.length) {
    return
  }
  if (!props.studentId || !props.dataType || !props.securityLevel) {
    messageStore.warning('请先填写 studentId、dataType 和 securityLevel。')
    return
  }
  for (const file of selectedFiles) {
    await filesStore.upload({
      file,
      studentId: String(props.studentId),
      dataType: props.dataType,
      securityLevel: props.securityLevel,
    })
  }
  event.target.value = ''
}

const queryMetadata = async () => {
  if (manualQuery.fileId) {
    await filesStore.refreshMetadata(manualQuery.fileId)
  }
  if (manualQuery.cid) {
    const result = await filesApi.getIpfsByCid(manualQuery.cid)
    messageStore.info(`CID 已关联到文件 fileId=${result.fileId}。`)
  }
}

const withConfirm = (message) => window.confirm(message)

const preview = async (item) => {
  if (!withConfirm('预览高敏文件可能暴露隐私内容，是否继续？')) {
    return
  }
  previewUrl.value = await filesApi.previewFile(item.fileId)
  window.open(previewUrl.value, '_blank', 'noopener,noreferrer')
}

const download = async (item) => {
  if (!withConfirm('下载高敏文件可能在本地留下副本，是否继续？')) {
    return
  }
  await filesApi.downloadFile(item.fileId, item.originalName || 'attachment')
}

const verify = async (item) => {
  await filesStore.verify(item.fileId)
}

const uploadIpfs = async (item) => {
  const result = await filesApi.uploadToIpfs({ fileId: item.fileId, pin: true })
  await filesStore.refreshMetadata(item.fileId, '', true)
  messageStore.success(`CID 生成成功：${result.cid}`)
}
</script>

<template>
  <section class="panel attachment-panel">
    <div class="panel-header">
      <div>
        <span class="page-chip">P06</span>
        <h3>{{ title }}</h3>
        <p>这里统一管理上传进度、文件状态、元数据、摘要和 CID。</p>
      </div>
      <input v-if="!readonly" class="file-input" type="file" multiple @change="onSelectFiles" />
    </div>

    <div class="toolbar toolbar-files">
      <input v-model.trim="manualQuery.fileId" placeholder="按 fileId 查询元数据" />
      <input v-model.trim="manualQuery.cid" placeholder="按 CID 查询文件索引（可选）" />
      <button class="secondary-button" type="button" @click="queryMetadata">查询</button>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>文件主键</th>
          <th>原始文件名</th>
          <th>文件大小</th>
          <th>文件类型</th>
          <th>摘要</th>
          <th>CID</th>
          <th>状态</th>
          <th>进度</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in files" :key="item.fileId || item.localId">
          <td>{{ item.fileId || '--' }}</td>
          <td>{{ item.originalName || '--' }}</td>
          <td>{{ formatFileSize(item.size) }}</td>
          <td>{{ item.contentType || '--' }}</td>
          <td><code class="inline-code">{{ item.digest || '--' }}</code></td>
          <td><code class="inline-code">{{ item.cid || '--' }}</code></td>
          <td>
            <span class="tag" :class="item.status === 'FAILED' ? 'tag-red' : item.status === 'UPLOADING' ? 'tag-blue' : 'tag-green'">
              {{ item.status || '--' }}
            </span>
            <div v-if="item.failedMessage" class="error-text">{{ item.failedMessage }}</div>
          </td>
          <td>
            <div class="progress-box">
              <div class="progress-bar" :style="{ width: `${item.progress || 0}%` }"></div>
            </div>
            <small>{{ item.progress || 0 }}%</small>
          </td>
          <td>
            <div class="action-row">
              <button class="text-button" type="button" :disabled="!item.fileId" @click="preview(item)">预览</button>
              <button class="text-button" type="button" :disabled="!item.fileId" @click="download(item)">下载</button>
              <button class="text-button" type="button" :disabled="!item.fileId" @click="verify(item)">校验摘要</button>
              <button class="text-button" type="button" :disabled="!item.fileId" @click="filesStore.refreshMetadata(item.fileId)">刷新元数据</button>
              <button
                v-if="canGenerateCid"
                class="text-button"
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
          <td colspan="9" class="empty-cell">暂无附件记录</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
