<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { usersApi } from '../api/users'
import { authStore } from '../stores/auth'
import { messageStore } from '../stores/message'
import { buildTree } from '../utils/helpers'

const CONFIG_STORAGE_KEY = 'p22-role-permission-config'

const fallbackPermissions = [
  {
    code: 'MENU_PRIVACY',
    name: '隐私数据管理',
    type: 'MENU',
    children: [
      { code: 'P03', name: '我的隐私数据', type: 'MENU' },
      { code: 'P05', name: '新增/编辑隐私数据', type: 'MENU' },
      { code: 'API_PRIVACY_WRITE', name: '新增或更新隐私数据', type: 'API' },
      { code: 'DATA_SCOPE_SELF', name: '仅本人数据', type: 'DATA_SCOPE' },
    ],
  },
  {
    code: 'MENU_FILE',
    name: '附件与文件存证',
    type: 'MENU',
    children: [
      { code: 'P06', name: '文件上传与附件管理', type: 'MENU' },
      { code: 'API_FILE_UPLOAD', name: '上传附件', type: 'API' },
      { code: 'API_FILE_CID', name: '生成 CID', type: 'API' },
    ],
  },
  {
    code: 'MENU_EVIDENCE',
    name: '存证申请与审批',
    type: 'MENU',
    children: [
      { code: 'P08', name: '存证申请与记录', type: 'MENU' },
      { code: 'P13', name: '审批中心', type: 'MENU' },
      { code: 'P17', name: '审批记录', type: 'MENU' },
      { code: 'API_EVIDENCE_SUBMIT', name: '提交存证申请', type: 'API' },
      { code: 'API_EVIDENCE_APPROVE', name: '审批通过/驳回', type: 'API' },
      { code: 'DATA_SCOPE_DEPT', name: '本部门数据', type: 'DATA_SCOPE' },
    ],
  },
  {
    code: 'MENU_SYSTEM',
    name: '系统基础配置',
    type: 'MENU',
    children: [
      { code: 'P21', name: '用户管理', type: 'MENU' },
      { code: 'P22', name: '角色权限与部门管理', type: 'MENU' },
      { code: 'P25', name: '个人中心与安全设置', type: 'MENU' },
      { code: 'API_USER_ROLE', name: '分配用户角色', type: 'API' },
      { code: 'DATA_SCOPE_ALL', name: '全校数据', type: 'DATA_SCOPE' },
    ],
  },
]

const fallbackRoles = [
  { roleCode: 'SYS_ADMIN', roleName: '系统管理员', description: '维护系统用户、角色权限、部门组织与全局配置。', dataScope: 'ALL' },
  { roleCode: 'TEACHING_ADMIN', roleName: '教务管理员', description: '维护教务数据、审批存证申请并查看部门数据。', dataScope: 'DEPT' },
  { roleCode: 'COUNSELOR', roleName: '辅导员', description: '查看本部门学生数据并处理辅导员侧审批事项。', dataScope: 'DEPT' },
  { roleCode: 'STUDENT', roleName: '学生', description: '维护本人隐私数据、提交存证申请并查看本人记录。', dataScope: 'SELF' },
]

const dataScopes = [
  { code: 'SELF', title: 'SELF', desc: '仅允许访问当前登录人本人数据。' },
  { code: 'DEPT', title: 'DEPT', desc: '允许访问所属学院或部门范围内数据。' },
  { code: 'ALL', title: 'ALL', desc: '允许访问全校或系统全局数据。' },
]

const loading = ref(false)
const saving = ref(false)
const selectedRoleCode = ref('')
const checkedPermissionCodes = ref([])
const dataScope = ref('SELF')
const expandedCodes = ref([])
const savedConfig = ref({})

const roleList = computed(() => {
  const roles = authStore.state.roles?.length ? authStore.state.roles : fallbackRoles
  return roles.map((role) => ({
    roleCode: role.roleCode || role.code,
    roleName: role.roleName || role.name || role.roleCode || role.code,
    description: role.description || '该角色暂无说明，可在权限中心维护核心权限口径。',
    dataScope: role.dataScope || role.scope || resolveDefaultScope(role.roleCode || role.code),
    permissionCodes: role.permissionCodes || role.permissions || [],
  }))
})

