<script setup>
import { computed, onMounted, reactive } from 'vue'
import { router } from '../router'
import { authStore } from '../stores/auth'
import { privacyStore } from '../stores/privacy'
import { privacyApi } from '../api/privacy'
import { messageStore } from '../stores/message'
import { formatDataType, formatStatusLabel, maskValue } from '../utils/helpers'

const filters = reactive({
  pageNum: 1,
  pageSize: 10,
  studentId: '',
  dataType: '',
  status: '',
})

const records = computed(() => privacyStore.records.value)
const total = computed(() => privacyStore.total.value)
const canEdit = computed(() => authStore.hasRole('STUDENT') || authStore.hasRole('TEACHING_ADMIN'))
const canFilterByStudentProfileId = computed(() => authStore.hasRole('COUNSELOR') || authStore.hasRole('TEACHING_ADMIN'))

const syncList = async () => {
  await privacyStore.fetchPage(filters)
}

const goDetail = (id) => {
  router.navigate(`/data/privacy/detail?id=${id}`)
}

const goCreate = () => {
  router.navigate('/data/privacy/edit?mode=create')
}

const goEdit = (id) => {
  router.navigate(`/data/privacy/edit?mode=edit&id=${id}`)
}

const removeDraft = async (id) => {
  await privacyApi.deletePrivacyData(id)
  messageStore.success('Draft record deleted.')
  await syncList()
}

onMounted(syncList)
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="page-chip">P03</span>
          <h3>My Privacy Data List</h3>
          <p>Unified filter bar, table and pagination for API-15. High-risk values are masked by default.</p>
        </div>
        <button v-if="canEdit" class="primary-button" type="button" @click="goCreate">Create Record</button>
      </div>

      <form class="toolbar toolbar-wide" @submit.prevent="syncList">
        <input
          v-if="canFilterByStudentProfileId"
          v-model.trim="filters.studentId"
          placeholder="Student Profile ID"
        />
        <select v-model="filters.dataType">
          <option value="">All Data Types</option>
          <option value="IDENTITY">Identity</option>
          <option value="GRADE">Grade</option>
          <option value="STATUS">Status</option>
          <option value="HEALTH_REPORT">Health Report</option>
        </select>
        <select v-model="filters.status">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="READY_FOR_EVIDENCE">Ready For Evidence</option>
        </select>
        <select v-model="filters.pageSize">
          <option :value="10">10 / page</option>
          <option :value="20">20 / page</option>
          <option :value="50">50 / page</option>
        </select>
        <button class="secondary-button" type="submit">Search</button>
      </form>
    </section>

    <section class="panel">
      <div class="table-meta">
        <span>Total {{ total }}</span>
        <span>{{ privacyStore.loading.value ? 'Loading records...' : 'API-15 synced' }}</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Student ID</th>
            <th>Data Type</th>
            <th>Title</th>
            <th>Security Level</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in records" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ maskValue(item.studentId, 2, 1) }}</td>
            <td>{{ formatDataType(item.dataType) }}</td>
            <td>{{ item.title }}</td>
            <td>{{ item.securityLevel }}</td>
            <td>
              <span class="tag tag-blue">{{ formatStatusLabel(item.status) }}</span>
            </td>
            <td>{{ item.createdAt }}</td>
            <td>
              <div class="action-row">
                <button class="text-button" type="button" @click="goDetail(item.id)">Detail</button>
                <button
                  v-if="canEdit"
                  class="text-button"
                  type="button"
                  @click="goEdit(item.id)"
                >
                  Edit
                </button>
                <button
                  v-if="canEdit && item.status === 'DRAFT'"
                  class="text-button danger"
                  type="button"
                  @click="removeDraft(item.id)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="8" class="empty-cell">No privacy data records</td>
          </tr>
        </tbody>
      </table>

      <div class="pager-row">
        <button class="ghost-button" type="button" :disabled="filters.pageNum <= 1" @click="filters.pageNum -= 1; syncList()">
          Prev
        </button>
        <span>Page {{ filters.pageNum }}</span>
        <button
          class="ghost-button"
          type="button"
          :disabled="records.length < Number(filters.pageSize)"
          @click="filters.pageNum += 1; syncList()"
        >
          Next
        </button>
      </div>
    </section>
  </div>
</template>
