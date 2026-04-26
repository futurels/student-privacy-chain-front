import { computed, ref } from 'vue'
import { routeTable } from './routes'
import { authStore } from '../stores/auth'

const normalizePath = (input = '/') => {
  const value = input.startsWith('#') ? input.slice(1) : input
  if (!value || value === '/') {
    return '/'
  }
  return value.startsWith('/') ? value : `/${value}`
}

const parseFullPath = (input) => {
  const normalized = normalizePath(input)
  const [path, queryString] = normalized.split('?')
  const query = new URLSearchParams(queryString || '')
  return {
    path,
    fullPath: queryString ? `${path}?${queryString}` : path,
    query,
  }
}

const matchRoute = (fullPath) => {
  const parsed = parseFullPath(fullPath)
  const route = routeTable.find((item) => item.path === parsed.path)
  if (!route) {
    // 自研 hash 路由没有使用 vue-router，因此在这里集中兜底 404 元信息。
    return {
      path: '/404',
      fullPath: '/404',
      query: new URLSearchParams(),
      component: 'NotFoundPage',
      meta: routeTable.find((item) => item.path === '/404').meta,
    }
  }
  return {
    ...route,
    ...parsed,
  }
}

const currentFullPath = ref(normalizePath(window.location.hash.slice(1) || '/'))

const updateByHash = () => {
  currentFullPath.value = normalizePath(window.location.hash.slice(1) || '/')
}

const ensureHash = (fullPath, replace = false) => {
  const target = normalizePath(fullPath)
  if (replace) {
    // replace 用于登录重定向、权限拦截等场景，避免浏览器后退又回到非法页面。
    window.location.replace(`${window.location.pathname}${window.location.search}#${target}`)
    return
  }
  window.location.hash = target
}

export const router = {
  currentRoute: computed(() => matchRoute(currentFullPath.value)),
  start() {
    if (!window.location.hash) {
      ensureHash(currentFullPath.value || '/login', true)
    }
    window.addEventListener('hashchange', updateByHash)
  },
  navigate(path, replace = false) {
    ensureHash(path, replace)
  },
  getDefaultPath() {
    // 默认首页按角色落到最常用业务页面，体现“角色驱动菜单”的入口策略。
    if (authStore.hasRole('SYS_ADMIN')) {
      return '/system/users'
    }
    if (authStore.hasRole('COUNSELOR')) {
      return '/evidence/list'
    }
    if (authStore.hasRole('STUDENT')) {
      return '/privacy/list'
    }
    if (authStore.hasRole('TEACHING_ADMIN')) {
      return '/evidence/list'
    }
    return '/profile/security'
  },
  applyGuard(path) {
    const target = matchRoute(path)
    if (target.path === '/') {
      this.navigate(this.getDefaultPath(), true)
      return false
    }

    if (target.meta.guestOnly && authStore.isAuthenticated.value) {
      // 已登录用户访问登录页时直接进入业务首页，避免重复登录造成会话覆盖。
      this.navigate(this.getDefaultPath(), true)
      return false
    }

    if (target.meta.requiresAuth && !authStore.isAuthenticated.value) {
      const redirect = encodeURIComponent(target.fullPath)
      // 保留原目标地址，登录成功后可以回到用户原本要访问的页面。
      this.navigate(`/login?redirect=${redirect}`, true)
      return false
    }

    if (target.meta.roles?.length && !target.meta.roles.some((role) => authStore.hasRole(role))) {
      // 前端权限用于入口保护和体验优化，真正的数据权限仍以后端接口校验为准。
      this.navigate('/403', true)
      return false
    }

    if (currentFullPath.value !== target.fullPath) {
      currentFullPath.value = target.fullPath
    }
    document.title = `${target.meta.title} - 高校学生隐私数据存证与共享系统`
    return true
  },
}

window.addEventListener('hashchange', () => {
  router.applyGuard(window.location.hash.slice(1) || '/')
})
