<template>
  <div class="novel-meta-page">
    <div class="left-panel">
      <a-card size="small" class="left-panel-card" :body-style="{ 'padding-top': 0 }">
        <a-tabs v-model:activeKey="activeLeftTab" class="left-panel-tabs">
          <a-tab-pane key="entry" tab="任务入口">
            <a-form layout="vertical">
              <a-form-item label="小说编码 novelCode" required>
                <a-input v-model:value="uploadForm.novelCode" placeholder="如 longzu2 或 龙族2" @blur="handleNovelCodeInputBlur" />
              </a-form-item>

              <a-alert
                v-if="historyCheckStatus === 'idle'"
                type="info"
                show-icon
                message="输入 novelCode 并失焦后，系统会自动判断是恢复历史任务还是上传 TXT 新建任务。"
                class="tab-alert"
              />

              <div v-else-if="historyCheckStatus === 'checking'" class="checking-state">
                <a-spin size="small" />
                <span>正在检索历史任务...</span>
              </div>

              <template v-else-if="historyCheckStatus === 'has-history'">
                <a-alert
                  type="info"
                  show-icon
                  :message="`检测到 ${recoverJobOptions.length} 条历史任务，请选择需要恢复的 jobId。`"
                  class="tab-alert"
                />
                <a-form-item label="选择历史任务 jobId">
                  <a-select
                    v-model:value="selectedRecoverJobId"
                    placeholder="请选择历史任务"
                    :options="recoverJobOptions"
                    :disabled="!recoverJobOptions.length"
                    style="width: 100%"
                    option-label-prop="label"
                  >
                    <template #option="{ label, desc }">
                      <div class="job-option">
                        <div class="job-option-title">{{ label }}</div>
                        <div class="job-option-desc">{{ desc }}</div>
                      </div>
                    </template>
                  </a-select>
                </a-form-item>
                <a-button type="primary" block :disabled="!selectedRecoverJobId" :loading="recovering" @click="handleRecover">
                  恢复任务
                </a-button>
              </template>

              <template v-else-if="historyCheckStatus === 'no-history'">
                <a-alert type="success" show-icon message="未检索到历史任务，可以上传 TXT 并拆分。" class="tab-alert" />
                <a-form-item label="每块原文总字数（chunkSize）">
                  <a-input-number v-model:value="uploadForm.chunkSize" :min="500" :max="20000" :step="500" style="width: 100%" />
                </a-form-item>
                <a-form-item label="前后上下文字数（overlap）">
                  <a-input-number v-model:value="uploadForm.overlap" :min="0" :max="2000" :step="50" style="width: 100%" />
                </a-form-item>
                <a-form-item label="TXT 文件" required>
                  <a-upload :file-list="fileList" :before-upload="onBeforeUpload" :max-count="1" accept=".txt" @remove="onRemoveFile">
                    <a-button><UploadOutlined />选择 txt 文件</a-button>
                  </a-upload>
                </a-form-item>
                <a-button type="primary" block :loading="uploading" :disabled="!canUpload" @click="handleUploadAndGenerate">
                  上传 TXT 并拆分
                </a-button>
              </template>
            </a-form>
          </a-tab-pane>

          <a-tab-pane v-if="showCurrentTaskTab" key="current" tab="当前任务">
            <a-descriptions v-if="currentJob" :column="1" size="small" bordered :label-style="{ width: '100px' }">
              <!-- <a-descriptions-item label="jobId">
                {{ currentJob.jobId }}
              </a-descriptions-item> -->
              <a-descriptions-item label="小说编码">
                {{ currentJob.novelCode }}
              </a-descriptions-item>
              <!-- <a-descriptions-item label="原文文件">
                {{ currentJob.sourceFileName }}
              </a-descriptions-item> -->
              <a-descriptions-item label="状态">
                <a-tag :color="statusColor(currentJob.status)">
                  {{ statusText(currentJob.status) }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="片段总数">
                {{ currentJob.totalChunks }}
              </a-descriptions-item>
              <a-descriptions-item label="拆分进度">
                <a-progress :percent="metaPercent" :status="currentJob.status === 'failed' ? 'exception' : undefined" size="small" />
              </a-descriptions-item>
              <a-descriptions-item v-if="currentJob.lastError" label="错误信息">
                <span class="error-text">{{ currentJob.lastError }}</span>
              </a-descriptions-item>
            </a-descriptions>

            <div class="action-row">
              <a-button @click="handleRefresh">刷新</a-button>
              <a-button :loading="pausing" :disabled="!canPause" @click="handlePause">暂停任务</a-button>
              <a-button :loading="rebuildingIndex" :disabled="!canRebuildIndex" @click="handleRebuildIndex">同步重建</a-button>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <div class="right-panel">
      <a-card title="Meta 数据结果" size="small">
        <template #extra>
          <a-space>
            <a-input v-model:value="queryNovelCode" placeholder="输入 novelCode（支持中文）" style="width: 220px" />
            <a-button size="small" @click="handleQueryMeta">查询</a-button>
          </a-space>
        </template>

        <div class="meta-section">
          <div class="section-title">Chunk Meta 列表</div>

          <div class="toolbar">
            <a-input-search
              v-model:value="metaKeyword"
              placeholder="字段筛选：按 chunkId / 摘要 / 实体关键词过滤"
              allow-clear
              style="max-width: 420px"
              enter-button="筛选"
              @search="handleMetaFilter"
            />
            <a-button :loading="metaLoading" @click="loadMetaList(1)">刷新列表</a-button>
          </div>

          <!-- <div class="toolbar toolbar-secondary">
            <a-input-search
              v-model:value="searchForm.query"
              placeholder="智能检索：如 林雷第一次觉醒发生在哪里"
              allow-clear
              style="min-width: 320px; max-width: 520px"
              enter-button="智能检索"
              :loading="searching"
              @search="handleSearchMeta"
            />
            <a-input-number v-model:value="searchForm.topN" :min="1" :max="20" :step="1" style="width: 120px" />
            <a-switch v-model:checked="scoreSearchEnabled" />
            <span class="toolbar-label">按 score 搜索</span>
            <a-button @click="handleResetSmartSearch">清空智能检索</a-button>
          </div>

          <div v-if="searchResult" class="search-result-meta">
            <span>智能检索命中 {{ searchResult.total }} 条</span>
            <span v-if="searchResult.queryWords.length">分词：{{ searchResult.queryWords.join(' / ') }}</span>
            <span v-if="!scoreSearchEnabled">已完成检索，打开“按 score 搜索”后表格将展示排序结果</span>
          </div> -->

          <a-empty v-if="!displayedMetaLoading && !displayedMetaRows.length" :description="metaTableEmptyDescription" />

          <a-table
            v-else
            :columns="metaColumns"
            :data-source="displayedMetaRows"
            :loading="displayedMetaLoading"
            :pagination="displayedMetaPagination"
            size="small"
            row-key="chunkId"
            bordered
            :scroll="{ x: 1680 }"
            @change="handleMetaTableChange"
          >
            <template #bodyCell="{ column, text, record }">
              <template v-if="column.dataIndex === 'chunkId'">
                <span class="chunk-id">{{ text }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'score'">
                <span>{{ text ?? '-' }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'summary'">
                <div class="summary-cell">{{ text || '-' }}</div>
              </template>
              <template v-else-if="column.dataIndex === 'createdAt'">
                {{ formatTime(text) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button type="link" size="small" @click="openMetaDetail(record)">详情</a-button>
              </template>
              <template v-else>
                <a-space v-if="Array.isArray(text) && text.length" wrap>
                  <a-tag v-for="item in text" :key="`${record.chunkId}-${column.dataIndex}-${item}`">
                    {{ item }}
                  </a-tag>
                </a-space>
                <span v-else>-</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-card>
    </div>

    <a-drawer v-model:open="detailVisible" title="Chunk Meta 详情" width="920" destroy-on-close>
      <a-spin :spinning="detailLoading">
        <a-empty v-if="!detailRecord" description="暂无详情数据" />
        <a-descriptions v-else :column="1" size="small" bordered>
          <a-descriptions-item label="Chunk">
            <span class="chunk-id">{{ detailRecord.chunkId }}</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.score != null" label="Score">
            {{ detailRecord.score }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">
            {{ formatTime(detailRecord.createdAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="摘要">
            <div class="summary-cell">{{ detailRecord.summary || '-' }}</div>
          </a-descriptions-item>
          <a-descriptions-item label="关键词">
            <a-space v-if="detailRecord.keywords.length" wrap>
              <a-tag v-for="item in detailRecord.keywords" :key="item">
                {{ item }}
              </a-tag>
            </a-space>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="人物">
            <a-space v-if="detailRecord.characters.length" wrap>
              <a-tag v-for="item in detailRecord.characters" :key="item">
                {{ item }}
              </a-tag>
            </a-space>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="地点">
            <a-space v-if="detailRecord.locations.length" wrap>
              <a-tag v-for="item in detailRecord.locations" :key="item">
                {{ item }}
              </a-tag>
            </a-space>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="组织">
            <a-space v-if="detailRecord.organizations.length" wrap>
              <a-tag v-for="item in detailRecord.organizations" :key="item">
                {{ item }}
              </a-tag>
            </a-space>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="概念">
            <a-space v-if="detailRecord.concepts.length" wrap>
              <a-tag v-for="item in detailRecord.concepts" :key="item">
                {{ item }}
              </a-tag>
            </a-space>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="事件">
            <a-space v-if="detailRecord.events.length" wrap>
              <a-tag v-for="item in detailRecord.events" :key="item">
                {{ item }}
              </a-tag>
            </a-space>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="原文">
            <pre v-if="detailRecord.chunkText" class="chunk-text">{{ detailRecord.chunkText }}</pre>
            <span v-else class="empty-chunk-text">当前未附带原文，可打开“详情附带原文”后重新查看。</span>
          </a-descriptions-item>
        </a-descriptions>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import type { TablePaginationConfig, UploadFile } from 'ant-design-vue'
import {
  getNovelMetaDetail,
  getOutlineJobStatus,
  listNovelMetas,
  listOutlineJobs,
  pauseOutlineJob,
  rebuildNovelMetaIndex,
  startNovelMetaGenerate,
  uploadAndSplitNovel,
  type NovelChunkMeta,
  type NovelChunkMetaDetail,
  type NovelChunkMetaSearchResult,
  type NovelOutlineJob
} from '@/api/novel-outline'

type HistoryCheckStatus = 'idle' | 'checking' | 'has-history' | 'no-history'
type MetaTableRow = NovelChunkMeta & {
  score?: number
  chunkText?: string
}

const NOVEL_META_CURRENT_JOB_STORAGE_KEY = 'writer-assistant:novel-meta:current-job'
const CURRENT_JOB_AUTO_REFRESH_INTERVAL = 5000

const activeLeftTab = ref('entry')

const uploadForm = reactive({
  novelCode: '',
  chunkSize: 5000,
  overlap: 300
})

const currentJob = ref<NovelOutlineJob | null>(null)
const queryNovelCode = ref('')
const fileList = ref<UploadFile[]>([])
const pickedFile = ref<File | null>(null)

const recoverJobOptions = ref<Array<{ value: string; label: string; desc: string }>>([])
const selectedRecoverJobId = ref('')
const historyCheckStatus = ref<HistoryCheckStatus>('idle')
const checkedNovelCode = ref('')

const uploading = ref(false)
const recovering = ref(false)
const rebuildingIndex = ref(false)
const pausing = ref(false)
const metaLoading = ref(false)
const searching = ref(false)
const scoreSearchEnabled = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)

let currentJobAutoRefreshTimer: number | null = null
let currentJobRefreshing = false

const metaList = ref<NovelChunkMeta[]>([])
const metaKeyword = ref('')
const metaPaginationState = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})
const metaPagination = computed<TablePaginationConfig>(() => ({
  current: metaPaginationState.current,
  pageSize: metaPaginationState.pageSize,
  total: metaPaginationState.total,
  showSizeChanger: true,
  showTotal: total => `共 ${total} 条`
}))

const searchForm = reactive({
  query: '',
  topN: 5,
  includeChunks: true
})
const searchResult = ref<NovelChunkMetaSearchResult | null>(null)
const detailRecord = ref<(NovelChunkMetaDetail & { score?: number }) | null>(null)

const canUpload = computed(
  () => historyCheckStatus.value === 'no-history' && !!uploadForm.novelCode.trim() && !!pickedFile.value && !uploading.value
)
const showCurrentTaskTab = computed(() => !!currentJob.value)
const isScoreSearchActive = computed(() => scoreSearchEnabled.value && !!searchResult.value)

const searchedMetaRows = computed<MetaTableRow[]>(() =>
  (searchResult.value?.hits || []).map(hit => ({
    novelCode: searchResult.value?.novelCode || queryNovelCode.value || currentJob.value?.novelCode || '',
    chunkId: hit.id,
    summary: hit.summary,
    keywords: hit.keywords,
    characters: hit.characters,
    locations: hit.locations,
    organizations: hit.organizations,
    concepts: hit.concepts,
    events: hit.events,
    score: hit.score,
    chunkText: hit.chunkText
  }))
)

const displayedMetaRows = computed<MetaTableRow[]>(() => {
  if (!isScoreSearchActive.value) {
    return metaList.value
  }

  const keyword = metaKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return searchedMetaRows.value
  }

  return searchedMetaRows.value.filter(row => {
    const searchableText = [
      row.chunkId,
      row.summary,
      ...row.keywords,
      ...row.characters,
      ...row.locations,
      ...row.organizations,
      ...row.concepts,
      ...row.events
    ]
      .join('\n')
      .toLowerCase()

    return searchableText.includes(keyword)
  })
})

const metaTableEmptyDescription = computed(() => {
  if (!queryNovelCode.value) {
    return '先输入或恢复一个 novelCode'
  }
  if (isScoreSearchActive.value) {
    return '没有匹配到相关 meta'
  }
  return '暂无 meta 数据'
})

const displayedMetaPagination = computed<TablePaginationConfig | false>(() => (isScoreSearchActive.value ? false : metaPagination.value))

const displayedMetaLoading = computed(() => metaLoading.value || (scoreSearchEnabled.value && searching.value))

const metaColumns = computed<any[]>(() => {
  const columns: any[] = [
    // {
    //   title: '编号',
    //   dataIndex: 'chunkId',
    //   key: 'chunkId',
    //   width: 80,
    //   fixed: 'left' as const
    // }
  ]

  if (isScoreSearchActive.value) {
    columns.push({
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      width: 100
    })
  }

  columns.push(
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true
    },
    // {
    //   title: '关键词',
    //   dataIndex: 'keywords',
    //   key: 'keywords',
    //   width: 240
    // },
    // {
    //   title: '人物',
    //   dataIndex: 'characters',
    //   key: 'characters',
    //   width: 200
    // },
    // {
    //   title: '地点',
    //   dataIndex: 'locations',
    //   key: 'locations',
    //   width: 200
    // },
    // {
    //   title: '组织',
    //   dataIndex: 'organizations',
    //   key: 'organizations',
    //   width: 200
    // },
    // {
    //   title: '概念',
    //   dataIndex: 'concepts',
    //   key: 'concepts',
    //   width: 200
    // },
    // {
    //   title: '事件',
    //   dataIndex: 'events',
    //   key: 'events',
    //   width: 240
    // },
    // {
    //   title: '创建时间',
    //   dataIndex: 'createdAt',
    //   key: 'createdAt',
    //   width: 170
    // },
    {
      title: '操作',
      key: 'action',
      dataIndex: 'action',
      width: 90,
      fixed: 'right' as const
    }
  )

  return columns
})

const canRebuildIndex = computed(
  () =>
    !!currentJob.value &&
    currentJob.value.status !== 'splitting' &&
    currentJob.value.status !== 'meta_generating' &&
    currentJob.value.status !== 'generating'
)

const canPause = computed(
  () => !!currentJob.value && (currentJob.value.status === 'meta_generating' || currentJob.value.status === 'generating')
)
const shouldAutoRefreshCurrentJob = computed(() => activeLeftTab.value === 'current' && isRunningJob(currentJob.value))

const metaPercent = computed(() => {
  if (!currentJob.value || !currentJob.value.totalChunks) return 0
  return Math.floor((currentJob.value.metaGeneratedChunks / currentJob.value.totalChunks) * 100)
})

function isRunningJob(job?: NovelOutlineJob | null) {
  return !!job && ['splitting', 'meta_generating', 'generating'].includes(job.status)
}

function isMetaComplete(job?: NovelOutlineJob | null) {
  return !!job && !!job.totalChunks && job.metaGeneratedChunks >= job.totalChunks
}

function statusColor(status: NovelOutlineJob['status']) {
  return (
    {
      splitting: 'processing',
      meta_generating: 'processing',
      split_done: 'blue',
      generating: 'processing',
      done: 'success',
      failed: 'error',
      paused: 'orange',
      aborted: 'default'
    }[status] || 'default'
  )
}

function statusText(status: NovelOutlineJob['status']) {
  if (status === 'split_done') {
    return isMetaComplete(currentJob.value) ? 'Meta 已完成' : '拆分完成'
  }
  return (
    {
      splitting: '拆分中',
      meta_generating: 'Meta 生成中',
      generating: '大纲生成中',
      done: '全部完成',
      failed: '失败',
      paused: '已暂停',
      aborted: '已中止'
    }[status] || status
  )
}

function applyCurrentJob(job: NovelOutlineJob) {
  currentJob.value = job
  queryNovelCode.value = job.novelCode
  checkedNovelCode.value = job.novelCode
  uploadForm.novelCode = job.novelCode
  activeLeftTab.value = 'current'
  persistCurrentJob(job)
}

function persistCurrentJob(job: NovelOutlineJob) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    NOVEL_META_CURRENT_JOB_STORAGE_KEY,
    JSON.stringify({
      jobId: job.jobId,
      novelCode: job.novelCode
    })
  )
}

function clearPersistedCurrentJob() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(NOVEL_META_CURRENT_JOB_STORAGE_KEY)
}

async function restorePersistedCurrentJob() {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(NOVEL_META_CURRENT_JOB_STORAGE_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as { jobId?: string; novelCode?: string }
    if (!parsed.jobId) {
      clearPersistedCurrentJob()
      return
    }

    const res = await getOutlineJobStatus(parsed.jobId)
    if (res.data) {
      applyCurrentJob(res.data)
      metaPaginationState.current = 1
      await loadMetaList(1, true)
      return
    }

    if (!parsed.novelCode) {
      clearPersistedCurrentJob()
      return
    }

    const fallbackRes = await listOutlineJobs(parsed.novelCode)
    const jobs = fallbackRes.data || []
    const fallbackJob =
      jobs.find(job => ['splitting', 'meta_generating', 'generating'].includes(job.status)) ||
      jobs.find(job => !isMetaComplete(job)) ||
      jobs[0]

    if (!fallbackJob) {
      clearPersistedCurrentJob()
      return
    }

    applyCurrentJob(fallbackJob)
    metaPaginationState.current = 1
    await loadMetaList(1, true)
  } catch (error) {
    console.warn('恢复本地任务失败', error)
    clearPersistedCurrentJob()
  }
}

function pickAutoCurrentJob(jobs: NovelOutlineJob[]) {
  return jobs.find(job => isRunningJob(job)) || jobs.find(job => !isMetaComplete(job)) || null
}

async function restoreCurrentJobFromJobList() {
  try {
    const res = await listOutlineJobs()
    const jobs = res.data || []
    const nextJob = pickAutoCurrentJob(jobs)
    if (!nextJob) return
    applyCurrentJob(nextJob)
    metaPaginationState.current = 1
    await loadMetaList(1, true)
  } catch (error) {
    console.warn('自动发现当前任务失败', error)
  }
}

async function initializeCurrentJob() {
  await restorePersistedCurrentJob()
  if (currentJob.value) return
  await restoreCurrentJobFromJobList()
}

function onBeforeUpload(file: File) {
  if (!file.name.toLowerCase().endsWith('.txt')) {
    antMessage.error('仅支持 .txt 文件')
    return false as any
  }
  pickedFile.value = file
  fileList.value = [
    {
      uid: String(file.lastModified),
      name: file.name,
      status: 'done'
    } as UploadFile
  ]
  return false
}

function onRemoveFile() {
  pickedFile.value = null
  fileList.value = []
  return true
}

async function startMetaGenerateTask(
  params: { novelCode: string; jobId?: string },
  successMessage = 'Meta 生成任务已启动，请手动刷新查看进度'
) {
  const res = await startNovelMetaGenerate(params)
  if (!res.data) {
    return
  }
  applyCurrentJob(res.data)
  await loadMetaList(1, true)
  antMessage.success(successMessage)
}

function resetHistoryLookup() {
  checkedNovelCode.value = ''
  historyCheckStatus.value = 'idle'
  selectedRecoverJobId.value = ''
  recoverJobOptions.value = []
}

async function handleNovelCodeBlur(force = false) {
  const novelCode = uploadForm.novelCode.trim()
  if (!novelCode) {
    resetHistoryLookup()
    return
  }
  if (!force && checkedNovelCode.value === novelCode && historyCheckStatus.value !== 'idle') {
    return
  }

  historyCheckStatus.value = 'checking'
  try {
    const res = await listOutlineJobs(novelCode)
    const jobs = res.data || []
    recoverJobOptions.value = jobs.map(job => ({
      value: job.jobId,
      label: `${job.jobId}  [${job.status}]  ${job.metaGeneratedChunks}/${job.totalChunks}`,
      desc: `原文：${job.sourceFileName}  · 创建：${formatTime(job.createdAt)}`
    }))
    selectedRecoverJobId.value = jobs[0]?.jobId || ''
    checkedNovelCode.value = novelCode
    historyCheckStatus.value = jobs.length ? 'has-history' : 'no-history'
  } catch (e: any) {
    resetHistoryLookup()
    antMessage.error(e?.response?.data?.msg || e?.message || '查询失败')
  }
}

function handleNovelCodeInputBlur() {
  return handleNovelCodeBlur()
}

async function handleUploadAndGenerate() {
  const novelCode = uploadForm.novelCode.trim()
  if (!novelCode) {
    antMessage.warning('请先输入 novelCode')
    return
  }
  if (!pickedFile.value) {
    antMessage.warning('请先选择 TXT 文件')
    return
  }

  if (checkedNovelCode.value !== novelCode || historyCheckStatus.value === 'idle') {
    await handleNovelCodeBlur(true)
  }
  if (historyCheckStatus.value === 'has-history') {
    antMessage.warning('该 novelCode 已有历史任务，请直接选择 jobId 恢复')
    return
  }
  if (historyCheckStatus.value !== 'no-history') {
    return
  }

  uploading.value = true
  try {
    const splitRes = await uploadAndSplitNovel({
      novelCode,
      chunkSize: uploadForm.chunkSize,
      overlap: uploadForm.overlap,
      file: pickedFile.value
    })

    if (!splitRes.data) {
      return
    }

    applyCurrentJob(splitRes.data)
    antMessage.success(`拆分完成，共 ${splitRes.data.totalChunks} 块`)
    await startMetaGenerateTask(
      { novelCode: splitRes.data.novelCode, jobId: splitRes.data.jobId },
      '拆分完成，Meta 生成任务已启动，请手动刷新查看进度'
    )
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '处理失败')
  } finally {
    uploading.value = false
  }
}

