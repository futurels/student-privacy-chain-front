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
    if (authStore.hasRole('SYS_ADMIN')) {
      return '/system/users'
    }
    if (authStore.hasRole('STUDENT') || authStore.hasRole('TEACHING_ADMIN') || authStore.hasRole('COUNSELOR')) {
      return '/files/manage'
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
      this.navigate(this.getDefaultPath(), true)
      return false
    }

    if (target.meta.requiresAuth && !authStore.isAuthenticated.value) {
      const redirect = encodeURIComponent(target.fullPath)
      this.navigate(`/login?redirect=${redirect}`, true)
      return false
    }

    if (target.meta.roles?.length && !target.meta.roles.some((role) => authStore.hasRole(role))) {
      this.navigate('/403', true)
      return false
    }

    if (currentFullPath.value !== target.fullPath) {
      currentFullPath.value = target.fullPath
    }
    document.title = `${target.meta.title} - Student Privacy Data System`
    return true
  },
}

window.addEventListener('hashchange', () => {
  router.applyGuard(window.location.hash.slice(1) || '/')
})
