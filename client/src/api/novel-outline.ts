import request from '@/utils/request'

export type NovelOutlineJobStatus =
  | 'splitting'
  | 'split_done'
  | 'generating'
  | 'done'
  | 'failed'
  | 'aborted'

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
  processingChunkIndex: number
  lastCompletedChunkIndex: number
  status: NovelOutlineJobStatus
  lastError: string
  createdAt?: string
  updatedAt?: string
}

export interface OutlineWorldView {
  worldType?: string[]
  summary?: string[]
  socialStructure?: string[]
  coreRules?: string[]
}

export interface OutlineCharacter {
  name: string
  aliases?: string[]
  aliasCandidates?: string[]
  identity?: string[]
  personality?: string[]
  goals?: string[]
  traits?: string[]
  relations?: string[]
}

export interface OutlineEvent {
  title: string
  summary?: string[]
  characters?: string[]
  chunkIndex?: number
}

export interface NovelOutlineResult {
  _id?: string
  novelCode: string
  lastJobId: string
  worldView: OutlineWorldView
  characters: OutlineCharacter[]
  events: OutlineEvent[]
  createdAt?: string
  updatedAt?: string
}

export interface NovelOutlineCompressedResult extends NovelOutlineResult {}

export interface SplitJobListResult {
  list: NovelOutlineJob[]
  total: number
  current: number
  pageSize: number
}

export function uploadAndSplitNovel(params: {
  novelCode: string
  chunkSize?: number
  overlap?: number
  file: File
}) {
  const form = new FormData()
  form.append('novelCode', params.novelCode)
  if (params.chunkSize != null)
    form.append('chunkSize', String(params.chunkSize))
  if (params.overlap != null) form.append('overlap', String(params.overlap))
  form.append('file', params.file)

  return request.post<NovelOutlineJob>(
    '/novel-outline/upload-and-split',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    },
  )
}

export function startExtractNovelOutline(novelCode: string) {
  return request.post<NovelOutlineJob>(
    '/novel-outline/start-extract',
    { novelCode },
    { timeout: 1800000 },
  )
}

export function getOutlineJob(params: { jobId?: string; novelCode?: string }) {
  return request.post<NovelOutlineJob | null>(
    '/novel-outline/get-split-job',
    params,
  )
}

export function getOutlineJobs(params: {
  novelCode?: string
  jobId?: string
  current?: number
  pageSize?: number
  status?: NovelOutlineJobStatus
}) {
  return request.post<SplitJobListResult>('/novel-outline/get-split-jobs', params)
}

export function findNovelOutline(novelCode: string) {
  return request.post<NovelOutlineResult | null>(
    '/novel-outline/find-by-novel-code',
    { novelCode },
  )
}

export function findCompressedNovelOutline(novelCode: string) {
  return request.post<NovelOutlineCompressedResult | null>(
    '/novel-outline/find-compressed-by-novel-code',
    { novelCode },
  )
}

export function buildCompressedNovelOutline(novelCode: string) {
  return request.post<NovelOutlineCompressedResult>(
    '/novel-outline/build-compressed',
    { novelCode },
    { timeout: 1800000 },
  )
}
