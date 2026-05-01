<script setup>
import { AUDIT_LOG_RESULT_OPTIONS } from '../types/audit-log'

defineProps({
  filters: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['submit', 'reset'])
</script>

<template>
  <form class="toolbar audit-log-filter-grid" @submit.prevent="emit('submit')">
    <input v-model.trim="filters.operatorId" placeholder="按 operatorId 查询" />
    <input v-model.trim="filters.action" placeholder="按 action 查询" />

    <select v-model="filters.result">
      <option
        v-for="option in AUDIT_LOG_RESULT_OPTIONS"
        :key="option.value || 'all-result'"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <input v-model="filters.startTime" type="datetime-local" />
    <input v-model="filters.endTime" type="datetime-local" />

    <div class="approval-filter-tip">
      <strong>默认排序</strong>
      <span>按 occurredAt 倒序显示</span>
    </div>

    <div class="action-row">
      <button class="secondary-button" type="submit">查询</button>
      <button class="ghost-button" type="button" @click="emit('reset')">重置</button>
    </div>
  </form>
</template>
