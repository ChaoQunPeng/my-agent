<template>
  <div class="novel-outline-page">
    <!-- 左侧：上传 + 任务控制 -->
    <div class="left-panel">
      <!-- 恢复任务：在后端重启 / 页面刷新后，通过 jobId 重新挂上某个历史任务 -->
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
          <a-form-item label="选择历史任务 jobId">
            <a-select
              v-model:value="recoverForm.jobId"
              placeholder="先点上方'列出任务'"
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

      <a-card title="1. 上传 TXT 并拆分" size="small">
        <a-form layout="vertical" :model="form">
          <a-form-item label="小说编码 novelCode" required>
            <a-input v-model:value="form.novelCode" placeholder="如 yi_quan_po_tian" />
          </a-form-item>
          <a-form-item label="每块字数（chunkSize）">
            <a-input-number v-model:value="form.chunkSize" :min="500" :max="20000" :step="500" style="width: 100%" />
          </a-form-item>
          <a-form-item label="重叠字数（overlap）">
            <a-input-number v-model:value="form.overlap" :min="0" :max="2000" :step="50" style="width: 100%" />
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
          <a-button type="primary" block :loading="uploading" :disabled="!canUpload" @click="handleUpload">
            上传并拆分
          </a-button>
        </a-form>
      </a-card>

      <a-card v-if="currentJob" title="2. 任务进度" size="small" class="mt-12">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="jobId">{{ currentJob.jobId }}</a-descriptions-item>
          <a-descriptions-item label="原文文件">{{ currentJob.sourceFileName }}</a-descriptions-item>
          <a-descriptions-item label="原文字数">{{ currentJob.totalChars }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(currentJob.status)">{{ statusText(currentJob.status) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="拆分进度">
            {{ currentJob.splittedChunks }} / {{ currentJob.totalChunks }}
          </a-descriptions-item>
          <a-descriptions-item label="生成进度">
            <a-progress
              :percent="genPercent"
              :status="currentJob.status === 'failed' ? 'exception' : undefined"
              size="small"
            />
            <span class="fs-12">{{ currentJob.processedChunks }} / {{ currentJob.totalChunks }} 块</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="currentJob.lastError" label="错误信息">
            <span style="color: #ff4d4f">{{ currentJob.lastError }}</span>
          </a-descriptions-item>
        </a-descriptions>

        <div class="action-row">
          <a-button
            type="primary"
            :loading="generating"
            :disabled="!canGenerate"
            @click="handleGenerate"
          >
            {{ currentJob.processedChunks > 0 ? '继续生成大纲' : '开始生成大纲' }}
          </a-button>
          <a-button danger :disabled="!canAbort" @click="handleAbort">中止并清理</a-button>
          <a-button @click="handleRefresh">刷新</a-button>
        </div>
      </a-card>
    </div>

    <!-- 右侧：大纲结果 -->
    <div class="right-panel">
      <a-card title="3. 大纲结果" size="small">
        <template #extra>
          <a-space>
            <a-input v-model:value="queryNovelCode" placeholder="输入 novelCode" style="width: 200px" />
            <a-button size="small" @click="loadOutline">查询</a-button>
          </a-space>
        </template>

        <a-empty v-if="!outline" description="暂无大纲，请先上传并生成" />

        <template v-else>
          <a-tabs>
            <a-tab-pane key="synopsis" tab="故事简介">
              <pre class="outline-text">{{ outline.synopsis || '（空）' }}</pre>
            </a-tab-pane>
            <a-tab-pane key="world" tab="世界观">
              <pre class="outline-text">{{ outline.worldSetting || '（空）' }}</pre>
            </a-tab-pane>
            <a-tab-pane key="mainline" tab="主线">
              <pre class="outline-text">{{ outline.plotMainline || '（空）' }}</pre>
            </a-tab-pane>
            <a-tab-pane key="outline" tab="剧情大纲">
              <pre class="outline-text">{{ outline.plotOutline || '（空）' }}</pre>
            </a-tab-pane>
            <a-tab-pane :key="`chars`" :tab="`人物 (${outline.characters.length})`">
              <a-empty v-if="!outline.characters.length" />
              <a-list v-else :data-source="outline.characters" size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta :title="item.name" :description="item.identity || ''" />
                    <div class="char-detail">
                      <div v-if="item.personality"><b>性格：</b>{{ item.personality }}</div>
                      <div v-if="item.goals"><b>目标：</b>{{ item.goals }}</div>
                      <div v-if="item.traits"><b>特征：</b>{{ item.traits }}</div>
                      <div v-if="item.relations"><b>关系：</b>{{ item.relations }}</div>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </a-tab-pane>
          </a-tabs>
        </template>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount, watch } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import type { UploadFile } from 'ant-design-vue'
