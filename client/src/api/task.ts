import type { TaskStatus, TaskPriority } from '~@/enums/task-enum';

interface TaskModel {
  id: string;
  /**
   * 任务名称
   */
  name: string;
  /**
   * 任务描述
   */
  description: string;
  /**
   * 任务状态
   */
  status: TaskStatus;
  /**
   * 优先级
   */
  priority: TaskPriority;
  /**
   * 负责人
   */
  assignee: string;
  /**
   * 截止日期
   */
  dueDate: string;
  /**
   * 完成时间
   */
  completedAt: string;
  /**
   * 标签
   */
  tags: string[];
  /**
   * 创建时间
   */
  createdAt: string;
  /**
   * 更新时间
   */
  updatedAt: string;

  // 分页
  current?: number;
  pageSize?: number;
}

type CreateTaskParams = Omit<TaskModel, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateTaskParams = Partial<Omit<TaskModel, 'id' | 'createdAt' | 'updatedAt'>>;

export async function getTaskListApi(params?: Partial<TaskModel>) {
  return usePost<TaskModel[]>('/task/getTaskList', params);
}

export async function getTaskByIdApi(id: string) {
  return usePost<TaskModel>(`/task/getTaskById`, { id });
}

export async function createTaskApi(data: CreateTaskParams) {
  return usePost<TaskModel>('/task/createTask', data);
}

export async function updateTaskApi(id: string, data: UpdateTaskParams) {
  return usePost<TaskModel>(`/task/updateTask`, { id, ...data });
}

export async function deleteTaskApi(id: string) {
  return usePost(`/task/deleteTask`, { id });
}

export async function getTasksByStatusApi(status: TaskStatus) {
  return usePost<TaskModel[]>(`/task/getTasksByStatus`, { status });
}

export async function getTasksByAssigneeApi(assignee: string) {
  return usePost<TaskModel[]>(`/task/getTasksByAssignee`, { assignee });
}

export type { TaskModel, CreateTaskParams, UpdateTaskParams };