async function handleRecover() {
  if (!selectedRecoverJobId.value) return
  recovering.value = true
  try {
    const res = await getOutlineJobStatus(selectedRecoverJobId.value)
    if (!res.data) {
      antMessage.error('未查到该任务')
      return
    }
    applyCurrentJob(res.data)
    metaPaginationState.current = 1
    await loadMetaList(1, true)

    if (res.data.status === 'splitting') {
      antMessage.info('任务仍在拆分中，请手动刷新查看最新进度')
      return
    }

    if (res.data.status === 'paused' && isMetaComplete(res.data)) {
      antMessage.info('任务当前已暂停；如需继续生成大纲，请前往大纲页面恢复')
      return
    }

    const shouldResumeMeta = !isMetaComplete(res.data) && res.data.status !== 'generating'

    if (shouldResumeMeta) {
      await startMetaGenerateTask(
        {
          novelCode: res.data.novelCode,
          jobId: res.data.jobId
        },
        '任务已恢复，Meta 生成已继续，请手动刷新查看进度'
      )
      return
    }

    if (res.data.status === 'generating') {
      antMessage.info('任务已恢复，当前正在生成大纲，请手动刷新查看进度')
      return
    }

    antMessage.success('任务已恢复')
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '恢复失败')
  } finally {
    recovering.value = false
  }
}

