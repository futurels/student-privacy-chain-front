import { http } from './http'

export const accessLogsApi = {
  getPage(params = {}, options = {}) {
    return http.get('/api/access-logs', params, options)
  },
}
