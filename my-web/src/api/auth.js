import { http } from './http'

export const authApi = {
  login(payload) {
    return http.post('/api/auth/login', payload)
  },
  logout() {
    return http.post('/api/auth/logout', {})
  },
  getCurrentUser() {
    return http.get('/api/auth/me')
  },
  updatePassword(payload) {
    return http.put('/api/auth/password', payload)
  },
  refreshToken(payload) {
    return http.post('/api/auth/refresh', payload)
  },
}
