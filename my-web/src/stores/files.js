import { reactive, ref } from 'vue'
import { filesApi } from '../api/files'
import { messageStore } from './message'

const state = reactive({
  files: [],
})

const loading = ref(false)

const upsert = (file) => {
  const index = state.files.findIndex((item) => item.fileId === file.fileId || item.localId === file.localId)
  if (index === -1) {
    state.files.unshift(file)
  } else {
    state.files[index] = { ...state.files[index], ...file }
  }
}

export const filesStore = {
  state,
  loading,
  reset() {
    state.files = []
  },
  seed(files = []) {
    state.files = files.map((item) => ({ ...item }))
  },
  async upload(payload) {
    const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    upsert({
      localId,
      originalName: payload.file.name,
      size: payload.file.size,
      contentType: payload.file.type || 'application/octet-stream',
      status: 'UPLOADING',
      progress: 0,
      digest: '',
      cid: '',
      storageType: '',
      failedMessage: '',
    })

    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('studentId', payload.studentId)
    formData.append('dataType', payload.dataType)
    formData.append('securityLevel', payload.securityLevel)

    try {
      const result = await filesApi.uploadFile(formData, (percent) => {
        upsert({ localId, progress: percent, status: percent >= 100 ? 'UPLOADED' : 'UPLOADING' })
      })
      upsert({
        localId,
        fileId: result.fileId,
        originalName: result.originalName,
        contentType: result.contentType,
        size: result.size,
        status: result.status,
        progress: 100,
      })
      await this.refreshMetadata(result.fileId, localId, true)
      return result
    } catch (error) {
      upsert({
        localId,
        status: 'FAILED',
        failedMessage: error.message || 'Upload failed',
      })
      throw error
    }
  },
  async refreshMetadata(fileId, localId = '', silent = false) {
    loading.value = true
    try {
      const metadata = await filesApi.getFileMetadata(fileId)
      upsert({
        localId,
        fileId: metadata.fileId,
        originalName: metadata.originalName,
        contentType: metadata.contentType,
        size: metadata.size,
        digest: metadata.digest,
        cid: metadata.cid,
        storageType: metadata.storageType,
      })
      return metadata
    } finally {
      loading.value = false
      if (!silent) {
        messageStore.success('File metadata refreshed.')
      }
    }
  },
  async verify(fileId) {
    const result = await filesApi.verifyFile(fileId)
    upsert({
      fileId: result.fileId,
      digest: result.storedDigest,
    })
    messageStore.success(result.matched ? 'Digest matched.' : 'Digest mismatch detected.')
    return result
  },
}
