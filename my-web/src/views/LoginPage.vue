<script setup>
import { reactive } from 'vue'
import { authStore } from '../stores/auth'
import { router } from '../router'

const form = reactive({
  username: '',
  password: '',
  loginType: 'PASSWORD',
})

const submit = async () => {
  const route = router.currentRoute.value
  await authStore.login(form)
  const redirect = route.query.get('redirect')
  router.navigate(redirect || router.getDefaultPath(), true)
}
</script>

<template>
  <div class="login-page">
    <section class="login-hero">
      <div class="stage-tag">P01 登录页</div>
      <h1>高校学生隐私数据存证与共享系统</h1>
      <p>
        当前仅开放第二阶段前端能力，聚焦登录鉴权、用户管理、角色权限、部门管理与个人安全设置。
      </p>

      <div class="hero-grid">
        <article class="hero-card">
          <strong>统一登录态</strong>
          <p>所有请求统一经 API 封装层发起，自动附带 token，并统一处理 401/403。</p>
        </article>
        <article class="hero-card">
          <strong>角色控菜单</strong>
          <p>登录成功后先拉取 `/api/auth/me` 初始化用户态，再按角色展示可访问菜单。</p>
        </article>
        <article class="hero-card">
          <strong>阶段边界清晰</strong>
          <p>本阶段仅包含 P01、P21、P22、P25，不提前进入存证、授权、审计等后续页面。</p>
        </article>
      </div>
    </section>

    <section class="login-card">
      <div class="card-head">
        <span class="page-chip">认证入口</span>
        <h2>账号密码登录</h2>
        <p>支持学生、辅导员、教务管理员、系统管理员统一入口。</p>
      </div>

      <form class="form-grid" @submit.prevent="submit">
        <label class="field">
          <span>账号</span>
          <input v-model.trim="form.username" placeholder="请输入学号、工号或系统账号" required />
        </label>

        <label class="field">
          <span>密码</span>
          <input v-model.trim="form.password" type="password" placeholder="请输入密码" required />
        </label>

        <label class="field">
          <span>登录方式</span>
          <select v-model="form.loginType">
            <option value="PASSWORD">账号密码登录</option>
          </select>
        </label>

        <button class="primary-button" type="submit" :disabled="authStore.loading.value">
          {{ authStore.loading.value ? '登录中...' : '登录并初始化权限' }}
        </button>
      </form>

      <div class="login-tips">
        <p>登录流程：`/api/auth/login` → 存储 token → `/api/auth/me` → 初始化菜单与用户态。</p>
      </div>
    </section>
  </div>
</template>
