export const routeTable = [
  {
    path: '/',
    component: 'ProfileSecurityPage',
    meta: {
      title: 'Home',
      requiresAuth: true,
      menu: false,
    },
  },
  {
    path: '/login',
    component: 'LoginPage',
    meta: {
      title: 'Login',
      guestOnly: true,
      layout: false,
      menu: false,
    },
  },
  {
    path: '/data/privacy',
    component: 'PrivacyListPage',
    meta: {
      title: 'P03 Privacy Data List',
      requiresAuth: true,
      menu: true,
      menuCode: 'P03',
      roles: ['STUDENT', 'COUNSELOR', 'TEACHING_ADMIN'],
    },
  },
  {
    path: '/data/privacy/detail',
    component: 'PrivacyDetailPage',
    meta: {
      title: 'P04 Privacy Data Detail',
      requiresAuth: true,
      menu: false,
      roles: ['STUDENT', 'COUNSELOR', 'TEACHING_ADMIN'],
    },
  },
  {
    path: '/data/privacy/edit',
    component: 'PrivacyEditPage',
    meta: {
      title: 'P05 Privacy Data Form',
      requiresAuth: true,
      menu: false,
      roles: ['STUDENT', 'TEACHING_ADMIN'],
    },
  },
  {
    path: '/data/student-archive',
    component: 'StudentArchivePage',
    meta: {
      title: 'P16 Student Archive',
      requiresAuth: true,
      menu: true,
      menuCode: 'P16',
      roles: ['COUNSELOR', 'TEACHING_ADMIN'],
    },
  },
  {
    path: '/system/users',
    component: 'UserManagementPage',
    meta: {
      title: 'P21 User Management',
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
      title: 'P22 Role & Department',
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
      title: 'P25 Profile & Security',
      requiresAuth: true,
      menu: true,
      menuCode: 'P25',
    },
  },
  {
    path: '/403',
    component: 'ForbiddenPage',
    meta: {
      title: 'Forbidden',
      requiresAuth: true,
      menu: false,
    },
  },
  {
    path: '/404',
    component: 'NotFoundPage',
    meta: {
      title: 'Not Found',
      layout: false,
      menu: false,
    },
  },
]
