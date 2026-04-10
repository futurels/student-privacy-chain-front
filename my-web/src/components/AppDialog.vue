<script setup>
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
      </div>
    </div>
  </teleport>
</template>
