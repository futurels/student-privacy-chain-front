import { computed, reactive, ref } from 'vue'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'
import { http } from '../api/http'
import { tokenStorage } from '../utils/storage'
import { messageStore } from './message'

const state = reactive({
  token: tokenStorage.get(),
  user: null,
  loading: false,
  roles: [],
  departments: [],
  permissionsTree: [],
})

const initialized = ref(false)

const setToken = (token) => {
  state.token = token || ''
  if (token) {
    tokenStorage.set(token)
  } else {
    tokenStorage.clear()
  }
}

const clearSession = () => {
  setToken('')
  state.user = null
  state.roles = []
  state.departments = []
  state.permissionsTree = []
}

export const authStore = {
  state,
  initialized,
  isAuthenticated: computed(() => Boolean(state.token && state.user)),
  user: computed(() => state.user),
  loading: computed(() => state.loading),
  menuItems: computed(() => {
    const base = [
      { path: '/profile/security', title: 'Profile & Security', code: 'P25' },
    ]
    if (authStore.hasRole('SYS_ADMIN')) {
      return [
        { path: '/system/users', title: 'User Management', code: 'P21' },
        { path: '/system/roles', title: 'Role & Department', code: 'P22' },
        ...base,
      ]
    }
    return base
  }),
  hasRole(role) {
    return Boolean(state.user?.roleCodes?.includes(role))
  },
  async bootstrap() {
    if (!state.token) {
      initialized.value = true
      return
    }
    try {
      state.loading = true
      await this.fetchCurrentUser()
    } catch {
      clearSession()
    } finally {
      state.loading = false
      initialized.value = true
    }
  },
  async fetchCurrentUser() {
    const user = await authApi.getCurrentUser()
    state.user = user
    if (this.hasRole('SYS_ADMIN')) {
      const [roles, departments, permissions] = await Promise.allSettled([
        usersApi.getRoles(),
        usersApi.getDepartments(),
        usersApi.getPermissionsTree(),
      ])
      state.roles = roles.status === 'fulfilled' ? roles.value.records || [] : []
      state.departments = departments.status === 'fulfilled' ? departments.value.records || [] : []
      state.permissionsTree = permissions.status === 'fulfilled' ? permissions.value.nodes || [] : []
    }
    return user
  },
  async login(payload) {
    state.loading = true
    try {
      const loginResult = await authApi.login(payload)
      setToken(loginResult.accessToken)
      await this.fetchCurrentUser()
      messageStore.success('User session and menu permissions have been initialized.', 'Login Success')
      return state.user
    } finally {
      state.loading = false
    }
  },
  async logout() {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout API failure.
    }
    clearSession()
  },
  async changePassword(payload) {
    state.loading = true
    try {
      const result = await authApi.updatePassword(payload)
      messageStore.success('Password updated successfully.')
      return result
    } finally {
      state.loading = false
    }
  },
  consumeUnauthorized() {
    clearSession()
  },
}

http.onUnauthorized = () => {
  authStore.consumeUnauthorized()
  window.location.hash = '/login'
}

http.onForbidden = () => {
  if (window.location.hash !== '#/403') {
    window.location.hash = '/403'
  }
}