const permissionTree = computed(() => {
  const nodes = authStore.state.permissionsTree?.length ? authStore.state.permissionsTree : fallbackPermissions
  return normalizePermissionNodes(nodes)
})

const departmentTree = computed(() => buildTree(authStore.state.departments || []))
const selectedRole = computed(() => roleList.value.find((item) => item.roleCode === selectedRoleCode.value))

const allPermissionCodes = computed(() => flattenPermissions(permissionTree.value).map((item) => item.code))
const selectedSummary = computed(() => {
  const rows = flattenPermissions(permissionTree.value).filter((item) => checkedPermissionCodes.value.includes(item.code))
  return {
    total: rows.length,
    menu: rows.filter((item) => item.type === 'MENU').length,
    api: rows.filter((item) => item.type === 'API').length,
    data: rows.filter((item) => item.type === 'DATA_SCOPE').length,
  }
})

const visiblePermissionRows = computed(() => {
  const rows = []
  const walk = (nodes, level = 0) => {
    nodes.forEach((node) => {
      rows.push({ ...node, level, hasChildren: Boolean(node.children?.length) })
      if (node.children?.length && expandedCodes.value.includes(node.code)) {
        walk(node.children, level + 1)
      }
    })
  }
  walk(permissionTree.value)
  return rows
})

function normalizePermissionNodes(nodes = []) {
  return nodes.map((node) => {
    const code = node.code || node.permissionCode || node.id || node.name
    return {
      code,
      name: node.name || node.permissionName || node.title || code,
      type: node.type || node.permissionType || guessPermissionType(code),
      children: normalizePermissionNodes(node.children || []),
    }
  })
}

function flattenPermissions(nodes = []) {
  return nodes.flatMap((node) => [node, ...flattenPermissions(node.children || [])])
}

function getDescendantCodes(node) {
  return flattenPermissions([node]).map((item) => item.code)
}

function guessPermissionType(code = '') {
  if (String(code).startsWith('API_')) return 'API'
  if (String(code).startsWith('DATA_SCOPE_')) return 'DATA_SCOPE'
  return 'MENU'
}

function resolveDefaultScope(roleCode = '') {
  if (roleCode === 'SYS_ADMIN') return 'ALL'
  if (['TEACHING_ADMIN', 'COUNSELOR'].includes(roleCode)) return 'DEPT'
  return 'SELF'
}

function resolveDefaultPermissionCodes(roleCode = '') {
  const codes = allPermissionCodes.value
  if (roleCode === 'SYS_ADMIN') return codes
  if (roleCode === 'TEACHING_ADMIN') {
    return codes.filter((code) => !['DATA_SCOPE_SELF'].includes(code) && !String(code).startsWith('P03'))
  }
  if (roleCode === 'COUNSELOR') {
    return codes.filter((code) => ['MENU_EVIDENCE', 'P13', 'P17', 'P08', 'API_EVIDENCE_APPROVE', 'DATA_SCOPE_DEPT', 'P25'].includes(code))
  }
  if (roleCode === 'STUDENT') {
    return codes.filter((code) => ['MENU_PRIVACY', 'P03', 'P05', 'P06', 'P08', 'API_PRIVACY_WRITE', 'API_FILE_UPLOAD', 'API_EVIDENCE_SUBMIT', 'DATA_SCOPE_SELF', 'P25'].includes(code))
  }
  return []
}

function loadSavedConfig() {
  try {
    savedConfig.value = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || '{}')
  } catch {
    savedConfig.value = {}
  }
}

function applySelectedRoleConfig() {
  const role = selectedRole.value
  if (!role) {
    checkedPermissionCodes.value = []
    dataScope.value = 'SELF'
    return
  }

  const config = savedConfig.value[role.roleCode] || {}
  checkedPermissionCodes.value = [...new Set(config.permissionCodes || role.permissionCodes || resolveDefaultPermissionCodes(role.roleCode))]
  dataScope.value = config.dataScope || role.dataScope || resolveDefaultScope(role.roleCode)
}

