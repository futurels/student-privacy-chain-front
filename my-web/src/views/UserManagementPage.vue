<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { usersApi } from '../api/users'
import { authStore } from '../stores/auth'
import { messageStore } from '../stores/message'
import { formatRoleLabel, formatStatusLabel } from '../utils/helpers'
import AppDialog from '../components/AppDialog.vue'

const loading = ref(false)
const userList = ref([])
const total = ref(0)
const currentUser = ref(null)
const filters = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  roleCode: '',
  status: '',
})

const formOpen = ref(false)
const roleOpen = ref(false)
const formMode = ref('create')
const formModel = reactive({
  id: null,
  username: '',
  name: '',
  phone: '',
  email: '',
  departmentId: '',
  roleCodes: [],
})
const roleModel = reactive({
  id: null,
  roleCodes: [],
})

const roleOptions = computed(() => authStore.state.roles)

const loadUsers = async () => {
  loading.value = true
  try {
    const data = await usersApi.getPage(filters)
    userList.value = data.records || []
    total.value = data.total || 0
    if (userList.value.length) {
      await selectUser(userList.value[0].id)
    } else {
      currentUser.value = null
    }
  } finally {
    loading.value = false
  }
}

const selectUser = async (id) => {
  currentUser.value = await usersApi.getDetail(id)
}

const resetForm = () => {
  formModel.id = null
  formModel.username = ''
  formModel.name = ''
  formModel.phone = ''
  formModel.email = ''
  formModel.departmentId = ''
  formModel.roleCodes = []
}

const openCreate = () => {
  resetForm()
  formMode.value = 'create'
  formOpen.value = true
}

const openEdit = (row) => {
  formMode.value = 'edit'
  formModel.id = row.id
  formModel.username = row.username
  formModel.name = row.name
  formModel.phone = currentUser.value?.phone || ''
  formModel.email = currentUser.value?.email || ''
  formModel.departmentId = currentUser.value?.departmentId || ''
  formModel.roleCodes = [...(currentUser.value?.roleCodes || row.roleCodes || [])]
  formOpen.value = true
}

const submitForm = async () => {
  if (formMode.value === 'create') {
    await usersApi.create({
      username: formModel.username,
      name: formModel.name,
      phone: formModel.phone,
      email: formModel.email,
      departmentId: Number(formModel.departmentId),
      roleCodes: formModel.roleCodes,
    })
    messageStore.success('用户已创建。')
  } else {
    await usersApi.update(formModel.id, {
      name: formModel.name,
      phone: formModel.phone,
      email: formModel.email,
      departmentId: Number(formModel.departmentId),
    })
    await usersApi.assignRoles(formModel.id, {
      roleCodes: formModel.roleCodes,
    })
    messageStore.success('用户资料与角色已更新。')
  }
  formOpen.value = false
  await loadUsers()
}

const toggleStatus = async (row) => {
  const nextStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  await usersApi.updateStatus(row.id, {
    status: nextStatus,
    reason: nextStatus === 'DISABLED' ? '后台手动停用' : '后台重新启用',
  })
  messageStore.success(`用户状态已更新为${formatStatusLabel(nextStatus)}。`)
  await loadUsers()
}

const openRoleDialog = (row) => {
  roleModel.id = row.id
  roleModel.roleCodes = [...(row.roleCodes || [])]
  roleOpen.value = true
}

const submitRoleDialog = async () => {
  await usersApi.assignRoles(roleModel.id, {
    roleCodes: roleModel.roleCodes,
  })
  roleOpen.value = false
  messageStore.success('角色分配已保存。')
  await loadUsers()
}

