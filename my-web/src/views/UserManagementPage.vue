<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
  password: '',
  name: '',
  phone: '',
  email: '',
  departmentId: '',
  roleCodes: [],
  studentNo: '',
  studentName: '',
  collegeName: '',
  majorName: '',
  className: '',
  gradeYear: '',
  enrollDate: '',
})
const roleModel = reactive({
  id: null,
  roleCodes: [],
})

const roleOptions = computed(() => authStore.state.roles)
const isStudentForm = computed(() => formModel.roleCodes.includes('STUDENT'))

const isStudentUser = (user = {}) => (user.roleCodes || []).includes('STUDENT')

const resolveStudentProfile = (user = {}) => user.studentProfile || user.profile || {}

const resolveStudentProfileId = (user = {}) => (
  user.studentProfileId ||
  user.profileId ||
  resolveStudentProfile(user).id ||
  resolveStudentProfile(user).studentProfileId ||
  ''
)

const resolveStudentNo = (user = {}) => (
  user.studentNo ||
  resolveStudentProfile(user).studentNo ||
  resolveStudentProfile(user).studentNumber ||
  ''
)

const resolveStudentProfileStatus = (user = {}) => {
  if (!isStudentUser(user)) {
    return { label: '--', className: 'tag-blue' }
  }

  if (user.hasStudentProfile === false || user.studentProfileCreated === false) {
    return { label: '未建档', className: 'tag-red' }
  }

  if (resolveStudentProfileId(user) || resolveStudentNo(user) || user.hasStudentProfile === true || user.studentProfileCreated === true) {
    return { label: '已建档', className: 'tag-green' }
  }

  return { label: '待确认', className: 'tag-blue' }
}

const syncStudentDefaults = () => {
  if (!isStudentForm.value || formMode.value !== 'create') {
    return
  }

  if (!formModel.studentNo && formModel.username) {
    formModel.studentNo = formModel.username
  }
  if (!formModel.studentName && formModel.name) {
    formModel.studentName = formModel.name
  }
}

const buildStudentProfilePayload = () => ({
  studentNo: formModel.studentNo || formModel.username,
  studentName: formModel.studentName || formModel.name,
  collegeName: formModel.collegeName,
  majorName: formModel.majorName,
  className: formModel.className,
  gradeYear: formModel.gradeYear ? Number(formModel.gradeYear) : undefined,
  enrollDate: formModel.enrollDate || undefined,
})

const resolveCreateStudentMessage = (result) => {
  if (result?.studentProfileCreated === false || result?.studentProfileError) {
    return {
      type: 'warning',
      content: result.studentProfileError || '学生账号已创建，但基础档案未同步建立，请联系后端或补录学生档案。',
    }
  }

  if (result?.studentProfileCreated === true || result?.studentProfileId || result?.studentProfile?.id) {
    return {
      type: 'success',
      content: '学生账号与基础学生档案已同步创建。',
    }
  }

  return {
    type: 'success',
    content: '学生账号已创建，学生基础档案信息已随请求提交，请在列表建档标识中复核。',
  }
}

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
  formModel.password = ''
  formModel.name = ''
  formModel.phone = ''
  formModel.email = ''
  formModel.departmentId = ''
  formModel.roleCodes = []
  formModel.studentNo = ''
  formModel.studentName = ''
  formModel.collegeName = ''
  formModel.majorName = ''
  formModel.className = ''
  formModel.gradeYear = ''
  formModel.enrollDate = ''
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
  formModel.password = ''
  formModel.name = row.name
  formModel.phone = currentUser.value?.phone || ''
  formModel.email = currentUser.value?.email || ''
  formModel.departmentId = currentUser.value?.departmentId || ''
  formModel.roleCodes = [...(currentUser.value?.roleCodes || row.roleCodes || [])]
  formOpen.value = true
}

