<script setup>
import { computed } from 'vue'
import { authStore } from '../stores/auth'
import { router } from '../router'
import { formatRoleLabel } from '../utils/helpers'

const menus = computed(() => authStore.menuItems.value)
const route = computed(() => router.currentRoute.value)

const go = (path) => {
  router.navigate(path)
}

const logout = async () => {
  await authStore.logout()
  router.navigate('/login', true)
}
</script>

<template>
  <div class="admin-shell">
    <aside class="shell-sidebar">
      <div class="brand-block">
        <div class="brand-mark">SP</div>
        <div>
          <strong>Student Privacy Data System</strong>
          <p>Front-end delivery by stage</p>
        </div>
      </div>

      <nav class="side-nav">
        <button
          v-for="menu in menus"
          :key="menu.path"
          class="nav-item"
          :class="{ active: route.path === menu.path }"
          type="button"
          @click="go(menu.path)"
        >
          <span>{{ menu.code }}</span>
          <strong>{{ menu.title }}</strong>
        </button>
      </nav>
    </aside>

    <div class="shell-main">
      <header class="shell-header">
        <div>
          <div class="page-chip">{{ route.meta.title }}</div>
          <h2>Stage-based Admin Console</h2>
        </div>

        <div class="user-panel">
          <div>
            <strong>{{ authStore.user.value?.name || '--' }}</strong>
            <p>
              {{ authStore.user.value?.departmentName || 'No Department' }}
              ·
              {{ formatRoleLabel(authStore.user.value?.roleCodes?.[0]) }}
            </p>
          </div>
          <button class="ghost-button" type="button" @click="logout">Logout</button>
        </div>
      </header>

      <main class="shell-content">
        <slot />
      </main>
    </div>
  </div>
</template>
