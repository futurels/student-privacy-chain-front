<script setup>
import { computed, onMounted, ref } from 'vue'
import { usersApi } from '../api/users'
import { authStore } from '../stores/auth'
import { buildTree } from '../utils/helpers'

const loading = ref(false)
const selectedRoleCode = ref('')

const roleList = computed(() => authStore.state.roles)
const permissionTree = computed(() => authStore.state.permissionsTree)
const departmentTree = computed(() => buildTree(authStore.state.departments))
const selectedRole = computed(() => roleList.value.find((item) => item.roleCode === selectedRoleCode.value))

const loadData = async () => {
  loading.value = true
  try {
    const [roles, permissions, departments] = await Promise.all([
      usersApi.getRoles(),
      usersApi.getPermissionsTree(),
      usersApi.getDepartments(),
    ])
    authStore.state.roles = roles.records || []
    authStore.state.permissionsTree = permissions.nodes || []
    authStore.state.departments = departments.records || []
    if (!selectedRoleCode.value && authStore.state.roles.length) {
      selectedRoleCode.value = authStore.state.roles[0].roleCode
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P22</span>
          <h3>角色权限与部门管理</h3>
          <p>对接 API-11、API-13、API-14，用于查看角色定义、权限树和部门组织结构。</p>
        </div>
        <button class="secondary-button" type="button" @click="loadData">
          {{ loading ? '同步中...' : '刷新数据' }}
        </button>
      </div>
    </section>

    <section class="role-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">角色列表</span>
            <h3>系统角色</h3>
          </div>
        </div>
        <div class="list-stack">
          <button
            v-for="role in roleList"
            :key="role.roleCode"
            class="list-card"
            :class="{ active: selectedRoleCode === role.roleCode }"
            type="button"
            @click="selectedRoleCode = role.roleCode"
          >
            <strong>{{ role.roleName }}</strong>
            <span>{{ role.roleCode }}</span>
            <p>{{ role.description }}</p>
          </button>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">权限树</span>
            <h3>菜单与接口权限</h3>
            <p>{{ selectedRole?.roleName || '未选择角色' }}</p>
          </div>
        </div>
        <ul class="tree-list">
          <li v-for="node in permissionTree" :key="node.code">
            <div class="tree-node">
              <strong>{{ node.name }}</strong>
              <span>{{ node.type }}</span>
              <small>{{ node.code }}</small>
            </div>
            <ul v-if="node.children?.length">
              <li v-for="child in node.children" :key="child.code">
                <div class="tree-node child">
                  <strong>{{ child.name }}</strong>
                  <span>{{ child.type }}</span>
                  <small>{{ child.code }}</small>
                </div>
              </li>
            </ul>
          </li>
          <li v-if="!permissionTree.length" class="empty-block">暂无权限树数据</li>
        </ul>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">部门树</span>
            <h3>部门与组织</h3>
          </div>
        </div>
        <ul class="tree-list">
          <li v-for="node in departmentTree" :key="node.id">
            <div class="tree-node">
              <strong>{{ node.deptName }}</strong>
              <span>{{ node.status }}</span>
              <small>{{ node.deptCode }}</small>
            </div>
            <ul v-if="node.children?.length">
              <li v-for="child in node.children" :key="child.id">
                <div class="tree-node child">
                  <strong>{{ child.deptName }}</strong>
                  <span>{{ child.status }}</span>
                  <small>{{ child.deptCode }}</small>
                </div>
              </li>
            </ul>
          </li>
          <li v-if="!departmentTree.length" class="empty-block">暂无部门数据</li>
        </ul>
      </article>
    </section>
  </div>
</template>