function toggleExpanded(code) {
  expandedCodes.value = expandedCodes.value.includes(code)
    ? expandedCodes.value.filter((item) => item !== code)
    : [...expandedCodes.value, code]
}

function togglePermission(node) {
  const codes = getDescendantCodes(node)
  const next = new Set(checkedPermissionCodes.value)
  const shouldCheck = !codes.every((code) => next.has(code))
  codes.forEach((code) => {
    if (shouldCheck) {
      next.add(code)
    } else {
      next.delete(code)
    }
  })
  checkedPermissionCodes.value = [...next]
}

function isPermissionChecked(code) {
  return checkedPermissionCodes.value.includes(code)
}

function expandAll() {
  expandedCodes.value = flattenPermissions(permissionTree.value)
    .filter((node) => node.children?.length)
    .map((node) => node.code)
}

function collapseAll() {
  expandedCodes.value = []
}

async function loadData() {
  loading.value = true
  try {
    const [roles, permissions, departments] = await Promise.allSettled([
      usersApi.getRoles(),
      usersApi.getPermissionsTree(),
      usersApi.getDepartments(),
    ])
    authStore.state.roles = roles.status === 'fulfilled' ? roles.value.records || [] : authStore.state.roles
    authStore.state.permissionsTree = permissions.status === 'fulfilled' ? permissions.value.nodes || [] : authStore.state.permissionsTree
    authStore.state.departments = departments.status === 'fulfilled' ? departments.value.records || [] : authStore.state.departments

    if (!selectedRoleCode.value && roleList.value.length) {
      selectedRoleCode.value = roleList.value[0].roleCode
    }
    if (!expandedCodes.value.length) {
      expandAll()
    }
    applySelectedRoleConfig()
  } finally {
    loading.value = false
  }
}

function resetCurrentRole() {
  applySelectedRoleConfig()
  messageStore.info('已恢复为当前角色最近一次保存或接口返回的配置。', '配置已重置')
}

function saveCurrentRole() {
  if (!selectedRole.value) {
    messageStore.warning('请先选择一个角色。')
    return
  }

  saving.value = true
  const nextConfig = {
    ...savedConfig.value,
    [selectedRole.value.roleCode]: {
      roleCode: selectedRole.value.roleCode,
      roleName: selectedRole.value.roleName,
      permissionCodes: checkedPermissionCodes.value,
      dataScope: dataScope.value,
      updatedAt: new Date().toISOString(),
    },
  }
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig))
  savedConfig.value = nextConfig
  window.setTimeout(() => {
    saving.value = false
    messageStore.success(`${selectedRole.value.roleName} 的权限配置已保存。`, '保存成功')
  }, 320)
}

watch(selectedRoleCode, applySelectedRoleConfig)
watch(permissionTree, () => {
  if (!expandedCodes.value.length) {
    expandAll()
  }
  applySelectedRoleConfig()
})

onMounted(() => {
  loadSavedConfig()
  loadData()
})
</script>

