<script setup>
import { useSlots } from 'vue'

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  width: {
    type: String,
    default: '680px',
  },
})

const emit = defineEmits(['close'])
const slots = useSlots()
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="dialog-mask" @click.self="emit('close')">
      <div class="dialog-panel" :style="{ width }">
        <div class="dialog-header">
          <h3>{{ title }}</h3>
          <button class="ghost-button" type="button" @click="emit('close')">关闭</button>
        </div>
        <div class="dialog-body">
          <slot />
        </div>
        <div v-if="slots.footer" class="dialog-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </teleport>
</template>
