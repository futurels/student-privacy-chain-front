import { ref } from 'vue'

const items = ref([])
let seed = 0

const push = ({ type = 'info', title = '提示', content = '', duration = 3000 }) => {
  const id = `${Date.now()}-${seed += 1}`
  items.value.push({ id, type, title, content })
  window.setTimeout(() => {
    items.value = items.value.filter((item) => item.id !== id)
  }, duration)
}

export const messageStore = {
  items,
  success(content, title = '操作成功') {
    push({ type: 'success', title, content })
  },
  error(content, title = '操作失败') {
    push({ type: 'error', title, content, duration: 4200 })
  },
  warning(content, title = '请注意') {
    push({ type: 'warning', title, content, duration: 3600 })
  },
  info(content, title = '系统提示') {
    push({ type: 'info', title, content })
  },
}
