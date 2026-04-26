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
  // 登录失效或退出登录时必须同时清空权限缓存，避免旧菜单在新会话中短暂闪现。
  setToken('')
  state.user = null
  state.roles = []
  state.departments = []
  state.permissionsTree = []
}

const canAccessApproval = () => (
  authStore.hasRole('COUNSELOR') ||
  authStore.hasRole('TEACHING_ADMIN') ||
  authStore.hasRole('SYS_ADMIN')
)

export const authStore = {
  state,
  initialized,
  isAuthenticated: computed(() => Boolean(state.token && state.user)),
  user: computed(() => state.user),
  loading: computed(() => state.loading),
  menuItems: computed(() => {
    const items = []

    // 菜单按角色即时计算，保证登录、退出或角色变化后界面入口和权限状态一致。
    if (authStore.hasRole('STUDENT')) {
      items.push({ path: '/privacy/list', title: '我的隐私数据', code: 'P03' })
    }

    if (authStore.hasRole('TEACHING_ADMIN') || authStore.hasRole('SYS_ADMIN')) {
      items.push({ path: '/files/manage', title: '文件附件管理', code: 'P06' })
    }

    if (canAccessApproval()) {
      items.push({ path: '/approval/center', title: '审批中心', code: 'P13' })
      items.push({ path: '/approval/records', title: '审批记录', code: 'P17' })
    }

    if (authStore.hasRole('STUDENT') || authStore.hasRole('COUNSELOR') || authStore.hasRole('TEACHING_ADMIN')) {
      items.push({ path: '/evidence/list', title: '存证申请与记录', code: 'P08' })
    }

    if (authStore.hasRole('SYS_ADMIN')) {
      items.push({ path: '/system/users', title: '用户管理', code: 'P21' })
      items.push({ path: '/system/roles', title: '角色权限与部门管理', code: 'P22' })
    }

    items.push({ path: '/profile/security', title: '个人中心与安全设置', code: 'P25' })
    return items
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
      // 页面刷新后用本地 token 拉取用户信息；失败时直接清会话，避免使用过期 token。
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
      // 系统管理员页面需要角色、部门、权限树作为基础字典；用 allSettled 保证单项失败不影响登录。
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
      // 登录成功后立即回填用户与菜单权限，避免进入首页时还没有角色上下文。
      await this.fetchCurrentUser()
      messageStore.success('当前用户会话与菜单权限已初始化。', '登录成功')
      return state.user
    } finally {
      state.loading = false
    }
  },
  async logout() {
    try {
      await authApi.logout()
    } catch {
      // 忽略退出接口失败。
    }
    clearSession()
  },
  async changePassword(payload) {
    state.loading = true
    try {
      const result = await authApi.updatePassword(payload)
      messageStore.success('密码修改成功。')
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
  // HTTP 层只负责识别 401，真正的会话清理放在 authStore 中，便于后续统一扩展。
  authStore.consumeUnauthorized()
  window.location.hash = '/login'
}

http.onForbidden = () => {
  if (window.location.hash !== '#/403') {
    window.location.hash = '/403'
  }
}