async function handleRebuildIndex() {
  if (!currentJob.value) return
  rebuildingIndex.value = true
  try {
    const res = await rebuildNovelMetaIndex({
      novelCode: currentJob.value.novelCode,
      jobId: currentJob.value.jobId
    })
    if (res.data) {
      applyCurrentJob(res.data)
    }
    await loadMetaList(metaPaginationState.current, true)
    antMessage.success('Meta 索引重建完成')
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '重建失败')
  } finally {
    rebuildingIndex.value = false
  }
}

async function handlePause() {
  if (!currentJob.value) return
  pausing.value = true
  try {
    const res = await pauseOutlineJob(currentJob.value.jobId)
    if (res.data) {
      applyCurrentJob(res.data)
    }
    await loadMetaList(metaPaginationState.current, true)
    antMessage.success('任务已暂停')
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '暂停失败')
  } finally {
    pausing.value = false
  }
}

async function handleRefresh() {
  await refreshCurrentJobStatus()
  await loadMetaList(metaPaginationState.current, true)
}

async function refreshCurrentJobStatus(silent = false) {
  if (!currentJob.value) return
  if (currentJobRefreshing) return

  currentJobRefreshing = true
  try {
    const res = await getOutlineJobStatus(currentJob.value.jobId)
    if (res.data) {
      applyCurrentJob(res.data)
    } else {
      currentJob.value = null
      clearPersistedCurrentJob()
    }
  } catch (e: any) {
    if (!silent) {
      antMessage.error(e?.response?.data?.msg || e?.message || '刷新失败')
    } else {
      console.warn('自动刷新当前任务失败', e)
    }
  } finally {
    currentJobRefreshing = false
  }
}

