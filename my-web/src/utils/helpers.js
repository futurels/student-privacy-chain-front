export const formatDateTime = (value) => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

export const formatRoleLabel = (code) => {
  const map = {
    SYS_ADMIN: '系统管理员',
    STUDENT: '学生',
    COUNSELOR: '辅导员',
    TEACHING_ADMIN: '教务管理员',
  }
  return map[code] || code
}

export const formatStatusLabel = (status) => {
  const map = {
    ENABLED: '启用',
    DISABLED: '停用',
  }
  return map[status] || status || '--'
}

export const buildTree = (items = []) => {
  const map = new Map()
  const roots = []
  items.forEach((item) => map.set(item.id, { ...item, children: [] }))
  map.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(item)
    } else {
      roots.push(item)
    }
  })
  return roots
}
