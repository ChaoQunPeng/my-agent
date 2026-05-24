import request from '@/utils/request'

export type NovelOutlineJobStatus =
  | 'splitting'
  | 'split_done'
  | 'generating'
  | 'done'
  | 'failed'
  | 'aborted'

interface RawNovelOutlineJob {
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
  splittedChunks?: number
  processedChunks?: number
  processingChunkIndex?: number
  lastCompletedChunkIndex?: number
  lastCompletedChunkFile?: string
  status: NovelOutlineJobStatus
  lastError: string
  createdAt?: string
  updatedAt?: string
}

export interface NovelOutlineJob extends RawNovelOutlineJob {
  splittedChunks: number
  processedChunks: number
  processingChunkIndex: number
  lastCompletedChunkIndex: number
  lastCompletedChunkFile: string
}

interface RawOutlineCharacter {
  name: string
  aliases?: string[]
  aliasCandidates?: string[]
  identity?: string[]
  personality?: string[]
  goals?: string[]
  traits?: string[]
  relations?: string[]
}

interface RawOutlineEvent {
  title: string
  summary?: string[]
  characters?: string[]
  chunkIndex?: number
}

interface RawWorldView {
  worldType?: string[]
  summary?: string[]
  socialStructure?: string[]
  coreRules?: string[]
}

interface RawNovelOutlineResult {
  _id?: string
  novelCode: string
  lastJobId: string
  worldView?: RawWorldView
  characters?: RawOutlineCharacter[]
  events?: RawOutlineEvent[]
  createdAt?: string
  updatedAt?: string
}

export interface OutlineCharacter {
  name: string
  aliases?: string[]
  aliasCandidates?: string[]
  identity?: string
  personality?: string
  goals?: string
  traits?: string
  relations?: string
}

export interface NovelOutlineResult {
  _id?: string
  novelCode: string
  lastJobId: string
  synopsis: string
  worldSetting: string
  storyConflicts: string
  plotOutline: string
  characters: OutlineCharacter[]
  rawLastResponse: string
  createdAt?: string
  updatedAt?: string
}

function normalizeStringList(values?: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => (value || '').trim())
        .filter(Boolean),
    ),
  )
}

function joinLines(values?: Array<string | undefined | null>): string {
  return normalizeStringList(values).join('\n')
}

function formatEvent(event: RawOutlineEvent, index: number): string {
  const body = joinLines(event.summary)
  return body ? `${index + 1}. ${event.title}\n${body}` : `${index + 1}. ${event.title}`
}

function normalizeJob(job: RawNovelOutlineJob): NovelOutlineJob {
  const totalChunks = job.totalChunks || 0
  const lastCompletedChunkIndex = job.lastCompletedChunkIndex || 0
  const processingChunkIndex = job.processingChunkIndex || 0
  const splittedChunks =
    job.splittedChunks ??
    (job.status === 'splitting'
      ? Math.min(processingChunkIndex, totalChunks)
      : totalChunks)
  const processedChunks = job.processedChunks ?? lastCompletedChunkIndex
  const lastCompletedChunkFile =
    job.lastCompletedChunkFile ||
    (lastCompletedChunkIndex > 0
      ? `chunk-${String(lastCompletedChunkIndex).padStart(4, '0')}.txt`
      : '')

  return {
    ...job,
    totalChunks,
    splittedChunks,
    processedChunks,
    processingChunkIndex,
    lastCompletedChunkIndex,
    lastCompletedChunkFile,
  }
}