function stopCurrentJobAutoRefresh() {
  if (currentJobAutoRefreshTimer) {
    clearInterval(currentJobAutoRefreshTimer)
    currentJobAutoRefreshTimer = null
  }
}

function startCurrentJobAutoRefresh() {
  if (currentJobAutoRefreshTimer) return
  currentJobAutoRefreshTimer = window.setInterval(() => {
    void refreshCurrentJobStatus(true)
  }, CURRENT_JOB_AUTO_REFRESH_INTERVAL)
}

async function loadMetaList(page = metaPaginationState.current, silent = false) {
  const novelCode = queryNovelCode.value || currentJob.value?.novelCode
  if (!novelCode) {
    metaList.value = []
    metaPaginationState.total = 0
    return
  }

  metaLoading.value = true
  try {
    const res = await listNovelMetas({
      novelCode,
      current: page,
      pageSize: metaPaginationState.pageSize,
      keyword: metaKeyword.value.trim() || undefined
    })
    metaList.value = res.data?.list || []
    metaPaginationState.current = res.data?.current || page
    metaPaginationState.pageSize = res.data?.pageSize || metaPaginationState.pageSize
    metaPaginationState.total = res.data?.total || 0
  } catch (e: any) {
    if (!silent) {
      antMessage.error(e?.response?.data?.msg || e?.message || '加载失败')
    }
  } finally {
    metaLoading.value = false
  }
}