onMounted(loadUsers)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P21</span>
          <h3>用户管理</h3>
          <p>覆盖 API-06 ~ API-10，并在列表页内补充 API-12 的角色分配动作。</p>
        </div>
        <button class="primary-button" type="button" @click="openCreate">新增用户</button>
      </div>

      <form class="toolbar" @submit.prevent="loadUsers">
        <input v-model.trim="filters.keyword" placeholder="姓名/账号关键字" />
        <select v-model="filters.roleCode">
          <option value="">全部角色</option>
          <option v-for="role in roleOptions" :key="role.roleCode" :value="role.roleCode">
            {{ role.roleName }}
          </option>
        </select>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="ENABLED">启用</option>
          <option value="DISABLED">停用</option>
        </select>
        <button class="secondary-button" type="submit">查询</button>
      </form>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="table-meta">
          <span>共 {{ total }} 条</span>
          <span>{{ loading ? '正在加载...' : '已同步最新用户列表' }}</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>账号</th>
              <th>姓名</th>
              <th>角色</th>
              <th>部门</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in userList" :key="row.id" @click="selectUser(row.id)">
              <td>{{ row.username }}</td>
              <td>{{ row.name }}</td>
              <td>
                <div class="tag-row">
                  <span v-for="role in row.roleCodes" :key="role" class="tag tag-blue">
                    {{ formatRoleLabel(role) }}
                  </span>
                </div>
              </td>
              <td>{{ row.departmentName }}</td>
              <td>
                <span class="tag" :class="row.status === 'ENABLED' ? 'tag-green' : 'tag-red'">
                  {{ formatStatusLabel(row.status) }}
                </span>
              </td>
              <td>{{ row.createdAt || '--' }}</td>
              <td>
                <div class="action-row">
                  <button class="text-button" type="button" @click.stop="openEdit(row)">编辑</button>
                  <button class="text-button" type="button" @click.stop="openRoleDialog(row)">分配角色</button>
                  <button class="text-button danger" type="button" @click.stop="toggleStatus(row)">
                    {{ row.status === 'ENABLED' ? '停用' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!userList.length">
              <td colspan="7" class="empty-cell">暂无用户数据</td>
            </tr>
          </tbody>
        </table>
      </article>

      <aside class="panel detail-panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">详情</span>
            <h3>用户详情</h3>
          </div>
        </div>
        <template v-if="currentUser">
          <dl class="detail-grid">
            <div>
              <dt>用户主键</dt>
              <dd>{{ currentUser.id }}</dd>
            </div>
            <div>
              <dt>登录账号</dt>
              <dd>{{ currentUser.username }}</dd>
            </div>
            <div>
              <dt>姓名</dt>
              <dd>{{ currentUser.name }}</dd>
            </div>
            <div>
              <dt>手机号</dt>
              <dd>{{ currentUser.phone || '--' }}</dd>
            </div>
            <div>
              <dt>邮箱</dt>
              <dd>{{ currentUser.email || '--' }}</dd>
            </div>
            <div>
              <dt>部门 ID</dt>
              <dd>{{ currentUser.departmentId || '--' }}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{{ formatStatusLabel(currentUser.status) }}</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd>{{ (currentUser.roleCodes || []).map(formatRoleLabel).join(' / ') || '--' }}</dd>
            </div>
          </dl>
        </template>
        <p v-else class="empty-block">请选择左侧用户查看详情。</p>
      </aside>
    </section>

    <AppDialog :open="formOpen" :title="formMode === 'create' ? '新增用户' : '编辑用户'" @close="formOpen = false">
      <form class="form-grid" @submit.prevent="submitForm">
        <label class="field">
          <span>登录账号</span>
          <input v-model.trim="formModel.username" :disabled="formMode === 'edit'" required />
        </label>
        <label class="field">
          <span>姓名</span>
          <input v-model.trim="formModel.name" required />
        </label>
        <label class="field">
          <span>手机号</span>
          <input v-model.trim="formModel.phone" />
        </label>
        <label class="field">
          <span>邮箱</span>
          <input v-model.trim="formModel.email" type="email" />
        </label>
        <label class="field">
          <span>部门</span>
          <select v-model="formModel.departmentId" required>
            <option value="">请选择部门</option>
            <option
              v-for="item in authStore.state.departments"
              :key="item.id"
              :value="item.id"
            >
              {{ item.deptName }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>角色</span>
          <select v-model="formModel.roleCodes" multiple>
            <option v-for="item in roleOptions" :key="item.roleCode" :value="item.roleCode">
              {{ item.roleName }}
            </option>
          </select>
        </label>
        <button class="primary-button" type="submit">保存</button>
      </form>
    </AppDialog>

    <AppDialog :open="roleOpen" title="分配用户角色" width="520px" @close="roleOpen = false">
      <form class="form-grid" @submit.prevent="submitRoleDialog">
        <label class="field">
          <span>角色列表</span>
          <select v-model="roleModel.roleCodes" multiple>
            <option v-for="item in roleOptions" :key="item.roleCode" :value="item.roleCode">
              {{ item.roleName }}
            </option>
          </select>
        </label>
        <button class="primary-button" type="submit">保存角色</button>
      </form>
    </AppDialog>
  </div>
</template>
