<template>
  <div class="novel-outline-page">
    <div class="left-panel">
      <a-card title="0. 恢复任务" size="small" class="mb-12">
        <a-form layout="vertical">
          <a-form-item label="小说编码 novelCode">
            <a-input-search
              v-model:value="recoverForm.novelCode"
              placeholder="输入 novelCode 查询历史任务"
              enter-button="列出任务"
              :loading="listingJobs"
              @search="handleListJobs"
            />
          </a-form-item>
          <a-form-item label="选择历史任务">
            <a-select
              v-model:value="recoverForm.jobId"
              placeholder="先点上方“列出任务”"
              :options="jobOptions"
              :disabled="!jobOptions.length"
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
          <a-button
            type="primary"
            block
            :disabled="!recoverForm.jobId"
            :loading="recovering"
            @click="handleRecover"
          >
            恢复此任务
          </a-button>
        </a-form>
      </a-card>

      <a-card title="1. 上传 TXT 并拆分" size="small" class="mb-12">
        <a-form layout="vertical">
          <a-form-item label="小说编码 novelCode" required>
            <a-input
              v-model:value="form.novelCode"
              placeholder="如 yi_quan_po_tian"
            />
          </a-form-item>
          <a-form-item label="每块原文总字数（chunkSize）">
            <a-input-number
              v-model:value="form.chunkSize"
              :min="500"
              :max="20000"
              :step="500"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="前后上下文字数（overlap）">
            <a-input-number
              v-model:value="form.overlap"
              :min="0"
              :max="2000"
              :step="50"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="TXT 文件" required>
            <a-upload
              :file-list="fileList"
              :before-upload="onBeforeUpload"
              :max-count="1"
              accept=".txt"
              @remove="onRemoveFile"
            >
              <a-button><UploadOutlined />选择 txt 文件</a-button>
            </a-upload>
          </a-form-item>
          <a-button
            type="primary"
            block
            :loading="uploading"
            :disabled="!canUpload"
            @click="handleUpload"
          >
            上传并拆分
          </a-button>
        </a-form>
      </a-card>

      <a-card title="2. 提取与压缩" size="small" class="mb-12">
        <a-space direction="vertical" style="width: 100%">
          <a-input-search
            v-model:value="operationForm.novelCode"
            placeholder="输入 novelCode 后可直接提取或压缩"
            enter-button="加载任务与数据"
            :loading="loadingKnowledge"
            @search="handleLoadOperationNovelCode"
          />
          <a-alert
            type="info"
            show-icon
            message="已有 novel_outlines 数据时，也可以直接输入 novelCode 继续提取或生成 compressed，不必先恢复任务。"
          />
          <a-button
            type="primary"
            block
            :loading="extracting"
            :disabled="!canStartExtract"
            @click="handleStartExtract"
          >
            {{ extractButtonText }}
          </a-button>
          <a-button
            block
            :loading="compressing"
            :disabled="!activeNovelCode"
            @click="handleBuildCompressed"
          >
            生成 compressed 层
          </a-button>
          <a-button block :disabled="!activeNovelCode" @click="handleLoadKnowledge">
            刷新原始层与压缩层
          </a-button>
        </a-space>
      </a-card>

      <a-card v-if="currentJob" title="3. 当前任务" size="small">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="jobId">
            <span class="mono">{{ currentJob.jobId }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="小说编码">
            <span class="mono">{{ currentJob.novelCode }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="原文文件">
            {{ currentJob.sourceFileName }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(currentJob.status)">
              {{ statusText(currentJob.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="拆分参数">
            {{ currentJob.chunkSize }} / overlap {{ currentJob.overlap }}
          </a-descriptions-item>
          <a-descriptions-item label="总字数">
            {{ currentJob.totalChars }}
          </a-descriptions-item>
          <a-descriptions-item label="chunk 进度">
            <div class="progress-meta">
              <a-progress
                :percent="genPercent"
                :status="currentJob.status === 'failed' ? 'exception' : undefined"
                size="small"
              />
              <span class="fs-12">
                {{ processedChunks(currentJob) }} / {{ currentJob.totalChunks }}
              </span>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="处理中 chunk">
            {{ currentJob.processingChunkIndex || '-' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="currentJob.lastError" label="错误信息">
            <span class="error-text">{{ currentJob.lastError }}</span>
          </a-descriptions-item>
        </a-descriptions>

        <div class="action-row">
          <a-button @click="handleRefreshJob">刷新任务</a-button>
          <a-button :disabled="!activeNovelCode" @click="handleLoadKnowledge">
            刷新数据
          </a-button>
        </div>
      </a-card>
    </div>

    <div class="right-panel">
      <a-card size="small" class="result-card">
        <template #title>
          <div class="title-row">
            <span>小说知识库总览</span>
            <a-tag color="blue">raw + compressed</a-tag>
          </div>
        </template>

        <template #extra>
          <a-space wrap>
            <a-input-search
              v-model:value="queryNovelCode"
              placeholder="输入 novelCode 查询"
              enter-button="查询"
              style="width: 260px"
              :loading="loadingKnowledge"
              @search="handleLoadKnowledge"
            />
            <a-button :disabled="!activeNovelCode" @click="handleBuildCompressed">
              更新 compressed
            </a-button>
          </a-space>
        </template>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">原始人物</div>
            <div class="metric-value">{{ outline?.characters?.length || 0 }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">原始事件</div>
            <div class="metric-value">{{ outline?.events?.length || 0 }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">压缩人物</div>
            <div class="metric-value">
              {{ compressedOutline?.characters?.length || 0 }}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-label">压缩事件</div>
            <div class="metric-value">
              {{ compressedOutline?.events?.length || 0 }}
            </div>
          </div>
        </div>

        <a-empty
          v-if="!outline && !compressedOutline"
          description="暂无数据，请先上传/提取，或输入 novelCode 查询"
        />

        <a-tabs v-else>
          <a-tab-pane key="outline" tab="原始层 novel_outlines">
            <a-tabs>
              <a-tab-pane key="raw-world" tab="世界观">
                <a-empty
                  v-if="!outline?.worldView || !hasWorldView(outline.worldView)"
                  description="暂无世界观数据"
                />
                <a-descriptions v-else :column="1" bordered size="small">
                  <a-descriptions-item label="世界类型">
                    {{ joinList(outline.worldView.worldType) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="设定摘要">
                    <div class="multiline">
                      {{ formatMultiPoint(joinList(outline.worldView.summary)) }}
                    </div>
                  </a-descriptions-item>
                  <a-descriptions-item label="社会结构">
                    <div class="multiline">
                      {{
                        formatMultiPoint(joinList(outline.worldView.socialStructure))
                      }}
                    </div>
                  </a-descriptions-item>
                  <a-descriptions-item label="核心规则">
                    <div class="multiline">
                      {{ formatMultiPoint(joinList(outline.worldView.coreRules)) }}
                    </div>
                  </a-descriptions-item>
                </a-descriptions>
              </a-tab-pane>

              <a-tab-pane
                key="raw-characters"
                :tab="`人物 (${outline?.characters?.length || 0})`"
              >
                <a-empty v-if="!outline?.characters?.length" />
                <a-table
                  v-else
                  :columns="rawCharacterColumns"
                  :data-source="outline.characters"
                  :pagination="{ pageSize: 8, hideOnSinglePage: true }"
                  size="small"
                  row-key="name"
                  bordered
                  :scroll="{ x: 1180 }"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.dataIndex === 'aliases'">
                      <a-space wrap v-if="record.aliases?.length">
                        <a-tag v-for="alias in record.aliases" :key="alias" color="blue">
                          {{ alias }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </template>
                    <template v-else-if="column.dataIndex === 'aliasCandidates'">
                      <a-space wrap v-if="record.aliasCandidates?.length">
                        <a-tag
                          v-for="alias in record.aliasCandidates"
                          :key="alias"
                          color="orange"
                        >
                          {{ alias }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </template>
                    <template v-else-if="column.dataIndex === 'name'">
                      <span class="strong-text">{{ record.name }}</span>
                    </template>
                    <template v-else>
                      <div class="cell-multiline">
                        {{ formatMultiPoint(joinList(record[column.dataIndex as keyof typeof record] as string[])) || '-' }}
                      </div>
                    </template>
                  </template>
                </a-table>
              </a-tab-pane>

              <a-tab-pane key="raw-events" :tab="`事件 (${outline?.events?.length || 0})`">
                <a-empty v-if="!outline?.events?.length" />
                <a-table
                  v-else
                  :columns="rawEventColumns"
                  :data-source="outline.events"
                  :pagination="{ pageSize: 8, hideOnSinglePage: true }"
                  size="small"
                  row-key="title"
                  bordered
                  :scroll="{ x: 1100 }"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.dataIndex === 'characters'">
                      <a-space wrap v-if="record.characters?.length">
                        <a-tag v-for="name in record.characters" :key="name">{{ name }}</a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </template>
                    <template v-else-if="column.dataIndex === 'summary'">
                      <div class="cell-multiline">
                        {{ formatMultiPoint(joinList(record.summary)) || '-' }}
                      </div>
                    </template>
                    <template v-else>
                      {{ record[column.dataIndex as keyof typeof record] || '-' }}
                    </template>
                  </template>
                </a-table>
              </a-tab-pane>
            </a-tabs>
          </a-tab-pane>

          <a-tab-pane key="compressed" tab="压缩层 novel_outline_compressed">
            <a-empty
              v-if="!compressedOutline"
              description="compressed 层尚未生成"
            >
              <a-button type="primary" :disabled="!activeNovelCode" @click="handleBuildCompressed">
                立即生成 compressed
              </a-button>
            </a-empty>

            <a-tabs v-else>
              <a-tab-pane key="compressed-world" tab="世界观">
                <a-empty
                  v-if="
                    !compressedOutline.worldView ||
                    !hasWorldView(compressedOutline.worldView)
                  "
                  description="暂无压缩世界观"
                />
                <a-descriptions v-else :column="1" bordered size="small">
                  <a-descriptions-item label="世界类型">
                    {{ joinList(compressedOutline.worldView.worldType) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="设定摘要">
                    <div class="multiline">
                      {{ formatMultiPoint(joinList(compressedOutline.worldView.summary)) }}
                    </div>
                  </a-descriptions-item>
                  <a-descriptions-item label="社会结构">
                    <div class="multiline">
                      {{
                        formatMultiPoint(
                          joinList(compressedOutline.worldView.socialStructure),
                        )
                      }}
                    </div>
                  </a-descriptions-item>
                  <a-descriptions-item label="核心规则">
                    <div class="multiline">
                      {{ formatMultiPoint(joinList(compressedOutline.worldView.coreRules)) }}
                    </div>
                  </a-descriptions-item>
                </a-descriptions>
              </a-tab-pane>

              <a-tab-pane
                key="compressed-characters"
                :tab="`人物 (${compressedOutline.characters?.length || 0})`"
              >
                <a-empty v-if="!compressedOutline.characters?.length" />
                <a-table
                  v-else
                  :columns="rawCharacterColumns"
                  :data-source="compressedOutline.characters"
                  :pagination="{ pageSize: 8, hideOnSinglePage: true }"
                  size="small"
                  row-key="name"
                  bordered
                  :scroll="{ x: 1180 }"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.dataIndex === 'aliases'">
                      <a-space wrap v-if="record.aliases?.length">
                        <a-tag v-for="alias in record.aliases" :key="alias" color="blue">
                          {{ alias }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </template>
                    <template v-else-if="column.dataIndex === 'aliasCandidates'">
                      <a-space wrap v-if="record.aliasCandidates?.length">
                        <a-tag
                          v-for="alias in record.aliasCandidates"
                          :key="alias"
                          color="orange"
                        >
                          {{ alias }}
                        </a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </template>
                    <template v-else-if="column.dataIndex === 'name'">
                      <span class="strong-text">{{ record.name }}</span>
                    </template>
                    <template v-else>
                      <div class="cell-multiline">
                        {{ formatMultiPoint(joinList(record[column.dataIndex as keyof typeof record] as string[])) || '-' }}
                      </div>
                    </template>
                  </template>
                </a-table>
              </a-tab-pane>

              <a-tab-pane
                key="compressed-events"
                :tab="`事件 (${compressedOutline.events?.length || 0})`"
              >
                <a-empty v-if="!compressedOutline.events?.length" />
                <a-table
                  v-else
                  :columns="rawEventColumns"
                  :data-source="compressedOutline.events"
                  :pagination="{ pageSize: 8, hideOnSinglePage: true }"
                  size="small"
                  row-key="title"
                  bordered
                  :scroll="{ x: 1100 }"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.dataIndex === 'characters'">
                      <a-space wrap v-if="record.characters?.length">
                        <a-tag v-for="name in record.characters" :key="name">{{ name }}</a-tag>
                      </a-space>
                      <span v-else>-</span>
                    </template>
                    <template v-else-if="column.dataIndex === 'summary'">
                      <div class="cell-multiline">
                        {{ formatMultiPoint(joinList(record.summary)) || '-' }}
                      </div>
                    </template>
                    <template v-else>
                      {{ record[column.dataIndex as keyof typeof record] || '-' }}
                    </template>
                  </template>
                </a-table>
              </a-tab-pane>
            </a-tabs>
          </a-tab-pane>

          <a-tab-pane key="raw-json" tab="原始层 JSON">
            <pre class="json-block">{{ formatJson(outline) }}</pre>
          </a-tab-pane>

          <a-tab-pane key="compressed-json" tab="压缩层 JSON">
            <pre class="json-block">{{ formatJson(compressedOutline) }}</pre>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import type { UploadFile } from 'ant-design-vue'
import {
  buildCompressedNovelOutline,
  findCompressedNovelOutline,
  findNovelOutline,
  getOutlineJob,
  getOutlineJobs,
  startExtractNovelOutline,
  uploadAndSplitNovel,
  type NovelOutlineCompressedResult,
  type NovelOutlineJob,
  type NovelOutlineResult,
  type OutlineWorldView,
} from '@/api/novel-outline'

const form = reactive({
  novelCode: '',
  chunkSize: 15000,
  overlap: 300,
})

const recoverForm = reactive({
  novelCode: '',
  jobId: '',
})

const operationForm = reactive({
  novelCode: '',
})

const fileList = ref<UploadFile[]>([])
const pickedFile = ref<File | null>(null)

const currentJob = ref<NovelOutlineJob | null>(null)
const outline = ref<NovelOutlineResult | null>(null)
const compressedOutline = ref<NovelOutlineCompressedResult | null>(null)
const queryNovelCode = ref('')

const uploading = ref(false)
const extracting = ref(false)
const compressing = ref(false)
const loadingKnowledge = ref(false)
const listingJobs = ref(false)
const recovering = ref(false)
const jobOptions = ref<Array<{ value: string; label: string; desc: string }>>([])

let pollTimer: ReturnType<typeof setInterval> | null = null
let pollBusy = false

const rawCharacterColumns = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: 120, fixed: 'left' as const },
  { title: '别名', dataIndex: 'aliases', key: 'aliases', width: 180 },
  {
    title: '待确认别名',
    dataIndex: 'aliasCandidates',
    key: 'aliasCandidates',
    width: 190,
  },
  { title: '身份', dataIndex: 'identity', key: 'identity', width: 180 },
  { title: '性格', dataIndex: 'personality', key: 'personality', width: 220 },
  { title: '目标', dataIndex: 'goals', key: 'goals', width: 220 },
  { title: '特征', dataIndex: 'traits', key: 'traits', width: 220 },
  { title: '关系', dataIndex: 'relations', key: 'relations', width: 260 },
]

const rawEventColumns = [
  { title: '标题', dataIndex: 'title', key: 'title', width: 180, fixed: 'left' as const },
  { title: '描述', dataIndex: 'summary', key: 'summary', width: 520 },
  { title: '涉及人物', dataIndex: 'characters', key: 'characters', width: 220 },
  { title: 'chunk', dataIndex: 'chunkIndex', key: 'chunkIndex', width: 90 },
]

const activeNovelCode = computed(() =>
  operationForm.novelCode.trim() ||
  queryNovelCode.value.trim() ||
  currentJob.value?.novelCode ||
  form.novelCode.trim(),
)

const canUpload = computed(
  () => !!form.novelCode.trim() && !!pickedFile.value && !uploading.value,
)

const canStartExtract = computed(() => {
  return !!activeNovelCode.value && !extracting.value
})

const extractButtonText = computed(() => {
  if (!currentJob.value || currentJob.value.novelCode !== activeNovelCode.value) {
    return '按 novelCode 开始提取'
  }
  return processedChunks(currentJob.value) > 0 ? '继续提取大纲' : '开始提取大纲'
})

const genPercent = computed(() => {
  if (!currentJob.value?.totalChunks) return 0
  return Math.floor(
    (processedChunks(currentJob.value) / currentJob.value.totalChunks) * 100,
  )
})

function processedChunks(job: NovelOutlineJob) {
  return Math.max(
    0,
    Math.min(job.lastCompletedChunkIndex || 0, job.totalChunks || 0),
  )
}

function statusColor(status: NovelOutlineJob['status']) {
  return (
    {
      splitting: 'processing',
      split_done: 'blue',
      generating: 'processing',
      done: 'success',
      failed: 'error',
      aborted: 'default',
    }[status] || 'default'
  )
}

function statusText(status: NovelOutlineJob['status']) {
  return (
    {
      splitting: '拆分中',
      split_done: '拆分完成',
      generating: '提取中',
      done: '已完成',
      failed: '失败',
      aborted: '已中止',
    }[status] || status
  )
}

function joinList(value?: string[] | null) {
  if (!value?.length) return '-'
  return value.filter(Boolean).join('；')
}

function formatMultiPoint(text?: string | null) {
  if (!text) return ''
  let out = text
  out = out.replace(/([^\n])\s+(\d{1,2}[.、:：)])\s*/g, '$1\n$2 ')
  out = out.replace(/([^\n])\s+([([（【]\s*\d{1,2}\s*[)\]）】])\s*/g, '$1\n$2 ')
  out = out.replace(/([^\n])\s*([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*/g, '$1\n$2 ')
  out = out.replace(/([^\n])\s+([-•*])\s+/g, '$1\n$2 ')
  return out
}

function hasWorldView(worldView?: OutlineWorldView | null) {
  if (!worldView) return false
  return Boolean(
    worldView.worldType?.length ||
      worldView.summary?.length ||
      worldView.socialStructure?.length ||
      worldView.coreRules?.length,
  )
}

function formatJson(data: unknown) {
  return data ? JSON.stringify(data, null, 2) : '（空）'
}

function onBeforeUpload(file: File) {
  if (!file.name.toLowerCase().endsWith('.txt')) {
    antMessage.error('仅支持 .txt 文件')
    return false as never
  }

  pickedFile.value = file
  fileList.value = [
    {
      uid: String(file.lastModified),
      name: file.name,
      status: 'done',
    } as UploadFile,
  ]
  return false as never
}

function onRemoveFile() {
  pickedFile.value = null
  fileList.value = []
  return true
}

async function handleUpload() {
  if (!pickedFile.value) return
  uploading.value = true
  try {
    const res = await uploadAndSplitNovel({
      novelCode: form.novelCode.trim(),
      chunkSize: form.chunkSize,
      overlap: form.overlap,
      file: pickedFile.value,
    })
    if (res.data) {
      currentJob.value = res.data
      queryNovelCode.value = res.data.novelCode
      antMessage.success(`拆分完成，共 ${res.data.totalChunks} 块`)
      await loadKnowledge(res.data.novelCode, { syncJob: true })
    }
  } catch (error: any) {
    antMessage.error(error?.response?.data?.msg || error?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function handleStartExtract() {
  const code = activeNovelCode.value
  if (!code) {
    antMessage.warning('请先输入或选择 novelCode')
    return
  }

  extracting.value = true
  startPolling(code)

  try {
    const res = await startExtractNovelOutline(code)
    if (res.data) {
      currentJob.value = res.data
    }
    antMessage.success('大纲提取完成')
  } catch (error: any) {
    antMessage.error(error?.response?.data?.msg || error?.message || '提取失败')
  } finally {
    extracting.value = false
    stopPolling()
    await loadKnowledge(code, { syncJob: true, silent: true })
  }
}

async function handleBuildCompressed() {
  const code = activeNovelCode.value
  if (!code) {
    antMessage.warning('请先输入或选择 novelCode')
    return
  }

  compressing.value = true
  try {
    const res = await buildCompressedNovelOutline(code)
    compressedOutline.value = res.data ?? null
    antMessage.success('compressed 层生成完成')
    await loadKnowledge(code, { syncJob: true, silent: true })
  } catch (error: any) {
    antMessage.error(
      error?.response?.data?.msg || error?.message || 'compressed 生成失败',
    )
  } finally {
    compressing.value = false
  }
}

async function handleRefreshJob() {
  if (!currentJob.value) return
  try {
    const res = await getOutlineJob({ jobId: currentJob.value.jobId })
    if (res.data) {
      currentJob.value = res.data
    }
  } catch (error: any) {
    antMessage.error(
      error?.response?.data?.msg || error?.message || '刷新任务失败',
    )
  }
}

async function handleLoadKnowledge() {
  const code = activeNovelCode.value
  if (!code) {
    antMessage.warning('请输入 novelCode')
    return
  }

  await loadKnowledge(code, { syncJob: true })
}

async function handleLoadOperationNovelCode() {
  const code = operationForm.novelCode.trim()
  if (!code) {
    antMessage.warning('请输入 novelCode')
    return
  }

  await loadKnowledge(code, { syncJob: true })
}

async function loadKnowledge(
  novelCode: string,
  options: { syncJob?: boolean; silent?: boolean } = {},
) {
  loadingKnowledge.value = true
  try {
    const tasks: Promise<unknown>[] = [
      findNovelOutline(novelCode),
      findCompressedNovelOutline(novelCode),
    ]

    if (options.syncJob) {
      tasks.push(getOutlineJob({ novelCode }))
    }

    const [outlineRes, compressedRes, jobRes] = await Promise.all(tasks)
    outline.value = (outlineRes as Awaited<ReturnType<typeof findNovelOutline>>)
      .data ?? null
    compressedOutline.value = (
      compressedRes as Awaited<ReturnType<typeof findCompressedNovelOutline>>
    ).data ?? null

    if (options.syncJob) {
      currentJob.value =
        (jobRes as Awaited<ReturnType<typeof getOutlineJob>>)?.data ?? null
    }

    queryNovelCode.value = novelCode
    operationForm.novelCode = novelCode
    if (outline.value?.novelCode) {
      form.novelCode = outline.value.novelCode
    }
    if (!options.silent) {
      antMessage.success('数据已刷新')
    }
  } catch (error: any) {
    if (!options.silent) {
      antMessage.error(
        error?.response?.data?.msg || error?.message || '查询失败',
      )
    }
  } finally {
    loadingKnowledge.value = false
  }
}

async function handleListJobs() {
  const code = recoverForm.novelCode.trim()
  if (!code) {
    antMessage.warning('请先输入 novelCode')
    return
  }

  listingJobs.value = true
  try {
    const res = await getOutlineJobs({
      novelCode: code,
      current: 1,
      pageSize: 100,
    })
    const jobs = res.data?.list || []
    jobOptions.value = jobs.map((job) => ({
      value: job.jobId,
      label: `${job.jobId} [${statusText(job.status)}] ${processedChunks(job)}/${job.totalChunks}`,
      desc: `原文：${job.sourceFileName} · 创建：${formatTime(job.createdAt)}`,
    }))
    recoverForm.jobId = ''
    if (!jobs.length) {
      antMessage.info('该 novelCode 没有历史任务')
    } else {
      antMessage.success(`共 ${jobs.length} 条历史任务`)
    }
  } catch (error: any) {
    antMessage.error(error?.response?.data?.msg || error?.message || '查询失败')
  } finally {
    listingJobs.value = false
  }
}

async function handleRecover() {
  if (!recoverForm.jobId) return
  recovering.value = true
  try {
    const res = await getOutlineJob({ jobId: recoverForm.jobId })
    if (!res.data) {
      antMessage.error('未查到该任务')
      return
    }

    currentJob.value = res.data
    queryNovelCode.value = res.data.novelCode
    operationForm.novelCode = res.data.novelCode
    form.novelCode = res.data.novelCode
    await loadKnowledge(res.data.novelCode, { syncJob: false, silent: true })
    antMessage.success('任务已恢复')
  } catch (error: any) {
    antMessage.error(error?.response?.data?.msg || error?.message || '恢复失败')
  } finally {
    recovering.value = false
  }
}

function startPolling(novelCode: string) {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (pollBusy) return
    pollBusy = true
    try {
      await loadKnowledge(novelCode, { syncJob: true, silent: true })
      const status = currentJob.value?.status
      if (status && ['done', 'failed', 'aborted'].includes(status)) {
        stopPolling()
      }
    } catch {
      // ignore
    } finally {
      pollBusy = false
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
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
  () => form.novelCode,
  (value) => {
    if (value && !queryNovelCode.value) {
      queryNovelCode.value = value
    }
    if (value && !operationForm.novelCode) {
      operationForm.novelCode = value
    }
  },
)

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style lang="less" scoped>
.novel-outline-page {
  display: grid;
  grid-template-columns: 400px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  min-height: 100%;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(247, 201, 72, 0.12), transparent 28%),
    linear-gradient(180deg, #fffdf8 0%, #f7f8fc 100%);
}

.left-panel,
.right-panel {
  min-width: 0;
}

.left-panel {
  display: flex;
  flex-direction: column;
}

.result-card {
  min-height: calc(100vh - 120px);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fff7e8 0%, #fff 100%);
  border: 1px solid #f3dfb7;
}

.metric-label {
  font-size: 12px;
  color: #8c6d1f;
}

.metric-value {
  margin-top: 8px;
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
  color: #3d2b00;
}

.job-option {
  line-height: 1.45;
  padding: 2px 0;
}

.job-option-title {
  font-size: 13px;
}

.job-option-desc {
  font-size: 12px;
  color: #999;
}

.mb-12 {
  margin-bottom: 12px;
}

.action-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.progress-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fs-12 {
  font-size: 12px;
  color: #8c8c8c;
}

.error-text {
  color: #ff4d4f;
}

.mono {
  font-family:
    'SFMono-Regular',
    'Roboto Mono',
    Consolas,
    monospace;
}

.strong-text {
  font-weight: 600;
  color: #2f2a1f;
}

.multiline,
.cell-multiline,
.json-block {
  white-space: pre-wrap;
  word-break: break-word;
}

.cell-multiline {
  line-height: 1.65;
}

.json-block {
  margin: 0;
  padding: 16px;
  border-radius: 12px;
  background: #1f2430;
  color: #e6edf3;
  max-height: 680px;
  overflow: auto;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .novel-outline-page {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