<template>
  <div class="page-stack p22-page">
    <section class="panel p22-hero">
      <div>
        <span class="page-chip">P22 权限配置中心</span>
        <h3>角色权限与部门管理</h3>
        <p>以角色为入口维护菜单、接口和数据范围配置，部门树作为组织边界参考，不与 P21 用户管理混合。</p>
      </div>
      <div class="action-row">
        <button class="secondary-button" type="button" :disabled="loading" @click="loadData">
          {{ loading ? '刷新中...' : '刷新数据' }}
        </button>
        <button class="secondary-button" type="button" @click="resetCurrentRole">重置</button>
        <button class="primary-button" type="button" :disabled="saving || !selectedRole" @click="saveCurrentRole">
          {{ saving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </section>

    <section class="p22-layout">
      <aside class="panel p22-role-panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">角色列表</span>
            <h3>四级权限角色</h3>
            <p>选择角色后维护其可访问的菜单、接口和数据范围。</p>
          </div>
        </div>
        <div class="list-stack">
          <button
            v-for="role in roleList"
            :key="role.roleCode"
            class="list-card p22-role-card"
            :class="{ active: selectedRoleCode === role.roleCode }"
            type="button"
            @click="selectedRoleCode = role.roleCode"
          >
            <span class="tag tag-blue">{{ role.roleCode }}</span>
            <strong>{{ role.roleName }}</strong>
            <p>{{ role.description }}</p>
            <small>默认数据范围：{{ role.dataScope || resolveDefaultScope(role.roleCode) }}</small>
          </button>
          <div v-if="!roleList.length" class="empty-block">暂无角色数据</div>
        </div>
      </aside>

      <main class="panel p22-config-panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">权限树</span>
            <h3>{{ selectedRole?.roleName || '未选择角色' }}</h3>
            <p>勾选后会同步到右侧分配结果面板，保存后前端会记录当前轻量配置。</p>
          </div>
          <div class="action-row">
            <button class="ghost-button" type="button" @click="expandAll">全部展开</button>
            <button class="ghost-button" type="button" @click="collapseAll">全部收起</button>
          </div>
        </div>

        <div class="p22-permission-meta">
          <div>
            <strong>{{ selectedSummary.menu }}</strong>
            <span>菜单权限</span>
          </div>
          <div>
            <strong>{{ selectedSummary.api }}</strong>
            <span>接口权限</span>
          </div>
          <div>
            <strong>{{ selectedSummary.data }}</strong>
            <span>数据权限</span>
          </div>
        </div>

        <div class="p22-permission-tree">
          <div
            v-for="node in visiblePermissionRows"
            :key="node.code"
            class="p22-tree-row"
            :style="{ paddingLeft: `${14 + node.level * 24}px` }"
          >
            <button
              v-if="node.hasChildren"
              class="p22-expand-button"
              type="button"
              @click="toggleExpanded(node.code)"
            >
              {{ expandedCodes.includes(node.code) ? '−' : '+' }}
            </button>
            <span v-else class="p22-expand-placeholder"></span>
            <label class="p22-check">
              <input
                type="checkbox"
                :checked="isPermissionChecked(node.code)"
                @change="togglePermission(node)"
              />
              <span>{{ node.name }}</span>
            </label>
            <span class="tag" :class="`permission-type-${node.type}`">{{ node.type }}</span>
            <small>{{ node.code }}</small>
          </div>
          <div v-if="!visiblePermissionRows.length" class="empty-block">暂无权限树数据</div>
        </div>
      </main>

      <aside class="p22-side-stack">
        <article class="panel">
          <div class="panel-header compact">
            <div>
              <span class="page-chip">数据范围</span>
              <h3>角色数据口径</h3>
            </div>
          </div>
          <div class="p22-scope-list">
            <label
              v-for="scope in dataScopes"
              :key="scope.code"
              class="p22-scope-card"
              :class="{ active: dataScope === scope.code }"
            >
              <input v-model="dataScope" type="radio" name="dataScope" :value="scope.code" />
              <strong>{{ scope.title }}</strong>
              <span>{{ scope.desc }}</span>
            </label>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header compact">
            <div>
              <span class="page-chip">分配结果</span>
              <h3>当前配置摘要</h3>
            </div>
          </div>
          <dl class="detail-grid p22-result-grid">
            <div>
              <dt>当前角色</dt>
              <dd>{{ selectedRole?.roleName || '--' }}</dd>
            </div>
            <div>
              <dt>角色编码</dt>
              <dd>{{ selectedRole?.roleCode || '--' }}</dd>
            </div>
            <div>
              <dt>数据范围</dt>
              <dd>{{ dataScope }}</dd>
            </div>
            <div>
              <dt>已选权限</dt>
              <dd>{{ selectedSummary.total }} 项</dd>
            </div>
          </dl>
        </article>

        <article class="panel">
          <div class="panel-header compact">
            <div>
              <span class="page-chip">部门树</span>
              <h3>组织边界参考</h3>
              <p>部门树暂作为只读辅助信息，用于解释 DEPT 数据范围。</p>
            </div>
          </div>
          <ul class="tree-list p22-dept-tree">
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
      </aside>
    </section>
  </div>
</template>