import {
  uploadAndSplitNovel,
  startGenerateOutline,
  getOutlineJobStatus,
  abortOutlineJob,
  getNovelOutline,
  listOutlineJobs,
  type NovelOutlineJob,
  type NovelOutlineResult
} from '@/api/novel-outline'

// 表单数据：novelCode + 拆分参数
const form = reactive({
  novelCode: '',
  chunkSize: 5000,
  overlap: 300
})

// Upload 组件文件列表
const fileList = ref<UploadFile[]>([])
// 真实的 File 对象（antd upload 用 fileList 不能直接拿到原生 File）
const pickedFile = ref<File | null>(null)

// 当前任务 & 大纲
const currentJob = ref<NovelOutlineJob | null>(null)
const outline = ref<NovelOutlineResult | null>(null)
// 右侧查询用 novelCode（和上传 form 的 novelCode 可以不同）
const queryNovelCode = ref('')

const uploading = ref(false)
const generating = ref(false)

// 恢复任务相关状态：用户输入 novelCode，查询历史 job 列表，选中后恢复为 currentJob
const recoverForm = reactive({
  novelCode: '',
  jobId: ''
})
const listingJobs = ref(false)
const recovering = ref(false)
// 下拉可选项（来自 listOutlineJobs 的返回）
const jobOptions = ref<Array<{ value: string; label: string; desc: string }>>([])

// 轮询定时器
let pollTimer: ReturnType<typeof setInterval> | null = null

const canUpload = computed(() => !!form.novelCode && !!pickedFile.value && !uploading.value)
// 允许续跑的状态：
// - split_done / failed / aborted：常规可续跑
// - generating：后端重启后残留的"假在跑"任务，允许强制再次拉起（后端有二次校验）
const canGenerate = computed(
  () =>
    !!currentJob.value &&
    (currentJob.value.status === 'split_done' ||
      currentJob.value.status === 'failed' ||
      currentJob.value.status === 'aborted' ||
      currentJob.value.status === 'generating') &&
    currentJob.value.processedChunks < currentJob.value.totalChunks
)
const canAbort = computed(
  () =>
    !!currentJob.value &&
    (currentJob.value.status === 'splitting' || currentJob.value.status === 'generating')
)

const genPercent = computed(() => {
  if (!currentJob.value || !currentJob.value.totalChunks) return 0
  return Math.floor((currentJob.value.processedChunks / currentJob.value.totalChunks) * 100)
})

/**
 * 状态对应的展示色
 */
function statusColor(s: NovelOutlineJob['status']) {
  return (
    { splitting: 'processing', split_done: 'blue', generating: 'processing', done: 'success', failed: 'error', aborted: 'default' }[s] ||
    'default'
  )
}
function statusText(s: NovelOutlineJob['status']) {
  return (
    { splitting: '拆分中', split_done: '拆分完成', generating: '生成中', done: '已完成', failed: '失败', aborted: '已中止' }[s] ||
    s
  )
}

/**
 * antd Upload 的 beforeUpload：阻止自动上传，同时拿到 File 对象
 */
function onBeforeUpload(file: File) {
  if (!file.name.toLowerCase().endsWith('.txt')) {
    antMessage.error('仅支持 .txt 文件')
    return false as any
  }
  pickedFile.value = file
  fileList.value = [{ uid: String(file.lastModified), name: file.name, status: 'done' } as UploadFile]
  return false
}
function onRemoveFile() {
  pickedFile.value = null
  fileList.value = []
  return true
}

/**
 * 上传并拆分
 */