function normalizeOutline(outline: RawNovelOutlineResult | null): NovelOutlineResult | null {
  if (!outline) return null

  const worldView = outline.worldView || {}
  const events = outline.events || []
  const characters = (outline.characters || []).map((character) => ({
    name: character.name,
    aliases: normalizeStringList(character.aliases),
    aliasCandidates: normalizeStringList(character.aliasCandidates),
    identity: joinLines(character.identity),
    personality: joinLines(character.personality),
    goals: joinLines(character.goals),
    traits: joinLines(character.traits),
    relations: joinLines(character.relations),
  }))

  const synopsisParts = events.slice(0, 8).map((event, index) => formatEvent(event, index))
  const worldSettingParts = [
    ...normalizeStringList(worldView.worldType).map((value) => `世界类型：${value}`),
    ...normalizeStringList(worldView.summary),
    ...normalizeStringList(worldView.socialStructure).map(
      (value) => `社会结构：${value}`,
    ),
    ...normalizeStringList(worldView.coreRules).map((value) => `核心规则：${value}`),
  ]
  const plotOutlineParts = events.map((event, index) => formatEvent(event, index))
  const storyConflictParts = normalizeStringList([
    ...characters.flatMap((character) => [character.goals, character.relations]),
    ...events.flatMap((event) => event.summary || []),
  ])

  return {
    _id: outline._id,
    novelCode: outline.novelCode,
    lastJobId: outline.lastJobId,
    synopsis: synopsisParts.join('\n\n'),
    worldSetting: worldSettingParts.join('\n'),
    storyConflicts: storyConflictParts.join('\n'),
    plotOutline: plotOutlineParts.join('\n\n'),
    characters,
    rawLastResponse: '',
    createdAt: outline.createdAt,
    updatedAt: outline.updatedAt,
  }
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
  if (params.overlap != null)
    form.append('overlap', String(params.overlap))
  form.append('file', params.file)

  return request.post<RawNovelOutlineJob>(
    '/novel-outline/upload-and-split',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    },
  ).then((res) => ({
    ...res,
    data: res.data ? normalizeJob(res.data) : res.data,
  }))
}

export function startGenerateOutline(jobId: string) {
  return request.post<RawNovelOutlineJob>('/novel-outline/start-generate', {
    jobId,
  }).then((res) => ({
    ...res,
    data: res.data ? normalizeJob(res.data) : res.data,
  }))
}

export function getOutlineJobStatus(jobId: string) {
  return request.post<RawNovelOutlineJob | null>('/novel-outline/get-split-job', {
    jobId,
  }).then((res) => ({
    ...res,
    data: res.data ? normalizeJob(res.data) : null,
  }))
}

export function abortOutlineJob(jobId: string) {
  return request.post<RawNovelOutlineJob>('/novel-outline/abort-job', {
    jobId,
  }).then((res) => ({
    ...res,
    data: res.data ? normalizeJob(res.data) : res.data,
  }))
}

export function getNovelOutline(novelCode: string) {
  return request.post<RawNovelOutlineResult | null>(
    '/novel-outline/find-by-novel-code',
    {
      novelCode,
    },
  ).then((res) => ({
    ...res,
    data: normalizeOutline(res.data ?? null),
  }))
}

export function listOutlineJobs(novelCode: string) {
  return request.post<{
    list: RawNovelOutlineJob[]
    total: number
    current: number
    pageSize: number
  }>('/novel-outline/get-split-jobs', {
    novelCode,
    current: 1,
    pageSize: 100,
  }).then((res) => ({
    ...res,
    data: (res.data?.list || []).map(normalizeJob),
  }))
}

export function getAliasCandidates(novelCode: string) {
  return request.post<
    Array<{
      characterName: string
      aliases: string[]
      aliasCandidates: string[]
    }>
  >('/novel-outline/get-alias-candidates', { novelCode })
}

export function mergeAlias(params: {
  novelCode: string
  characterName: string
  aliasesToConfirm: string[]
}) {
  return request.post('/novel-outline/merge-alias', params)
}

export function startSecondPassSummary(novelCode: string) {
  return request.post<{
    novelCode: string
    worldView: {
      worldType: string[]
      summary: string[]
      socialStructure: string[]
      coreRules: string[]
    }
    characterCount: number
    eventCount: number
  }>('/novel-outline/start-second-pass', {
    novelCode,
  })
}
