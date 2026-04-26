<script setup>
import { computed, ref } from 'vue'
import { authStore } from '../stores/auth'
import { router } from '../router'
import { formatRoleLabel } from '../utils/helpers'
import { messageStore } from '../stores/message'

const menus = computed(() => authStore.menuItems.value)
const route = computed(() => router.currentRoute.value)
const sidebarCollapsed = ref(false)

const pageHeading = computed(() => {
  const title = route.value?.meta?.title || ''
  return title.replace(/^P\d+\s*/, '') || '学生隐私数据系统'
})

const currentUserMeta = computed(() => {
  const departmentName = authStore.user.value?.departmentName || '未分配部门'
  const roleName = formatRoleLabel(authStore.user.value?.roleCodes?.[0])
  return `${departmentName} / ${roleName}`
})

const visibleMenuCount = computed(() => menus.value.length)

const go = (path) => {
  router.navigate(path)
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const showHelp = () => {
  messageStore.info('侧栏会按当前角色显示可访问菜单。若缺少入口，请先检查账号角色与菜单权限配置。', '使用说明')
}

const showGuide = () => {
  messageStore.info('建议按“隐私数据 -> 存证申请 -> 审批 -> 存证结果”的顺序联调，能更快跑通业务闭环。', '操作指南')
}

const showFeedback = () => {
  messageStore.info('如需补充联调入口，请记录角色、页面编码和接口路径，便于快速定位。', '反馈入口')
}

const logout = async () => {
  await authStore.logout()
  router.navigate('/login', true)
}
</script>

<template>
  <div class="admin-shell" :class="{ collapsed: sidebarCollapsed }">
    <aside class="shell-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="brand-block">
        <div class="brand-mark">SP</div>
        <div v-if="!sidebarCollapsed" class="brand-copy">
          <strong>学生隐私数据系统</strong>
          <p>前端管理台</p>
        </div>
      </div>

      <div class="side-nav-wrap">
        <div v-if="!sidebarCollapsed" class="side-section-title">功能菜单</div>
        <div v-if="!sidebarCollapsed" class="side-nav-meta">
          <span>当前可见功能</span>
          <strong>{{ visibleMenuCount }} 项</strong>
        </div>

        <nav class="side-nav">
          <button
            v-for="menu in menus"
            :key="menu.path"
            class="nav-item"
            :class="{ active: route.path === menu.path }"
            type="button"
            :title="`${menu.code} ${menu.title}`"
            @click="go(menu.path)"
          >
            <span>{{ menu.code }}</span>
            <strong v-if="!sidebarCollapsed">{{ menu.title }}</strong>
          </button>
        </nav>
      </div>

      <div class="sidebar-footer">
        <div class="sidebar-user-card">
          <div class="sidebar-user-avatar">{{ (authStore.user.value?.name || '用').slice(0, 1) }}</div>
          <div v-if="!sidebarCollapsed" class="sidebar-user-copy">
            <strong>{{ authStore.user.value?.name || '--' }}</strong>
            <p>{{ currentUserMeta }}</p>
          </div>
        </div>

        <div v-if="!sidebarCollapsed" class="sidebar-version">
          <span>系统版本</span>
          <strong>v1.0.0</strong>
        </div>

        <div v-if="!sidebarCollapsed" class="sidebar-guide-card">
          <strong>阶段说明</strong>
          <p>当前已开放登录、隐私数据、附件管理与数据存证闭环页面。</p>
        </div>

        <div class="sidebar-actions">
          <button class="sidebar-action-button" type="button" :title="sidebarCollapsed ? '帮助' : ''" @click="showHelp">
            {{ sidebarCollapsed ? '帮助' : '帮助说明' }}
          </button>
          <button class="sidebar-action-button" type="button" :title="sidebarCollapsed ? '指南' : ''" @click="showGuide">
            {{ sidebarCollapsed ? '指南' : '操作指南' }}
          </button>
          <button class="sidebar-action-button" type="button" :title="sidebarCollapsed ? '反馈' : ''" @click="showFeedback">
            {{ sidebarCollapsed ? '反馈' : '反馈入口' }}
          </button>
          <button class="sidebar-action-button" type="button" :title="sidebarCollapsed ? '展开菜单' : ''" @click="toggleSidebar">
            {{ sidebarCollapsed ? '展开' : '收起菜单' }}
          </button>
        </div>
      </div>
    </aside>

    <div class="shell-main">
      <header class="shell-header">
        <div>
          <div class="page-chip">{{ route.meta.title }}</div>
          <h2>{{ pageHeading }}</h2>
        </div>

        <div class="user-panel">
          <div>
            <strong>{{ authStore.user.value?.name || '--' }}</strong>
            <p>{{ currentUserMeta }}</p>
          </div>
          <button class="ghost-button" type="button" @click="logout">退出登录</button>
        </div>
      </header>

      <main class="shell-content">
        <slot />
      </main>
    </div>
  </div>
</template>
