<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { router } from '../router'
import { privacyApi } from '../api/privacy'
import { privacyStore } from '../stores/privacy'
import { messageStore } from '../stores/message'

const route = computed(() => router.currentRoute.value)
const mode = computed(() => route.value.query.get('mode') || 'create')
const editingId = computed(() => route.value.query.get('id') || '')
const step = ref(1)

const form = reactive({
  studentId: '',
  dataType: '',
  title: '',
  content: '',
  securityLevel: '',
})

const loadEditData = async () => {
  if (mode.value !== 'edit' || !editingId.value) {
    return
  }
  const detail = await privacyStore.fetchDetail(editingId.value)
  form.studentId = detail.studentId || ''
  form.dataType = detail.dataType || ''
  form.title = detail.title || ''
  form.securityLevel = detail.securityLevel || ''
  form.content = ''
}

const nextStep = () => {
  step.value = Math.min(3, step.value + 1)
}

const prevStep = () => {
  step.value = Math.max(1, step.value - 1)
}

const save = async () => {
  if (mode.value === 'edit' && editingId.value) {
    await privacyApi.updatePrivacyData(editingId.value, {
      title: form.title,
      content: form.content,
      securityLevel: form.securityLevel,
    })
    messageStore.success('Draft updated through API-18.')
  } else {
    const result = await privacyApi.createPrivacyData({
      studentId: Number(form.studentId),
      dataType: form.dataType,
      title: form.title,
      content: form.content,
      securityLevel: form.securityLevel,
    })
    messageStore.success(`Record created with ID ${result.id}.`)
  }
  router.navigate('/data/privacy')
}

const deleteDraft = async () => {
  if (!editingId.value) {
    return
  }
  await privacyApi.deletePrivacyData(editingId.value)
  messageStore.success('Draft deleted through API-19.')
  router.navigate('/data/privacy')
}

onMounted(loadEditData)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P05</span>
          <h3>{{ mode === 'edit' ? 'Edit Privacy Data Draft' : 'Create Privacy Data Draft' }}</h3>
          <p>Three-step form. Only API-17, API-18 and API-19 are used in this page.</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="router.navigate('/data/privacy')">Back to List</button>
          <button v-if="mode === 'edit'" class="text-button danger" type="button" @click="deleteDraft">Delete Draft</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="stepper">
        <div class="step-item" :class="{ active: step >= 1 }">1. Basic</div>
        <div class="step-item" :class="{ active: step >= 2 }">2. Content</div>
        <div class="step-item" :class="{ active: step >= 3 }">3. Security</div>
      </div>

      <form class="form-grid" @submit.prevent="save">
        <template v-if="step === 1">
          <label class="field">
            <span>studentId</span>
            <input v-model.trim="form.studentId" :disabled="mode === 'edit'" required />
          </label>
          <label class="field">
            <span>dataType</span>
            <select v-model="form.dataType" :disabled="mode === 'edit'" required>
              <option value="">Select data type</option>
              <option value="IDENTITY">IDENTITY</option>
              <option value="GRADE">GRADE</option>
              <option value="STATUS">STATUS</option>
              <option value="HEALTH_REPORT">HEALTH_REPORT</option>
            </select>
          </label>
          <label class="field">
            <span>title</span>
            <input v-model.trim="form.title" required />
          </label>
        </template>

        <template v-if="step === 2">
          <label class="field">
            <span>content</span>
            <textarea v-model.trim="form.content" rows="10" placeholder="Structured content or description text"></textarea>
          </label>
          <div class="info-note">
            <strong>Edit note</strong>
            <p>API-16 does not return `content`, so edit mode starts with an empty content box for a fresh update.</p>
          </div>
        </template>

        <template v-if="step === 3">
          <label class="field">
            <span>securityLevel</span>
            <select v-model="form.securityLevel" required>
              <option value="">Select security level</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
            </select>
          </label>
          <div class="summary-box">
            <div><strong>studentId:</strong> {{ form.studentId || '--' }}</div>
            <div><strong>dataType:</strong> {{ form.dataType || '--' }}</div>
            <div><strong>title:</strong> {{ form.title || '--' }}</div>
            <div><strong>securityLevel:</strong> {{ form.securityLevel || '--' }}</div>
          </div>
        </template>

        <div class="action-row">
          <button v-if="step > 1" class="ghost-button" type="button" @click="prevStep">Previous</button>
          <button v-if="step < 3" class="secondary-button" type="button" @click="nextStep">Next</button>
          <button v-if="step === 3" class="primary-button" type="submit">
            {{ mode === 'edit' ? 'Save Draft' : 'Create Draft' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
