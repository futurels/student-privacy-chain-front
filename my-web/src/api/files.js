import { http } from './http'

export const filesApi = {
  uploadFile(formData, onProgress) {
    return http.upload('/api/files/upload', formData, { onProgress })
  },
  getFileMetadata(id) {
    return http.get(`/api/files/${id}`)
  },
  verifyFile(id) {
    return http.post(`/api/files/${id}/verify`, {})
  },
  previewFile(id) {
    return http.download(`/api/files/${id}/download`, { inline: true }, { inline: true })
  },
  downloadFile(id, filename) {
    return http.download(`/api/files/${id}/download`, { inline: false }, { filename })
  },
  uploadToIpfs(payload) {
    return http.post('/api/ipfs/upload', payload)
  },
  getIpfsByCid(cid) {
    return http.get(`/api/ipfs/cids/${cid}`)
  },
}