const submitForm = async () => {
  if (formMode.value === 'create') {
    const basePayload = {
      username: formModel.username,
      password: formModel.password || undefined,
      name: formModel.name,
      phone: formModel.phone,
      email: formModel.email,
      departmentId: Number(formModel.departmentId),
      roleCodes: formModel.roleCodes,
    }

    const payload = isStudentForm.value
      ? {
          ...basePayload,
          studentProfile: buildStudentProfilePayload(),
          ...buildStudentProfilePayload(),
        }
      : basePayload

    const result = await usersApi.create(payload)
    if (isStudentForm.value) {
      const message = resolveCreateStudentMessage(result)
      messageStore[message.type](message.content, message.type === 'success' ? '创建成功' : '建档提醒')
    } else {
      messageStore.success('用户已创建。')
    }
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

watch(
  () => [formModel.username, formModel.name, formModel.roleCodes.join(',')],
  syncStudentDefaults,
)

onMounted(loadUsers)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P21</span>
          <h3>用户管理</h3>
          <p>维护系统登录账号、角色分配和启停状态；学生账号创建时同步承接基础学生档案。</p>
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
              <th>学生档案</th>
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
              <td>{{ row.departmentName || '--' }}</td>
              <td>
                <span v-if="isStudentUser(row)" class="tag" :class="resolveStudentProfileStatus(row).className">
                  {{ resolveStudentProfileStatus(row).label }}
                </span>
                <span v-else class="text-muted">--</span>
              </td>
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
              <td colspan="8" class="empty-cell">暂无用户数据</td>
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

          <div v-if="isStudentUser(currentUser)" class="student-profile-detail">
            <div class="panel-header compact">
              <div>
                <span class="page-chip">学生档案</span>
                <h3>基础档案关联</h3>
                <p>学生登录后的业务页面依赖 student_profile，请优先确认该关联已建立。</p>
              </div>
              <span class="tag" :class="resolveStudentProfileStatus(currentUser).className">
                {{ resolveStudentProfileStatus(currentUser).label }}
              </span>
            </div>
            <dl class="detail-grid">
              <div>
                <dt>studentProfileId</dt>
                <dd>{{ resolveStudentProfileId(currentUser) || '--' }}</dd>
              </div>
              <div>
                <dt>studentNo</dt>
                <dd>{{ resolveStudentNo(currentUser) || '--' }}</dd>
              </div>
            </dl>
          </div>
        </template>
        <p v-else class="empty-block">请选择左侧用户查看详情。</p>
      </aside>
    </section>

    <AppDialog :open="formOpen" :title="formMode === 'create' ? '新增用户' : '编辑用户'" width="820px" @close="formOpen = false">
      <form id="user-form" class="form-grid" @submit.prevent="submitForm">
        <div class="user-form-section">
          <div class="section-title-row">
            <div>
              <strong>账号基础信息</strong>
              <p>普通用户只需要维护账号、部门和角色；学生角色会额外承接基础档案。</p>
            </div>
          </div>
          <div class="user-form-grid">
            <label class="field">
              <span>登录账号</span>
              <input v-model.trim="formModel.username" :disabled="formMode === 'edit'" required />
            </label>
            <label v-if="formMode === 'create'" class="field">
              <span>初始密码</span>
              <input v-model.trim="formModel.password" type="password" placeholder="留空则使用后端默认策略" />
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
          </div>
        </div>

        <div v-if="formMode === 'create' && isStudentForm" class="student-profile-card">
          <div class="section-title-row">
            <div>
              <strong>学生基础档案</strong>
              <p>当前角色包含学生，创建账号时会把以下信息一并提交给后端自动建立 student_profile。</p>
            </div>
            <span class="tag tag-green">自动建档</span>
          </div>
          <div class="student-profile-tip">
            <span>提示</span>
            <p>系统会默认使用登录账号作为学号候选，使用姓名作为学生姓名。信息不完整时可先建立基础档案，后续再补录专业、班级等字段。</p>
          </div>
          <div class="user-form-grid">
            <label class="field">
              <span>学号 studentNo</span>
              <input v-model.trim="formModel.studentNo" :placeholder="formModel.username || '默认使用登录账号'" required />
            </label>
            <label class="field">
              <span>学生姓名</span>
              <input v-model.trim="formModel.studentName" :placeholder="formModel.name || '默认使用姓名'" />
            </label>
            <label class="field">
              <span>学院</span>
              <input v-model.trim="formModel.collegeName" placeholder="例如：软件工程学院" />
            </label>
            <label class="field">
              <span>专业</span>
              <input v-model.trim="formModel.majorName" placeholder="例如：软件工程" />
            </label>
            <label class="field">
              <span>班级</span>
              <input v-model.trim="formModel.className" placeholder="例如：软工 2201 班" />
            </label>
            <label class="field">
              <span>年级</span>
              <input v-model.number="formModel.gradeYear" type="number" min="2000" max="2100" placeholder="例如：2022" />
            </label>
            <label class="field">
              <span>入学日期</span>
              <input v-model="formModel.enrollDate" type="date" />
            </label>
          </div>
        </div>

        <div v-if="formMode === 'create' && !isStudentForm" class="notice-card">
          <strong>普通用户创建说明</strong>
          <p>当前未选择学生角色，本次仅创建 sys_user 账号，不会触发学生基础档案建立流程。</p>
        </div>

      </form>
      <template #footer>
        <button class="ghost-button" type="button" @click="formOpen = false">取消</button>
        <button class="primary-button" type="submit" form="user-form">保存</button>
      </template>
    </AppDialog>

    <AppDialog :open="roleOpen" title="分配用户角色" width="520px" @close="roleOpen = false">
      <form id="role-form" class="form-grid" @submit.prevent="submitRoleDialog">
        <label class="field">
          <span>角色列表</span>
          <select v-model="roleModel.roleCodes" multiple>
            <option v-for="item in roleOptions" :key="item.roleCode" :value="item.roleCode">
              {{ item.roleName }}
            </option>
          </select>
        </label>
      </form>
      <template #footer>
        <button class="ghost-button" type="button" @click="roleOpen = false">取消</button>
        <button class="primary-button" type="submit" form="role-form">保存角色</button>
      </template>
    </AppDialog>
  </div>
</template>
