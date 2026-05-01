<script setup>
import { APPROVAL_BUSINESS_TYPE_OPTIONS, APPROVAL_STATUS_OPTIONS } from '../types/approval'

defineProps({
  filters: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['submit', 'reset'])
</script>

<template>
  <form class="toolbar approval-filter-grid" @submit.prevent="emit('submit')">
    <select v-model="filters.businessType">
      <option
        v-for="option in APPROVAL_BUSINESS_TYPE_OPTIONS"
        :key="option.value || 'all-business'"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <select v-model="filters.status">
      <option
        v-for="option in APPROVAL_STATUS_OPTIONS"
        :key="option.value || 'all-status'"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <div class="approval-filter-tip">
      <strong>默认排序</strong>
      <span>按审批时间倒序显示</span>
    </div>

    <div class="action-row">
      <button class="secondary-button" type="submit">查询</button>
      <button class="ghost-button" type="button" @click="emit('reset')">重置</button>
    </div>
  </form>
</template>