async function handleMetaFilter() {
  if (isScoreSearchActive.value) {
    return
  }
  metaPaginationState.current = 1
  await loadMetaList(1)
}

async function handleMetaTableChange(pagination: TablePaginationConfig) {
  if (isScoreSearchActive.value) {
    return
  }
  const nextPage = pagination.current || 1
  const nextPageSize = pagination.pageSize || metaPaginationState.pageSize
  const pageSizeChanged = nextPageSize !== metaPaginationState.pageSize
  metaPaginationState.pageSize = nextPageSize
  metaPaginationState.current = pageSizeChanged ? 1 : nextPage
  await loadMetaList(metaPaginationState.current)
}

async function handleQueryMeta() {
  const novelCode = queryNovelCode.value || currentJob.value?.novelCode
  if (!novelCode) {
    antMessage.warning('请先输入 novelCode')
    return
  }
  queryNovelCode.value = novelCode
  metaPaginationState.current = 1
  searchResult.value = null
  scoreSearchEnabled.value = false
  await loadMetaList(1)
}

async function openMetaDetail(record: Record<string, any>) {
  const novelCode = record.novelCode || queryNovelCode.value || currentJob.value?.novelCode
  if (!novelCode) {
    antMessage.warning('请先输入 novelCode')
    return
  }

  detailVisible.value = true
  detailLoading.value = true
  detailRecord.value = {
    novelCode,
    chunkId: record.chunkId,
    summary: record.summary,
    keywords: record.keywords,
    characters: record.characters,
    locations: record.locations,
    organizations: record.organizations,
    concepts: record.concepts,
    events: record.events,
    createdAt: record.createdAt,
    chunkText: record.chunkText,
    score: record.score
  }

  try {
    const res = await getNovelMetaDetail({
      novelCode,
      chunkId: record.chunkId,
      includeChunk: searchForm.includeChunks
    })
    if (res.data) {
      detailRecord.value = {
        ...res.data,
        score: record.score
      }
    }
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '加载详情失败')
  } finally {
    detailLoading.value = false
  }
}

function formatTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

watch(
  () => uploadForm.novelCode,
  value => {
    const trimmedValue = value.trim()
    if (trimmedValue !== checkedNovelCode.value) {
      historyCheckStatus.value = 'idle'
      selectedRecoverJobId.value = ''
      recoverJobOptions.value = []
    }
    if (value && !queryNovelCode.value) {
      queryNovelCode.value = value
    }
  }
)

watch(queryNovelCode, (value, oldValue) => {
  if (value !== oldValue) {
    searchResult.value = null
    scoreSearchEnabled.value = false
  }
  if (!value) {
    metaList.value = []
    metaPaginationState.total = 0
    searchResult.value = null
  }
})

watch(showCurrentTaskTab, value => {
  if (!value && activeLeftTab.value === 'current') {
    activeLeftTab.value = 'entry'
  }
})

watch(currentJob, value => {
  if (value) {
    persistCurrentJob(value)
  } else {
    clearPersistedCurrentJob()
  }
})

watch(
  shouldAutoRefreshCurrentJob,
  value => {
    if (value) {
      startCurrentJobAutoRefresh()
      void refreshCurrentJobStatus(true)
      return
    }
    stopCurrentJobAutoRefresh()
  },
  { immediate: true }
)

onMounted(() => {
  void initializeCurrentJob()
})

