import { tokenStorage } from '../utils/storage'
import { messageStore } from '../stores/message'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const joinUrl = (path) => {
  if (!API_BASE) {
    return path
  }
  return `${API_BASE}${path}`
}

const buildQuery = (params = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      search.set(key, value)
    }
  })
  const value = search.toString()
  return value ? `?${value}` : ''
}

const isSuccessCode = (code) => {
  if (code === undefined || code === null || code === '') {
    return true
  }

  if (typeof code === 'number') {
    return code === 0
  }

  if (typeof code === 'string') {
    const normalized = code.trim().toUpperCase()
    return normalized === '0' || normalized === 'SUCCESS' || normalized === 'OK'
  }

  return false
}

const unwrapResponse = async (response) => {
  const json = await response.json().catch(() => ({
    code: response.ok ? 0 : response.status,
    message: response.statusText,
    data: null,
  }))

  if (!response.ok || !isSuccessCode(json.code)) {
    const error = new Error(json.message || '请求失败')
    error.status = response.status
    error.code = json.code
    error.payload = json
    throw error
  }

  return json.data
}

export const http = {
  onUnauthorized: null,
  onForbidden: null,
  async request(path, options = {}) {
    const token = tokenStorage.get()
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(joinUrl(path), {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
      return await unwrapResponse(response)
    } catch (error) {
      if (error.status === 401) {
        messageStore.warning('登录状态已失效，请重新登录。', '401 未授权')
        this.onUnauthorized?.()
      } else if (error.status === 403) {
        messageStore.warning('当前账号无权访问该功能。', '403 无权限')
        this.onForbidden?.()
      } else if (!options.silent) {
        messageStore.error(error.message || '接口请求失败')
      }
      throw error
    }
  },
  get(path, params, options = {}) {
    return this.request(`${path}${buildQuery(params)}`, { ...options, method: 'GET' })
  },
  post(path, body, options = {}) {
    return this.request(path, { ...options, method: 'POST', body })
  },
  put(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PUT', body })
  },
  patch(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PATCH', body })
  },
  delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' })
  },
  upload(path, formData, options = {}) {
    const token = tokenStorage.get()
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(options.method || 'POST', joinUrl(path), true)
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          options.onProgress?.(percent, event)
        }
      }

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText || '{}')
          if (xhr.status >= 200 && xhr.status < 300 && isSuccessCode(json.code)) {
            resolve(json.data)
            return
          }
          const error = new Error(json.message || 'Upload failed')
          error.status = xhr.status
          error.code = json.code
          reject(error)
        } catch (error) {
          reject(error)
        }
      }

      xhr.onerror = () => {
        reject(new Error('Upload failed'))
      }

      xhr.send(formData)
    }).catch((error) => {
      if (!options.silent) {
        messageStore.error(error.message || 'Upload failed')
      }
      throw error
    })
  },
  async download(path, params = {}, options = {}) {
    const token = tokenStorage.get()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(`${joinUrl(path)}${buildQuery(params)}`, {
      method: 'GET',
      headers,
    })
    if (!response.ok) {
      const error = new Error(`Download failed with status ${response.status}`)
      error.status = response.status
      throw error
    }
    const blob = await response.blob()
    if (options.inline) {
      return URL.createObjectURL(blob)
    }
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = options.filename || 'download'
    anchor.click()
    URL.revokeObjectURL(url)
    return null
  },
}