async function handleUpload() {
  if (!pickedFile.value) return
  uploading.value = true
  try {
    const res = await uploadAndSplitNovel({
      novelCode: form.novelCode,
      chunkSize: form.chunkSize,
      overlap: form.overlap,
      file: pickedFile.value
    })
    // axios 拦截器已返回后端的 { code, msg, data }，非 200 会走 catch
    if (res.data) {
      currentJob.value = res.data
      queryNovelCode.value = res.data.novelCode
      antMessage.success(`拆分完成，共 ${res.data.totalChunks} 块`)
      // 拆分完了就预加载一下已有大纲（可能是之前生成的）
      await loadOutline()
    }
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

/**
 * 启动/续跑生成，并开启轮询
 */
async function handleGenerate() {
  if (!currentJob.value) return
  generating.value = true
  try {
    const res = await startGenerateOutline(currentJob.value.jobId)
    if (res.data) {
      currentJob.value = res.data
      startPolling()
    }
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '启动失败')
  } finally {
    generating.value = false
  }
}

/**
 * 轮询当前任务状态 + 最新大纲
 */
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (!currentJob.value) return
    try {
      const [jobRes, outlineRes] = await Promise.all([
        getOutlineJobStatus(currentJob.value.jobId),
        getNovelOutline(currentJob.value.novelCode)
      ])
      if (jobRes.data) currentJob.value = jobRes.data
      outline.value = outlineRes.data ?? null

      // 终态则停止轮询
      const s = currentJob.value.status
      if (s === 'done' || s === 'failed' || s === 'aborted') {
        stopPolling()
        if (s === 'done') antMessage.success('大纲生成完成')
        if (s === 'failed') antMessage.error('生成失败：' + (currentJob.value.lastError || '未知错误'))
      }
    } catch (e) {
      // 轮询错误不打断，下一轮继续
      console.warn('轮询失败', e)
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/**
 * 中止任务
 */
async function handleAbort() {
  if (!currentJob.value) return
  try {
    await abortOutlineJob(currentJob.value.jobId)
    antMessage.success('已中止')
    stopPolling()
    await handleRefresh()
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '中止失败')
  }
}

/**
 * 手动刷新任务状态
 */
async function handleRefresh() {
  if (!currentJob.value) return
  const res = await getOutlineJobStatus(currentJob.value.jobId)
  if (res.data) currentJob.value = res.data
  await loadOutline()
}

/**
 * 加载大纲（右侧查询）
 */
async function loadOutline() {
  const code = queryNovelCode.value || currentJob.value?.novelCode
  if (!code) return
  try {
    const res = await getNovelOutline(code)
    outline.value = res.data ?? null
  } catch (e) {
    // ignore
  }
}

/**
 * 列出指定 novelCode 的历史任务，填充下拉选项
 */
async function handleListJobs() {
  const code = recoverForm.novelCode.trim()
  if (!code) {
    antMessage.warning('请先输入 novelCode')
    return
  }
  listingJobs.value = true
  try {
    const res = await listOutlineJobs(code)
    const jobs = res.data || []
    jobOptions.value = jobs.map(j => ({
      value: j.jobId,
      // 下拉关闭时显示的紧凑文案
      label: `${j.jobId}  [${j.status}]  ${j.processedChunks}/${j.totalChunks}`,
      // 下拉展开时副标题，便于区分同一 novelCode 下的多次上传
      desc: `原文：${j.sourceFileName}  · 创建：${formatTime(j.createdAt)}`
    }))
    recoverForm.jobId = ''
    if (!jobs.length) antMessage.info('该 novelCode 没有历史任务')
    else antMessage.success(`共 ${jobs.length} 条历史任务`)
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '查询失败')
  } finally {
    listingJobs.value = false
  }
}

/**
 * 根据选中的 jobId 恢复任务：拉取 job 快照 + 大纲，按状态决定是否重启轮询
 */
async function handleRecover() {
  if (!recoverForm.jobId) return
  recovering.value = true
  try {
    const res = await getOutlineJobStatus(recoverForm.jobId)
    if (!res.data) {
      antMessage.error('未查到该任务')
      return
    }
    currentJob.value = res.data
    queryNovelCode.value = res.data.novelCode
    // 同步到上传表单的 novelCode，便于后续继续生成 / 中止按钮的语义统一
    form.novelCode = res.data.novelCode
    await loadOutline()
    // 若任务仍被标记为生成中（可能是后端重启后残留），打开轮询让 UI 感知最新状态
    if (res.data.status === 'generating') {
      startPolling()
      antMessage.warning('任务状态仍为 generating，若确认后端已停止，请点击"继续生成大纲"强制续跑')
    } else {
      antMessage.success('任务已恢复')
    }
  } catch (e: any) {
    antMessage.error(e?.response?.data?.msg || e?.message || '恢复失败')
  } finally {
    recovering.value = false
  }
}

/**
 * 格式化时间戳为短文本（下拉副标题用）
 */
function formatTime(t?: string): string {
  if (!t) return '-'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 切换 novelCode 时自动清掉旧大纲
watch(
  () => form.novelCode,
  v => {
    if (v && !queryNovelCode.value) queryNovelCode.value = v
  }
)

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style lang="less" scoped>
.novel-outline-page {
  display: flex;
  gap: 16px;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
}
.left-panel {
  width: 380px;
  flex-shrink: 0;
  overflow-y: auto;
}
.right-panel {
  flex: 1;
  overflow-y: auto;
}
.mt-12 {
  margin-top: 12px;
}
.mb-12 {
  margin-bottom: 12px;
}
.fs-12 {
  font-size: 12px;
  color: #999;
}
// 恢复任务下拉里每项的双行展示
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
.action-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.outline-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  margin: 0;
  max-height: 600px;
  overflow-y: auto;
}
.char-detail {
  font-size: 12px;
  color: #555;
  line-height: 1.8;
  max-width: 60%;
}
</style>
