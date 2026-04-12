<script setup>
import { computed, onMounted, ref } from 'vue'
import { router } from '../router'
import { privacyStore } from '../stores/privacy'
import { messageStore } from '../stores/message'
import { formatDataType, formatStatusLabel, maskValue } from '../utils/helpers'

const route = computed(() => router.currentRoute.value)
const detail = computed(() => privacyStore.state.detail)
const showRawDigest = ref(false)

const loadDetail = async () => {
  const id = route.value.query.get('id')
  if (id) {
    await privacyStore.fetchDetail(id)
  }
}

const goBack = () => {
  router.navigate('/data/privacy')
}

const goEdit = () => {
  router.navigate(`/data/privacy/edit?mode=edit&id=${detail.value?.id}`)
}

const disabledAction = (label) => {
  messageStore.info(`${label} is reserved for later stages and stays disabled in stage 3.`)
}

onMounted(loadDetail)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P04</span>
          <h3>Privacy Data Detail</h3>
          <p>Left-main right-side layout for API-16. No evidence or authorization API is called in this stage.</p>
        </div>
        <div class="action-row">
          <button class="ghost-button" type="button" @click="goBack">Back</button>
          <button class="secondary-button" type="button" @click="goEdit">Edit Draft</button>
        </div>
      </div>
    </section>

    <section class="content-grid detail-two-side">
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">Main Info</span>
            <h3>{{ detail?.title || '--' }}</h3>
          </div>
        </div>

        <dl class="detail-grid">
          <div>
            <dt>Privacy Data ID</dt>
            <dd>{{ detail?.id || '--' }}</dd>
          </div>
          <div>
            <dt>Student ID</dt>
            <dd>{{ maskValue(detail?.studentId, 2, 1) }}</dd>
          </div>
          <div>
            <dt>Data Type</dt>
            <dd>{{ formatDataType(detail?.dataType) }}</dd>
          </div>
          <div>
            <dt>Security Level</dt>
            <dd>{{ detail?.securityLevel || '--' }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ formatStatusLabel(detail?.status) }}</dd>
          </div>
          <div>
            <dt>Attachment Count</dt>
            <dd>{{ detail?.attachmentCount ?? '--' }}</dd>
          </div>
        </dl>

        <div class="content-card">
          <div class="content-head">
            <strong>Content Digest</strong>
            <button class="text-button" type="button" @click="showRawDigest = !showRawDigest">
              {{ showRawDigest ? 'Mask' : 'Show Raw' }}
            </button>
          </div>
          <code class="long-code">
            {{ showRawDigest ? (detail?.contentDigest || '--') : maskValue(detail?.contentDigest, 8, 6) }}
          </code>
        </div>
      </article>

      <aside class="panel detail-panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">Actions</span>
            <h3>Stage Boundary</h3>
          </div>
        </div>

        <div class="side-actions">
          <button class="primary-button" type="button" disabled @click="disabledAction('Submit evidence application')">
            Submit Evidence Application
          </button>
          <button class="secondary-button" type="button" disabled @click="disabledAction('Launch authorization application')">
            Launch Authorization Application
          </button>
        </div>

        <div class="info-note">
          <strong>Stage 3 only</strong>
          <p>This page only renders API-16 fields and keeps later-stage actions disabled.</p>
        </div>
      </aside>
    </section>
  </div>
</template>
