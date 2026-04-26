<script setup>
import { computed } from 'vue'

const props = defineProps({
  pageNum: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  total: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['change'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize) || 1))

const goPage = (page) => {
  const next = Math.min(totalPages.value, Math.max(1, page))
  if (next !== props.pageNum) {
    emit('change', next)
  }
}
</script>

<template>
  <div class="pagination-bar">
    <div class="pagination-meta">
      <span>第 {{ pageNum }} / {{ totalPages }} 页</span>
      <span>共 {{ total }} 条</span>
    </div>
    <div class="action-row">
      <button class="ghost-button" type="button" :disabled="pageNum <= 1" @click="goPage(pageNum - 1)">上一页</button>
      <button class="ghost-button" type="button" :disabled="pageNum >= totalPages" @click="goPage(pageNum + 1)">下一页</button>
    </div>
  </div>
</template>
