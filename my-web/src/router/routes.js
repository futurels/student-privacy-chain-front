export const routeTable = [
  {
    path: '/',
    component: 'ProfileSecurityPage',
    meta: {
      title: '首页',
      requiresAuth: true,
      menu: false,
    },
  },
  {
    path: '/login',
    component: 'LoginPage',
    meta: {
      title: '登录',
      guestOnly: true,
      layout: false,
      menu: false,
    },
  },
  {
    path: '/privacy/list',
    component: 'PrivacyListPage',
    meta: {
      title: 'P03 我的隐私数据',
      requiresAuth: true,
      menu: true,
      menuCode: 'P03',
      roles: ['STUDENT'],
    },
  },
  {
    path: '/privacy/detail',
    component: 'PrivacyDetailPage',
    meta: {
      title: 'P04 隐私数据详情',
      requiresAuth: true,
      menu: false,
      roles: ['STUDENT', 'TEACHING_ADMIN', 'COUNSELOR'],
    },
  },
  {
    path: '/privacy/edit',
    component: 'PrivacyEditPage',
    meta: {
      title: 'P05 新增/编辑隐私数据',
      requiresAuth: true,
      menu: false,
      roles: ['STUDENT', 'TEACHING_ADMIN'],
    },
  },
  {
    path: '/files/manage',
    component: 'FileAttachmentPage',
    meta: {
      title: 'P06 文件上传与附件管理',
      requiresAuth: true,
      menu: true,
      menuCode: 'P06',
      roles: ['STUDENT', 'TEACHING_ADMIN', 'SYS_ADMIN'],
    },
  },
  {
    path: '/evidence/apply',
    component: 'EvidenceApplyPage',
    meta: {
      title: 'P07 提交存证申请',
      requiresAuth: true,
      menu: false,
      roles: ['STUDENT', 'TEACHING_ADMIN'],
    },
  },
  {
    path: '/evidence/list',
    component: 'EvidenceListPage',
    meta: {
      title: 'P08 存证申请与记录列表',
      requiresAuth: true,
      menu: true,
      menuCode: 'P08',
      roles: ['STUDENT', 'COUNSELOR', 'TEACHING_ADMIN'],
    },
  },
  {
    path: '/evidence/detail',
    component: 'EvidenceDetailPage',
    meta: {
      title: 'P09 存证详情与一致性校验',
      requiresAuth: true,
      menu: false,
      roles: ['STUDENT', 'COUNSELOR', 'TEACHING_ADMIN', 'SYS_ADMIN'],
    },
  },
  {
    path: '/authorization/apply',
    component: 'AuthorizationApplyPage',
    meta: {
      title: 'P10 发起共享授权',
      requiresAuth: true,
      menu: false,
      roles: ['STUDENT'],
    },
  },
  {
    path: '/authorization/list',
    component: 'AuthorizationListPage',
    meta: {
      title: 'P11 授权列表与详情',
      requiresAuth: true,
      menu: true,
      menuCode: 'P11',
      roles: ['STUDENT', 'COUNSELOR', 'TEACHING_ADMIN'],
    },
  },
  {
    path: '/approval/center',
    component: 'EvidenceListPage',
    meta: {
      title: 'P13 审批中心',
      requiresAuth: true,
      menu: true,
      menuCode: 'P13',
      roles: ['COUNSELOR', 'TEACHING_ADMIN', 'SYS_ADMIN'],
    },
  },
  {
    path: '/evidence/approval',
    component: 'EvidenceApprovalPage',
    meta: {
      title: 'P14 存证审批详情',
      requiresAuth: true,
      menu: false,
      roles: ['COUNSELOR', 'TEACHING_ADMIN', 'SYS_ADMIN'],
    },
  },
  {
    path: '/approval/records',
    component: 'ApprovalRecordsPage',
    meta: {
      title: 'P17 审批记录查询',
      requiresAuth: true,
      menu: true,
      menuCode: 'P17',
      roles: ['COUNSELOR', 'TEACHING_ADMIN', 'SYS_ADMIN'],
    },
  },
  {
    path: '/system/users',
    component: 'UserManagementPage',
    meta: {
      title: 'P21 用户管理',
      requiresAuth: true,
      menu: true,
      menuCode: 'P21',
      roles: ['SYS_ADMIN'],
    },
  },
  {
    path: '/system/roles',
    component: 'RoleDeptPage',
    meta: {
      title: 'P22 角色权限与部门管理',
      requiresAuth: true,
      menu: true,
      menuCode: 'P22',
      roles: ['SYS_ADMIN'],
    },
  },
  {
    path: '/profile/security',
    component: 'ProfileSecurityPage',
    meta: {
      title: 'P25 个人中心与安全设置',
      requiresAuth: true,
      menu: true,
      menuCode: 'P25',
    },
  },
  {
    path: '/403',
    component: 'ForbiddenPage',
    meta: {
      title: '无权限访问',
      requiresAuth: true,
      menu: false,
    },
  },
  {
    path: '/404',
    component: 'NotFoundPage',
    meta: {
      title: '页面不存在',
      layout: false,
      menu: false,
    },
  },
]