onBeforeUnmount(() => {
  stopCurrentJobAutoRefresh()
})
</script>

<style lang="less" scoped>
.novel-meta-page {
  display: flex;
  gap: 16px;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
}

.left-panel {
  width: 360px;
  flex-shrink: 0;
  overflow-y: auto;
}

.left-panel-card {
  height: 100%;
}

.left-panel-tabs {
  height: auto;
}

.left-panel-tabs :deep(.ant-tabs-content-holder) {
  overflow-y: auto;
}

.right-panel {
  flex: 1;
  overflow-y: auto;
}

.section-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.toolbar-secondary {
  margin-bottom: 16px;
}

.toolbar-label {
  font-size: 13px;
  color: #666;
}

.search-result-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  color: #666;
  flex-wrap: wrap;
}

.job-option {
  line-height: 1.4;
  padding: 2px 0;
}

.job-option-title {
  font-size: 13px;
}

.job-option-desc {
  font-size: 12px;
  color: #999;
}

.tab-alert {
  margin-bottom: 12px;
}

.checking-state {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  margin-bottom: 12px;
}

.action-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.error-text {
  color: #ff4d4f;
}

.chunk-id {
  font-family: Monaco, Consolas, monospace;
  font-size: 12px;
}

.summary-cell {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.chunk-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 420px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.empty-chunk-text {
  color: #999;
}
</style>
