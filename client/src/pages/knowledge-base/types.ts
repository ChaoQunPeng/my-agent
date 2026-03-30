export interface KnowledgeBaseModel {
  id: number;
  name: string;
  capacity: number; // 知识库容量（字节）
  desc: string;
  createdAt: string;
  creator: string;
}

export interface KnowledgeBaseParams {
  name?: string;
  desc?: string;
  creator?: string;
  createdAt?: string;
}
