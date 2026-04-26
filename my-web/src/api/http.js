import { tokenStorage } from '../utils/storage'
import { messageStore } from '../stores/message'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const UPLOAD_PROGRESS_DONE = 100
const DOWNLOAD_URL_REVOKE_DELAY = 1000

const joinUrl = (path) => {
  if (!API_BASE) {
    return path
  }
  return `${API_BASE}${path}`
}

const buildQuery = (params = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    // 过滤空值，避免未填写的筛选项覆盖后端默认查询条件。
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
    // 后端接口可能返回数字码或字符串码，这里统一收敛成功语义。
    return normalized === '0' || normalized === 'SUCCESS' || normalized === 'OK'
  }

  return false
}

const unwrapResponse = async (response) => {
  // 统一兼容 JSON 业务响应和无响应体异常，避免每个 API 方法重复拆 code/message/data。
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

const handleRequestError = (context, error, silent = false) => {
  if (error.status === 401) {
    // 登录态失效由 authStore 接管会话清理，调用方只需要感知跳转结果。
    messageStore.warning('登录状态已失效，请重新登录。', '401 未授权')
    context.onUnauthorized?.()
  } else if (error.status === 403) {
    messageStore.warning('当前账号无权访问该功能。', '403 无权限')
    context.onForbidden?.()
  } else if (!silent) {
    messageStore.error(error.message || '接口请求失败')
  }
}

/**
 * 前端统一 HTTP 访问层。
 *
 * 所有业务 API 都经过这里，以保证 token 注入、业务 code 解包、
 * 401/403 跳转和上传下载行为一致，便于联调时集中排查问题。
 */
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
      // Bearer token 在这里统一注入，页面和 store 层不需要关心认证头细节。
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
      handleRequestError(this, error, options.silent)
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
          // 上传使用 XHR 是为了拿到原生 progress 事件，fetch 当前不适合做进度条。
          const percent = Math.round((event.loaded / event.total) * UPLOAD_PROGRESS_DONE)
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
          const error = new Error(json.message || '上传失败')
          error.status = xhr.status
          error.code = json.code
          reject(error)
        } catch (error) {
          reject(error)
        }
      }

      xhr.onerror = () => {
        reject(new Error('上传失败'))
      }

      xhr.send(formData)
    }).catch((error) => {
      handleRequestError(this, error, options.silent)
      if (!options.silent && ![401, 403].includes(error.status)) {
        messageStore.error(error.message || '上传失败')
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
      const error = new Error(`下载失败，状态码 ${response.status}`)
      error.status = response.status
      handleRequestError(this, error, options.silent)
      throw error
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    if (options.inline) {
      // 预览场景需要 object URL；下载场景则由本方法创建隐藏链接直接触发。
      return url
    }

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = options.filename || 'download'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_REVOKE_DELAY)
    return null
  },
}
