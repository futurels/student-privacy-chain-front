<script setup>
import { computed, onMounted } from 'vue'
import { authStore } from './stores/auth'
import { messageStore } from './stores/message'
import { router } from './router'
import AppLayout from './components/AppLayout.vue'
import LoginPage from './views/LoginPage.vue'
import PrivacyListPage from './views/PrivacyListPage.vue'
import PrivacyDetailPage from './views/PrivacyDetailPage.vue'
import PrivacyEditPage from './views/PrivacyEditPage.vue'
import StudentArchivePage from './views/StudentArchivePage.vue'
import UserManagementPage from './views/UserManagementPage.vue'
import RoleDeptPage from './views/RoleDeptPage.vue'
import ProfileSecurityPage from './views/ProfileSecurityPage.vue'
import ForbiddenPage from './views/ForbiddenPage.vue'
import NotFoundPage from './views/NotFoundPage.vue'

const pageMap = {
  LoginPage,
  PrivacyListPage,
  PrivacyDetailPage,
  PrivacyEditPage,
  StudentArchivePage,
  UserManagementPage,
  RoleDeptPage,
  ProfileSecurityPage,
  ForbiddenPage,
  NotFoundPage,
}

const currentRoute = computed(() => router.currentRoute.value)
const currentView = computed(() => pageMap[currentRoute.value.component] || NotFoundPage)
const showLayout = computed(() => currentRoute.value.meta.layout !== false && authStore.isAuthenticated.value)

onMounted(async () => {
  await authStore.bootstrap()
  router.start()
  router.applyGuard(router.currentRoute.value.fullPath)
})
</script>

<template>
  <div v-if="!authStore.initialized.value" class="boot-screen">
    <div class="boot-card">
      <div class="boot-badge">Stage 3</div>
      <h1>Loading Student Privacy Data Module</h1>
      <p>Restoring token state and preparing routes for the current role.</p>
    </div>
  </div>
  <template v-else>
    <AppLayout v-if="showLayout">
      <component :is="currentView" />
    </AppLayout>
    <component :is="currentView" v-else />
  </template>

  <div class="message-stack">
    <transition-group name="toast">
      <div
        v-for="item in messageStore.items.value"
        :key="item.id"
        class="message-item"
        :class="`message-${item.type}`"
      >
        <strong>{{ item.title }}</strong>
        <span>{{ item.content }}</span>
      </div>
    </transition-group>
  </div>
</template>
