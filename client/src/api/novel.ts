import request from '@/utils/request'

export interface Novel {
  _id: string
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface NovelRelation {
  targetId: string | null
  relation: string
  description: string
}

export interface NovelCharacter {
  _id: string
  id: string
  novelId: string
  name: string
  alias: string[]
  gender: string
  age: number
  description: string
  appearance: string[]
  personality: string[]
  background: string
  motivation: string[]
  relations: NovelRelation[]
  organizationRelations: NovelRelation[]
  remark: string
  createdAt: string
  updatedAt: string
}

export interface NovelOrganization {
  _id: string
  id: string
  novelId: string
  name: string
  alias: string[]
  description: string
  background: string
  motivation: string[]
  belief: string
  remark: string
  createdAt: string
  updatedAt: string
}

export type CreateNovelCharacterPayload = Omit<NovelCharacter, '_id' | 'id' | 'createdAt' | 'updatedAt'>

export type CreateNovelOrganizationPayload = Omit<NovelOrganization, '_id' | 'id' | 'createdAt' | 'updatedAt'>

export type UpdateNovelCharacterPayload = Partial<CreateNovelCharacterPayload> & Pick<NovelCharacter, 'id'>

export type UpdateNovelOrganizationPayload = Partial<CreateNovelOrganizationPayload> & Pick<NovelOrganization, 'id'>

export function getNovels() {
  return request.post<Novel[]>('/novels/get-novels')
}

export function createNovel(name: string) {
  return request.post<Novel>('/novels/create-novel', { name })
}

export function getNovelCharacters(novelId: string) {
  return request.post<NovelCharacter[]>('/novel-characters/get-novel-characters', { novelId })
}

export function createNovelCharacter(data: CreateNovelCharacterPayload) {
  return request.post<NovelCharacter>('/novel-characters/create-novel-character', data)
}

export function updateNovelCharacter(data: UpdateNovelCharacterPayload) {
  return request.post<NovelCharacter>('/novel-characters/update-novel-character', data)
}

export function deleteNovelCharacter(id: string) {
  return request.post<null>('/novel-characters/delete-novel-character', { id })
}

export function getNovelOrganizations(novelId: string) {
  return request.post<NovelOrganization[]>('/novel-organizations/get-novel-organizations', { novelId })
}

export function createNovelOrganization(data: CreateNovelOrganizationPayload) {
  return request.post<NovelOrganization>('/novel-organizations/create-novel-organization', data)
}

export function updateNovelOrganization(data: UpdateNovelOrganizationPayload) {
  return request.post<NovelOrganization>('/novel-organizations/update-novel-organization', data)
}

export function deleteNovelOrganization(id: string) {
  return request.post<null>('/novel-organizations/delete-novel-organization', { id })
}
