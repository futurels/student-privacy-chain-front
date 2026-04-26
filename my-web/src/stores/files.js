import { reactive, ref } from 'vue'
import { filesApi } from '../api/files'
import { messageStore } from './message'

const state = reactive({
  files: [],
})

const loading = ref(false)

/**
 * 统一附件元数据。
 *
 * 上传返回、元数据查询和列表接口字段不完全一致，先在 store 层收敛，
 * 页面组件就可以稳定使用 fileId、digest、cid、status 等字段。
 */
const normalizeFile = (item = {}) => ({
  ...item,
  fileId: item.fileId,
  originalName: item.originalName,
  fileSize: item.fileSize ?? item.size ?? 0,
  contentType: item.contentType,
  digest: item.digest,
  cid: item.cid,
  status: item.status,
  uploadedAt: item.uploadedAt || item.createdAt || item.createTime || '',
  progress: item.progress ?? 100,
})

const upsert = (file) => {
  const normalized = normalizeFile(file)
  const index = state.files.findIndex((item) => item.fileId === normalized.fileId || item.localId === normalized.localId)
  if (index === -1) {
    state.files.unshift(normalized)
  } else {
    state.files[index] = { ...state.files[index], ...normalized }
  }
}

export const filesStore = {
  state,
  loading,
  reset() {
    state.files = []
  },
  seed(files = []) {
    state.files = files.map((item) => normalizeFile(item))
  },
  async loadByPrivacyData(privacyDataId) {
    if (!privacyDataId) {
      this.reset()
      return []
    }

    loading.value = true
    try {
      const result = await filesApi.getFilesByPrivacyDataId(privacyDataId)
      const records = Array.isArray(result) ? result : result.records || []
      state.files = records.map((item) => normalizeFile(item))
      return state.files
    } finally {
      loading.value = false
    }
  },
  async upload(payload) {
    const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    // 先插入本地占位记录，让用户立即看到上传进度；后端返回 fileId 后再合并真实元数据。
    upsert({
      localId,
      originalName: payload.file.name,
      fileSize: payload.file.size,
      contentType: payload.file.type || 'application/octet-stream',
      status: 'UPLOADING',
      progress: 0,
      digest: '',
      cid: '',
      uploadedAt: '',
      failedMessage: '',
    })

    const formData = new FormData()
    formData.append('file', payload.file)
    if (payload.privacyDataId) {
      // 已有隐私数据场景是“补充附件”，不能再用 studentId/dataType 新建主数据。
      formData.append('privacyDataId', payload.privacyDataId)
    } else {
      // 兼容早期“上传文件同时创建隐私数据”的接口形态。
      formData.append('studentId', payload.studentId)
      formData.append('dataType', payload.dataType)
      formData.append('securityLevel', payload.securityLevel)
    }

    try {
      const result = await filesApi.uploadFile(formData, (percent) => {
        upsert({ localId, progress: percent, status: percent >= 100 ? 'UPLOADED' : 'UPLOADING' })
      })
      upsert({
        localId,
        fileId: result.fileId,
        originalName: result.originalName,
        contentType: result.contentType,
        fileSize: result.fileSize ?? result.size,
        status: result.status,
        uploadedAt: result.uploadedAt || result.createdAt || result.createTime || '',
        progress: 100,
      })
      await this.refreshMetadata(result.fileId, localId, true)
      return result
    } catch (error) {
      // 上传失败仍保留失败记录，方便用户知道是哪一个本地文件出错。
      upsert({
        localId,
        status: 'FAILED',
        failedMessage: error.message || '上传失败',
      })
      throw error
    }
  },
  async refreshMetadata(fileId, localId = '', silent = false) {
    loading.value = true
    try {
      const metadata = await filesApi.getFileMetadata(fileId)
      // 元数据刷新会补齐 digest/CID，是后续 IPFS 索引和存证摘要展示的基础。
      upsert({
        localId,
        fileId: metadata.fileId,
        originalName: metadata.originalName,
        contentType: metadata.contentType,
        fileSize: metadata.fileSize ?? metadata.size,
        digest: metadata.digest,
        cid: metadata.cid,
        storageType: metadata.storageType,
        status: metadata.status || metadata.storageStatus,
        uploadedAt: metadata.uploadedAt || metadata.createdAt || metadata.createTime || '',
        progress: 100,
      })
      return metadata
    } finally {
      loading.value = false
      if (!silent) {
        messageStore.success('文件元数据已刷新。')
      }
    }
  },
  async verify(fileId) {
    const result = await filesApi.verifyFile(fileId)
    upsert({
      fileId: result.fileId,
      digest: result.storedDigest,
    })
    messageStore.success(result.matched ? '文件摘要校验通过。' : '文件摘要校验不一致。')
    return result
  },
}
