<template>
  <div class="novel-meta-page">
    <div class="left-panel">
      <a-card size="small" class="left-panel-card">
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
              <a-descriptions-item label="jobId">
                {{ currentJob.jobId }}
              </a-descriptions-item>
              <a-descriptions-item label="小说编码">
                {{ currentJob.novelCode }}
              </a-descriptions-item>
              <a-descriptions-item label="原文文件">
                {{ currentJob.sourceFileName }}
              </a-descriptions-item>
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
                <!-- <span class="fs-12">
                  {{ currentJob.metaGeneratedChunks }} /
                  {{ currentJob.totalChunks }}
                  块
                </span> -->
              </a-descriptions-item>
              <a-descriptions-item v-if="currentJob.lastError" label="错误信息">
                <span class="error-text">{{ currentJob.lastError }}</span>
              </a-descriptions-item>
            </a-descriptions>

            <div class="action-row">
              <a-button @click="handleRefresh">刷新</a-button>
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

        <a-tabs v-model:activeKey="activeRightTab">
          <a-tab-pane key="list" tab="Chunk Meta 列表">
            <div class="toolbar">
              <a-input-search
                v-model:value="metaKeyword"
                placeholder="按 chunkId / 摘要 / 实体关键词过滤"
                allow-clear
                style="max-width: 360px"
                enter-button="筛选"
                @search="handleMetaFilter"
              />
              <a-button :loading="metaLoading" @click="loadMetaList(1)"> 刷新列表 </a-button>
            </div>

            <a-empty
              v-if="!metaLoading && !metaList.length"
              :description="queryNovelCode ? '暂无 meta 数据' : '先输入或恢复一个 novelCode'"
            />

            <a-table
              v-else
              :columns="metaColumns"
              :data-source="metaList"
              :loading="metaLoading"
              :pagination="metaPagination"
              size="small"
              row-key="chunkId"
              bordered
              :scroll="{ x: 1500 }"
              @change="handleMetaTableChange"
            >
              <template #bodyCell="{ column, text, record }">
                <template v-if="column.dataIndex === 'chunkId'">
                  <span class="chunk-id">{{ text }}</span>
                </template>
                <template v-else-if="column.dataIndex === 'summary'">
                  <div class="summary-cell">{{ text || '-' }}</div>
                </template>
                <template v-else-if="column.dataIndex === 'createdAt'">
                  {{ formatTime(text) }}
                </template>
                <template v-else>
                  <a-space v-if="Array.isArray(text) && text.length" wrap>
                    <a-tag v-for="item in text" block :key="`${record.chunkId}-${column.dataIndex}-${item}`">
                      {{ item }}
                    </a-tag>
                  </a-space>
                  <span v-else>-</span>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="search" tab="Meta 检索">
            <a-form layout="vertical">
              <a-form-item label="检索问题 / 关键词">
                <a-input-search
                  v-model:value="searchForm.query"
                  placeholder="如 林雷第一次觉醒发生在哪里"
                  enter-button="检索"
                  :loading="searching"
                  @search="handleSearchMeta"
                />
              </a-form-item>
              <div class="search-settings">
                <a-form-item label="返回条数">
                  <a-input-number v-model:value="searchForm.topN" :min="1" :max="20" :step="1" style="width: 120px" />
                </a-form-item>
                <a-form-item label="附带原文片段">
                  <a-switch v-model:checked="searchForm.includeChunks" />
                </a-form-item>
              </div>
            </a-form>

            <a-empty
              v-if="!searching && !searchResult"
              :description="queryNovelCode ? '输入问题后开始检索' : '先输入或恢复一个 novelCode'"
            />

            <template v-else-if="searchResult">
              <div class="search-result-meta">
                <span>命中 {{ searchResult.total }} 条</span>
                <span v-if="searchResult.queryWords.length"> 分词：{{ searchResult.queryWords.join(' / ') }} </span>
              </div>

              <a-empty v-if="!searchResult.hits.length" description="没有匹配到相关 meta" />

              <a-collapse v-else accordion>
                <a-collapse-panel v-for="hit in searchResult.hits" :key="hit.id" :header="`${hit.id} · score ${hit.score}`">
                  <a-descriptions :column="1" size="small" bordered>
                    <a-descriptions-item label="摘要">
                      <div class="summary-cell">{{ hit.summary }}</div>
                    </a-descriptions-item>
                    <a-descriptions-item label="关键词">
                      <a-space v-if="hit.keywords.length" wrap>
                        <a-tag v-for="item in hit.keywords" :key="item">
                          {{ item }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </a-descriptions-item>
                    <a-descriptions-item label="人物">
                      <a-space v-if="hit.characters.length" wrap>
                        <a-tag v-for="item in hit.characters" :key="item">
                          {{ item }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </a-descriptions-item>
                    <a-descriptions-item label="地点">
                      <a-space v-if="hit.locations.length" wrap>
                        <a-tag v-for="item in hit.locations" :key="item">
                          {{ item }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </a-descriptions-item>
                    <a-descriptions-item label="组织">
                      <a-space v-if="hit.organizations.length" wrap>
                        <a-tag v-for="item in hit.organizations" :key="item">
                          {{ item }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </a-descriptions-item>
                    <a-descriptions-item label="概念">
                      <a-space v-if="hit.concepts.length" wrap>
                        <a-tag v-for="item in hit.concepts" :key="item">
                          {{ item }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </a-descriptions-item>
                    <a-descriptions-item label="事件">
                      <a-space v-if="hit.events.length" wrap>
                        <a-tag v-for="item in hit.events" :key="item">
                          {{ item }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </a-descriptions-item>
                    <a-descriptions-item v-if="hit.chunkText" label="原文片段">
                      <pre class="chunk-text">{{ hit.chunkText }}</pre>
                    </a-descriptions-item>
                  </a-descriptions>
                </a-collapse-panel>
              </a-collapse>
            </template>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import type { TablePaginationConfig, UploadFile } from 'ant-design-vue'
import {
  getOutlineJobStatus,
  listNovelMetas,
  listOutlineJobs,
  rebuildNovelMetaIndex,
  searchNovelMeta,
  startNovelMetaGenerate,
  uploadAndSplitNovel,
  type NovelChunkMeta,
  type NovelChunkMetaSearchResult,
  type NovelOutlineJob
} from '@/api/novel-outline'

type HistoryCheckStatus = 'idle' | 'checking' | 'has-history' | 'no-history'
const NOVEL_META_CURRENT_JOB_STORAGE_KEY = 'writer-assistant:novel-meta:current-job'

const activeLeftTab = ref('entry')
const activeRightTab = ref('list')

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
const metaLoading = ref(false)
const searching = ref(false)

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
  includeChunks: false
})
const searchResult = ref<NovelChunkMetaSearchResult | null>(null)

const metaColumns = [
  {
    title: 'Chunk',
    dataIndex: 'chunkId',
    key: 'chunkId',
    width: 100,
    fixed: 'left' as const
  },
  {
    title: '摘要',
    dataIndex: 'summary',
    key: 'summary',
    width: 360
  },
  {
    title: '关键词',
    dataIndex: 'keywords',
    key: 'keywords',
    width: 240
  },
  {
    title: '人物',
    dataIndex: 'characters',
    key: 'characters',
    width: 200
  },
  {
    title: '地点',
    dataIndex: 'locations',
    key: 'locations',
    width: 200
  },
  {
    title: '组织',
    dataIndex: 'organizations',
    key: 'organizations',
    width: 200
  },
  {
    title: '概念',
    dataIndex: 'concepts',
    key: 'concepts',
    width: 200
  },
  {
    title: '事件',
    dataIndex: 'events',
    key: 'events',
    width: 240
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 170
  }
]

const canUpload = computed(
  () => historyCheckStatus.value === 'no-history' && !!uploadForm.novelCode.trim() && !!pickedFile.value && !uploading.value
)
const showCurrentTaskTab = computed(() => !!currentJob.value)

const canRebuildIndex = computed(
  () =>
    !!currentJob.value &&
    currentJob.value.status !== 'splitting' &&
    currentJob.value.status !== 'meta_generating' &&
    currentJob.value.status !== 'generating'
)

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

async function handleRefresh() {
  if (!currentJob.value) return
  const res = await getOutlineJobStatus(currentJob.value.jobId)
  if (res.data) {
    applyCurrentJob(res.data)
  } else {
    currentJob.value = null
    clearPersistedCurrentJob()
  }
  await loadMetaList(metaPaginationState.current, true)
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
  metaPaginationState.current = 1
  await loadMetaList(1)
}

async function handleMetaTableChange(pagination: TablePaginationConfig) {
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
  await loadMetaList(1)
}

async function handleSearchMeta() {
  const novelCode = queryNovelCode.value || currentJob.value?.novelCode
  if (!novelCode) {
    antMessage.warning('请先输入 novelCode')
    return
  }
  if (!searchForm.query.trim()) {
    antMessage.warning('请输入检索内容')
    return
  }

  searching.value = true
  try {
    const res = await searchNovelMeta({
      novelCode,
      query: searchForm.query.trim(),
      topN: searchForm.topN,
      includeChunks: searchForm.includeChunks
    })
    searchResult.value = res.data ?? null
    activeRightTab.value = 'search'
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '检索失败')
  } finally {
    searching.value = false
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

watch(queryNovelCode, value => {
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

onMounted(() => {
  void initializeCurrentJob()
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

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.search-settings {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
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

.fs-12 {
  font-size: 12px;
  color: #999;
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
  font-size: 12px;
  line-height: 1.6;
}
</style>
