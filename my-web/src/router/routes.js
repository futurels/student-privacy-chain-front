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
