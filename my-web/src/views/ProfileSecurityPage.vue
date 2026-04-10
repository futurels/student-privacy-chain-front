<script setup>
import { computed, reactive } from 'vue'
import { authStore } from '../stores/auth'
import { formatRoleLabel, formatStatusLabel } from '../utils/helpers'

const user = computed(() => authStore.user.value)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const submitPassword = async () => {
  await authStore.changePassword(passwordForm)
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P25</span>
          <h3>个人中心与安全设置</h3>
          <p>对接 API-03 与 API-04，展示当前账号信息并支持修改登录密码。</p>
        </div>
      </div>
    </section>

    <section class="content-grid two-col">
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">账号信息</span>
            <h3>当前用户</h3>
          </div>
        </div>
        <dl class="detail-grid">
          <div>
            <dt>用户 ID</dt>
            <dd>{{ user?.id || '--' }}</dd>
          </div>
          <div>
            <dt>登录账号</dt>
            <dd>{{ user?.username || '--' }}</dd>
          </div>
          <div>
            <dt>姓名</dt>
            <dd>{{ user?.name || '--' }}</dd>
          </div>
          <div>
            <dt>所属部门</dt>
            <dd>{{ user?.departmentName || '--' }}</dd>
          </div>
          <div>
            <dt>账号状态</dt>
            <dd>{{ formatStatusLabel(user?.status) }}</dd>
          </div>
          <div>
            <dt>角色</dt>
            <dd>
              <div class="tag-row">
                <span v-for="role in user?.roleCodes || []" :key="role" class="tag tag-blue">
                  {{ formatRoleLabel(role) }}
                </span>
              </div>
            </dd>
          </div>
        </dl>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">安全设置</span>
            <h3>修改密码</h3>
          </div>
        </div>
        <form class="form-grid" @submit.prevent="submitPassword">
          <label class="field">
            <span>原密码</span>
            <input v-model.trim="passwordForm.oldPassword" type="password" required />
          </label>
          <label class="field">
            <span>新密码</span>
            <input v-model.trim="passwordForm.newPassword" type="password" required />
          </label>
          <label class="field">
            <span>确认新密码</span>
            <input v-model.trim="passwordForm.confirmPassword" type="password" required />
          </label>
          <button class="primary-button" type="submit" :disabled="authStore.loading.value">
            {{ authStore.loading.value ? '提交中...' : '保存新密码' }}
          </button>
        </form>
      </article>
    </section>
  </div>
</template>
