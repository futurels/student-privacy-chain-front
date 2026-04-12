<script setup>
import { computed, onMounted, reactive } from 'vue'
import { privacyStore } from '../stores/privacy'
import { router } from '../router'
import { formatDataType, formatStatusLabel, maskValue } from '../utils/helpers'

const query = reactive({
  studentId: '',
  dataType: '',
})

const archive = computed(() => privacyStore.state.archive)
const studentInfo = computed(() => archive.value?.studentInfo || null)
const records = computed(() => archive.value?.records || [])

const syncArchive = async () => {
  if (!query.studentId) {
    return
  }

  await privacyStore.fetchArchive(query.studentId, {
    dataType: query.dataType,
  })
}

const goDetail = (id) => {
  router.navigate(`/data/privacy/detail?id=${id}`)
}

onMounted(syncArchive)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P16</span>
          <h3>Student Archive Overview</h3>
          <p>Base version only: student basic info plus privacy data content from API-20.</p>
        </div>
      </div>

      <form class="toolbar toolbar-wide" @submit.prevent="syncArchive">
        <input
          v-model.trim="query.studentId"
          placeholder="Student Profile ID"
        />
        <select v-model="query.dataType">
          <option value="">All Data Types</option>
          <option value="IDENTITY">Identity</option>
          <option value="GRADE">Grade</option>
          <option value="STATUS">Status</option>
          <option value="HEALTH_REPORT">Health Report</option>
        </select>
        <button class="secondary-button" type="submit">Load Archive</button>
      </form>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">Student Info</span>
            <h3>{{ studentInfo?.studentName || '--' }}</h3>
          </div>
        </div>

        <dl class="detail-grid">
          <div>
            <dt>studentId</dt>
            <dd>{{ studentInfo?.studentId || '--' }}</dd>
          </div>
          <div>
            <dt>studentNo</dt>
            <dd>{{ maskValue(studentInfo?.studentNo, 3, 2) }}</dd>
          </div>
          <div>
            <dt>studentName</dt>
            <dd>{{ studentInfo?.studentName || '--' }}</dd>
          </div>
        </dl>
      </article>

      <aside class="panel detail-panel">
        <div class="panel-header">
          <div>
            <span class="page-chip">Archive Summary</span>
            <h3>{{ records.length }} Records</h3>
          </div>
        </div>
        <div class="info-note">
          <strong>Scope</strong>
          <p>P16 in stage 3 is intentionally limited to student base info and privacy data records.</p>
        </div>
      </aside>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">Privacy Records</span>
          <h3>Authorized Student Data</h3>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>dataType</th>
            <th>title</th>
            <th>status</th>
            <th>action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in records" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ formatDataType(item.dataType) }}</td>
            <td>{{ item.title }}</td>
            <td>{{ formatStatusLabel(item.status) }}</td>
            <td>
              <button class="text-button" type="button" @click="goDetail(item.id)">Detail</button>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="5" class="empty-cell">No student archive data</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
