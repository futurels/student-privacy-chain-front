<script setup>
import { computed, onMounted } from 'vue'
import AppLayout from './components/AppLayout.vue'
import { router } from './router'
import { authStore } from './stores/auth'
import { messageStore } from './stores/message'
import AccessLogsPage from './views/AccessLogsPage.vue'
import ApprovalHistoryPage from './views/ApprovalHistoryPage.vue'
import ApprovalRecordsPage from './views/ApprovalRecordsPage.vue'
import AuditLogCenterPage from './views/AuditLogCenterPage.vue'
import AuthorizationApplyPage from './views/AuthorizationApplyPage.vue'
import AuthorizationApprovalPage from './views/AuthorizationApprovalPage.vue'
import AuthorizationListPage from './views/AuthorizationListPage.vue'
import EvidenceApplyPage from './views/EvidenceApplyPage.vue'
import EvidenceApprovalPage from './views/EvidenceApprovalPage.vue'
import EvidenceDetailPage from './views/EvidenceDetailPage.vue'
import EvidenceListPage from './views/EvidenceListPage.vue'
import FileAttachmentPage from './views/FileAttachmentPage.vue'
import ForbiddenPage from './views/ForbiddenPage.vue'
import LoginPage from './views/LoginPage.vue'
import NotFoundPage from './views/NotFoundPage.vue'
import PrivacyDetailPage from './views/PrivacyDetailPage.vue'
import PrivacyEditPage from './views/PrivacyEditPage.vue'
import PrivacyListPage from './views/PrivacyListPage.vue'
import ProfileSecurityPage from './views/ProfileSecurityPage.vue'
import RoleDeptPage from './views/RoleDeptPage.vue'
import StudentArchivePage from './views/StudentArchivePage.vue'
import UserManagementPage from './views/UserManagementPage.vue'

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
  ApprovalHistoryPage,
  ApprovalRecordsPage,
  AuditLogCenterPage,
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
      <div class="boot-badge">第七阶段</div>
      <h1>正在加载审批与审计中心模块</h1>
      <p>正在准备审批记录查询、审计日志中心及后续追溯入口的基础页面。</p>
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
