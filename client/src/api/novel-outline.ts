import request from '@/utils/request'

/**
 * 任务状态
 */
export type NovelOutlineJobStatus =
  | 'splitting'
  | 'split_done'
  | 'generating'
  | 'done'
  | 'failed'
  | 'aborted'

/**
 * 任务信息（与后端 NovelSplitJob 对齐）
 */
export interface NovelOutlineJob {
  _id?: string
  jobId: string
  novelCode: string
  sourceFileName: string
  totalChars: number
  chunkSize: number
  overlap: number
  chunkDir: string
  sourceFilePath: string
  totalChunks: number
  splittedChunks: number
  processedChunks: number
  status: NovelOutlineJobStatus
  lastError: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 人物条目
 */
export interface OutlineCharacter {
  name: string
  identity?: string
  personality?: string
  goals?: string
  traits?: string
  relations?: string
}

/**
 * 小说大纲（与后端 NovelOutline 对齐）
 */
export interface NovelOutlineResult {
  _id?: string
  novelCode: string
  lastJobId: string
  synopsis: string
  worldSetting: string
  plotMainline: string
  plotOutline: string
  characters: OutlineCharacter[]
  rawLastResponse: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 上传 txt 并启动拆分
 * 注意：使用 multipart/form-data
 */
export function uploadAndSplitNovel(params: {
  novelCode: string
  chunkSize?: number
  overlap?: number
  file: File
}) {
  const form = new FormData()
  form.append('novelCode', params.novelCode)
  if (params.chunkSize != null) form.append('chunkSize', String(params.chunkSize))
  if (params.overlap != null) form.append('overlap', String(params.overlap))
  form.append('file', params.file)

  return request.post<NovelOutlineJob>('/novel-outline/upload-and-split', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // 大文件需要放宽超时
    timeout: 300000
  })
}

/**
 * 启动（或续跑）大纲生成
 */
export function startGenerateOutline(jobId: string) {
  return request.post<NovelOutlineJob>('/novel-outline/start-generate', { jobId })
}

/**
 * 查询任务状态
 */
export function getOutlineJobStatus(jobId: string) {
  return request.post<NovelOutlineJob>('/novel-outline/job-status', { jobId })
}

/**
 * 中止任务并清理切片
 */
export function abortOutlineJob(jobId: string) {
  return request.post('/novel-outline/abort-job', { jobId })
}

/**
 * 获取大纲结果
 */
export function getNovelOutline(novelCode: string) {
  return request.post<NovelOutlineResult | null>('/novel-outline/get-outline', { novelCode })
}

/**
 * 按 novelCode 查询任务列表
 */
export function listOutlineJobs(novelCode: string) {
  return request.post<NovelOutlineJob[]>('/novel-outline/list-jobs', { novelCode })
}
