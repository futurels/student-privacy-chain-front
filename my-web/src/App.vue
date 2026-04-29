<script setup>
import { computed, onMounted } from 'vue'
import { authStore } from './stores/auth'
import { messageStore } from './stores/message'
import { router } from './router'
import AppLayout from './components/AppLayout.vue'
import LoginPage from './views/LoginPage.vue'
import PrivacyListPage from './views/PrivacyListPage.vue'
import FileAttachmentPage from './views/FileAttachmentPage.vue'
import PrivacyDetailPage from './views/PrivacyDetailPage.vue'
import PrivacyEditPage from './views/PrivacyEditPage.vue'
import AuthorizationApplyPage from './views/AuthorizationApplyPage.vue'
import AuthorizationListPage from './views/AuthorizationListPage.vue'
import AuthorizationApprovalPage from './views/AuthorizationApprovalPage.vue'
import AccessLogsPage from './views/AccessLogsPage.vue'
import StudentArchivePage from './views/StudentArchivePage.vue'
import EvidenceApplyPage from './views/EvidenceApplyPage.vue'
import EvidenceListPage from './views/EvidenceListPage.vue'
import EvidenceDetailPage from './views/EvidenceDetailPage.vue'
import EvidenceApprovalPage from './views/EvidenceApprovalPage.vue'
import ApprovalRecordsPage from './views/ApprovalRecordsPage.vue'
import UserManagementPage from './views/UserManagementPage.vue'
import RoleDeptPage from './views/RoleDeptPage.vue'
import ProfileSecurityPage from './views/ProfileSecurityPage.vue'
import ForbiddenPage from './views/ForbiddenPage.vue'
import NotFoundPage from './views/NotFoundPage.vue'

const pageMap = {
  LoginPage,
  PrivacyListPage,
  FileAttachmentPage,
  PrivacyDetailPage,
  PrivacyEditPage,
  AuthorizationApplyPage,
  AuthorizationListPage,
  AuthorizationApprovalPage,
  AccessLogsPage,
  StudentArchivePage,
  EvidenceApplyPage,
  EvidenceListPage,
  EvidenceDetailPage,
  EvidenceApprovalPage,
  ApprovalRecordsPage,
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
      <div class="boot-badge">第六阶段</div>
      <h1>正在加载授权访问与留痕模块</h1>
      <p>正在准备隐私数据、存证申请、授权申请、有效授权访问与访问留痕联动页面。</p>
    </div>
  </div>
  <template v-else>
    <AppLayout v-if="showLayout">
      <component :is="currentView" :key="currentRoute.fullPath" />
    </AppLayout>
    <component :is="currentView" :key="currentRoute.fullPath" v-else />
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
