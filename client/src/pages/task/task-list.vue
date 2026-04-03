<script setup lang="ts">
import type { MenuProps, PaginationProps, TableProps, FormProps, ModalProps } from 'ant-design-vue';
import type { TaskModel, CreateTaskParams, UpdateTaskParams } from '~@/api/task';
import {
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  ColumnHeightOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons-vue';
import { Modal, message } from 'ant-design-vue';
import {
  getTaskListApi,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  getTaskByIdApi
} from '~@/api/task';
import { TaskStatus, TaskPriority } from '~@/enums/task-enum';

const statusMap: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '待处理',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.CANCELLED]: '已取消'
};

const priorityMap: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: '低',
  [TaskPriority.MEDIUM]: '中',
  [TaskPriority.HIGH]: '高'
};

const statusColorMap: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'default',
  [TaskStatus.IN_PROGRESS]: 'processing',
  [TaskStatus.COMPLETED]: 'success',
  [TaskStatus.CANCELLED]: 'error'
};

const priorityColorMap: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'blue',
  [TaskPriority.MEDIUM]: 'orange',
  [TaskPriority.HIGH]: 'red'
};

const columns = shallowRef([
  {
    title: '#',
    dataIndex: 'id',
    width: 80
  },
  {
    title: '任务名称',
    dataIndex: 'name'
  },
  {
    title: '描述',
    dataIndex: 'description',
    ellipsis: true
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    width: 80
  },
  {
    title: '负责人',
    dataIndex: 'assignee',
    width: 100
  },
  {
    title: '截止日期',
    dataIndex: 'dueDate',
    width: 120
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 150
  }
]);

const loading = shallowRef(false);
const pagination = reactive<PaginationProps>({
  pageSize: 10,
  pageSizeOptions: ['10', '20', '30', '40'],
  current: 1,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `总数据为：${total}`,
  onChange(current, pageSize) {
    pagination.pageSize = pageSize;
    pagination.current = current;
    init();
  }
});

const dataSource = shallowRef<TaskModel[]>([]);
const formModel = reactive<Partial<TaskModel>>({
  name: undefined,
  status: undefined,
  priority: undefined,
  assignee: undefined
});

// 表格大小
const tableSize = ref<string[]>(['large']);
const sizeItems = ref<MenuProps['items']>([
  { key: 'large', label: '默认', title: '默认' },
  { key: 'middle', label: '中等', title: '中等' },
  { key: 'small', label: '紧凑', title: '紧凑' }
]);

// 弹窗控制
const open = ref(false);
const isEdit = ref(false);
const currentTaskId = ref<string>();

// 表单
const formRef = ref();
const formState = reactive<CreateTaskParams & { id?: string }>({
  name: '',
  description: '',
  status: TaskStatus.PENDING,
  priority: TaskPriority.MEDIUM,
  assignee: '',
  dueDate: '',
  completedAt: '',
  tags: []
});

// 列显示控制
const visibleColumns = computed(() => {
  return columns.value.filter(item => item.dataIndex !== 'action');
});

const openColumnConfig = ref(false);
const columnConfig = ref<string[]>([]);

// 标签输入
const tagsInput = ref<string[]>([]);
const inputValue = ref('');

function onAddTag(e: MouseEvent | KeyboardEvent) {
  e.preventDefault();
  if (inputValue.value && !tagsInput.value.includes(inputValue.value)) {
    tagsInput.value.push(inputValue.value);
    formState.tags = [...tagsInput.value];
  }
  inputValue.value = '';
}

function onClose(tag: string) {
  tagsInput.value = tagsInput.value.filter(t => t !== tag);
  formState.tags = [...tagsInput.value];
}

async function init() {
  loading.value = true;
  try {
    const params: any = {
      current: pagination.current,
      pageSize: pagination.pageSize,
      ...formModel
    };
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key];
      }
    });
    const res = await getTaskListApi(params);
    dataSource.value = res as unknown as TaskModel[];
    pagination.total = dataSource.value.length;
  } catch (error) {
    message.error('获取任务列表失败');
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  formModel.name = undefined;
  formModel.status = undefined;
  formModel.priority = undefined;
  formModel.assignee = undefined;
  init();
}

// 打开新建弹窗
function handleAdd() {
  isEdit.value = false;
  open.value = true;
  resetForm();
}

// 打开编辑弹窗
async function handleEdit(record: TaskModel) {
  isEdit.value = true;
  currentTaskId.value = record.id;
  open.value = true;
  
  try {
    const data: any = await getTaskByIdApi(record.id);
    formState.name = data.name;
    formState.description = data.description || '';
    formState.status = data.status;
    formState.priority = data.priority;
    formState.assignee = data.assignee || '';
    formState.dueDate = data.dueDate ? data.dueDate.split('T')[0] : '';
    formState.completedAt = data.completedAt ? data.completedAt.split('T')[0] : '';
    formState.tags = data.tags || [];
    tagsInput.value = [...formState.tags];
  } catch (error) {
    message.error('获取任务详情失败');
  }
}

// 删除任务
function handleDelete(record: TaskModel) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除任务"${record.name}"吗？`,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteTaskApi(record.id);
        message.success('删除成功');
        init();
      } catch (error) {
        message.error('删除失败');
      }
    }
  });
}

// 重置表单
function resetForm() {
  formState.name = '';
  formState.description = '';
  formState.status = TaskStatus.PENDING;
  formState.priority = TaskPriority.MEDIUM;
  formState.assignee = '';
  formState.dueDate = '';
  formState.completedAt = '';
  formState.tags = [];
  tagsInput.value = [];
  inputValue.value = '';
}

// 提交表单
async function handleSubmit() {
  try {
    await formRef.value?.validate();
    
    const data = {
      ...formState,
      tags: formState.tags
    };

    if (isEdit.value && currentTaskId.value) {
      await updateTaskApi(currentTaskId.value, data as UpdateTaskParams);
      message.success('更新成功');
    } else {
      await createTaskApi(data as CreateTaskParams);
      message.success('创建成功');
    }
    
    open.value = false;
    resetForm();
    init();
  } catch (error) {
    console.error(error);
  }
}

// 弹窗关闭回调
const afterClose: ModalProps['afterClose'] = () => {
  resetForm();
};

// 状态选项
const statusOptions = [
  { label: '待处理', value: TaskStatus.PENDING },
  { label: '进行中', value: TaskStatus.IN_PROGRESS },
  { label: '已完成', value: TaskStatus.COMPLETED },
  { label: '已取消', value: TaskStatus.CANCELLED }
] as const;

// 优先级选项
const priorityOptions = [
  { label: '低', value: TaskPriority.LOW },
  { label: '中', value: TaskPriority.MEDIUM },
  { label: '高', value: TaskPriority.HIGH }
] as const;

onMounted(() => {
  init();
});
</script>

<template>
  <page-container class="task-page">
    <!-- 搜索表单 -->
    <a-card bordered class="search-card mb-6">
      <a-form :model="formModel" layout="inline" class="search-form">
        <a-form-item label="任务名称" class="search-item">
          <a-input 
            v-model:value="formModel.name" 
            placeholder="请输入任务名称" 
            class="search-input"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="状态" class="search-item">
          <a-select 
            v-model:value="formModel.status" 
            placeholder="请选择状态" 
            allow-clear 
            class="search-select"
          >
            <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="优先级" class="search-item">
          <a-select 
            v-model:value="formModel.priority" 
            placeholder="请选择优先级" 
            allow-clear 
            class="search-select"
          >
            <a-select-option v-for="item in priorityOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="负责人" class="search-item">
          <a-input 
            v-model:value="formModel.assignee" 
            placeholder="请输入负责人" 
            class="search-input"
            allow-clear
          />
        </a-form-item>
        <a-form-item class="search-actions">
          <a-button type="primary" @click="init" class="action-btn">
            <reload-outlined />
            查询
          </a-button>
          <a-button @click="handleReset" class="action-btn">
            重置
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格区域 -->
    <a-card bordered class="table-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <a-button type="primary" @click="handleAdd" class="toolbar-btn">
            <plus-outlined />
            新建任务
          </a-button>
          <a-button @click="init" class="toolbar-btn">
            <reload-outlined />
            刷新
          </a-button>
        </div>
        <div class="toolbar-right">
          <a-dropdown>
            <a-button class="toolbar-btn">
              表格大小 <column-height-outlined class="ml-1" />
            </a-button>
            <template #overlay>
              <a-menu v-model:selectedKeys="tableSize" @click="(item:any) => pagination.pageSize = Number(item.key)">
                <a-menu-item v-for="item in sizeItems" :key="item?.key">
                  {{ (item as any)?.label }}
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-popover trigger="click" placement="bottomRight">
            <a-button class="toolbar-btn">
              <setting-outlined />
              列配置
            </a-button>
            <template #content>
              <div class="column-config">
                <a-checkbox-group v-model:value="columnConfig">
                  <div v-for="col in visibleColumns" :key="col.dataIndex" class="column-item">
                    <a-checkbox :value="col.dataIndex">{{ col.title }}</a-checkbox>
                  </div>
                </a-checkbox-group>
              </div>
            </template>
          </a-popover>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="pagination"
        :size="tableSize[0] as any"
        row-key="id"
        class="task-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="(statusColorMap as any)[record.status]" class="status-tag">
              {{ (statusMap as any)[record.status] }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'priority'">
            <a-tag :color="(priorityColorMap as any)[record.priority]" class="priority-tag">
              {{ (priorityMap as any)[record.priority] }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'tags'">
            <span class="tags-wrapper">
              <a-tag
                v-for="tag in record.tags"
                :key="tag"
                color="blue"
                class="tag-item"
              >
                {{ tag }}
              </a-tag>
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="8">
              <a-button type="link" size="small" @click="handleEdit(record as TaskModel)" class="action-link">
                <edit-outlined />
                编辑
              </a-button>
              <a-popconfirm
                title="确定删除该任务吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(record as TaskModel)"
              >
                <a-button type="link" size="small" danger class="action-link">
                  <delete-outlined />
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新建/编辑弹窗 -->
    <a-modal
      v-model:open="open"
      :title="isEdit ? '编辑任务' : '新建任务'"
      :width="900"
      @ok="handleSubmit"
      @after-close="afterClose"
      class="task-modal"
    >
      <a-form ref="formRef" :model="formState" layout="vertical" class="task-form">
        <a-row :gutter="[24, 24]">
          <a-col :span="24">
            <a-form-item
              label="任务名称"
              name="name"
              :rules="[{ required: true, message: '请输入任务名称' }]"
              class="form-item"
            >
              <a-input 
                v-model:value="formState.name" 
                placeholder="请输入任务名称" 
                size="large"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="[24, 24]">
          <a-col :span="24">
            <a-form-item label="任务描述" class="form-item">
              <a-textarea
                v-model:value="formState.description"
                placeholder="请输入任务描述"
                :rows="4"
                size="large"
                show-count
                :maxlength="500"
              />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="[24, 24]">
          <a-col :span="12">
            <a-form-item
              label="任务状态"
              name="status"
              :rules="[{ required: true, message: '请选择任务状态' }]"
              class="form-item"
            >
              <a-select 
                v-model:value="formState.status" 
                placeholder="请选择任务状态"
                size="large"
              >
                <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
                  <span class="option-label">{{ item.label }}</span>
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="优先级"
              name="priority"
              :rules="[{ required: true, message: '请选择优先级' }]"
              class="form-item"
            >
              <a-select 
                v-model:value="formState.priority" 
                placeholder="请选择优先级"
                size="large"
              >
                <a-select-option v-for="item in priorityOptions" :key="item.value" :value="item.value">
                  <span class="option-label">{{ item.label }}</span>
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="[24, 24]">
          <a-col :span="12">
            <a-form-item label="负责人" class="form-item">
              <a-input 
                v-model:value="formState.assignee" 
                placeholder="请输入负责人"
                size="large"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="截止日期" class="form-item">
              <a-date-picker
                v-model:value="formState.dueDate"
                placeholder="请选择截止日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                size="large"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="[24, 24]">
          <a-col :span="12">
            <a-form-item label="完成时间" class="form-item">
              <a-date-picker
                v-model:value="formState.completedAt"
                placeholder="请选择完成时间"
                style="width: 100%"
                format="YYYY-MM-DD"
                size="large"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="标签" class="form-item">
              <div class="tags-input-wrapper">
                <a-tag
                  v-for="tag in tagsInput"
                  :key="tag"
                  color="blue"
                  closable
                  @close="() => onClose(tag)"
                  class="input-tag"
                >
                  {{ tag }}
                </a-tag>
                <a-input
                  v-if="inputValue"
                  type="text"
                  size="small"
                  :value="inputValue"
                  @change="(e:any) => inputValue = e.target.value"
                  @blur="() => inputValue = ''"
                  @keyup.enter="onAddTag"
                  placeholder="请输入标签"
                  class="tag-input"
                />
                <a-button v-else type="dashed" size="small" @click="onAddTag" class="add-tag-btn">
                  <plus-outlined />
                  添加标签
                </a-button>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </page-container>
</template>

<style scoped>
.task-page {
  background: #f5f7fa;
  min-height: calc(100vh - 64px);
  padding: 24px;
}

/* 搜索卡片 */
.search-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.search-item {
  margin-bottom: 8px !important;
}

.search-input,
.search-select {
  width: 180px;
}

.search-actions {
  margin-left: auto;
  margin-bottom: 8px !important;
}

.action-btn {
  margin-right: 8px;
}

/* 表格卡片 */
.table-card {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar-btn {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: 6px;
}

.column-config {
  padding: 12px 16px;
  min-width: 150px;
}

.column-item {
  margin-bottom: 12px;
}

.column-item:last-child {
  margin-bottom: 0;
}

/* 表格样式 */
.task-table {
  margin-top: 8px;
}

.task-table :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
  font-weight: 600;
  padding: 14px 16px;
  border-radius: 4px 4px 0 0;
}

.task-table :deep(.ant-table-tbody > tr > td) {
  padding: 14px 16px;
  vertical-align: middle;
}

.task-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #f5f7fa;
}

.status-tag,
.priority-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 500;
}

.tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  margin: 0;
  font-size: 12px;
  padding: 2px 8px;
}

.action-link {
  padding: 0;
  font-size: 13px;
}

/* 弹窗样式 */
.task-modal :deep(.ant-modal-header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.task-modal :deep(.ant-modal-title) {
  font-size: 18px;
  font-weight: 600;
  color: #1f1f1f;
}

.task-modal :deep(.ant-modal-body) {
  padding: 8px 24px 24px;
}

.task-modal :deep(.ant-modal-footer) {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

.task-form {
  padding-top: 8px;
}

.form-item {
  margin-bottom: 0 !important;
}

.form-item :deep(.ant-form-item-label > label) {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.form-item :deep(.ant-form-item-required::before) {
  color: #ff4d4f;
}

/* 标签输入 */
.tags-input-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 40px;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  transition: all 0.3s;
}

.tags-input-wrapper:focus-within {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.input-tag {
  margin: 0;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 4px;
}

.tag-input {
  width: 100px;
  height: 32px;
}

.add-tag-btn {
  height: 32px;
  border-radius: 4px;
}

/* 响应式 */
@media (max-width: 768px) {
  .task-page {
    padding: 16px;
  }
  
  .search-input,
  .search-select {
    width: 100%;
  }
  
  .search-actions {
    margin-left: 0;
    width: 100%;
  }
  
  .action-btn {
    flex: 1;
  }
  
  .toolbar {
    flex-direction: column;
    gap: 16px;
  }
  
  .toolbar-left,
  .toolbar-right {
    width: 100%;
  }
  
  .toolbar-btn {
    flex: 1;
  }
}

/* 动画效果 */
.task-card {
  transition: box-shadow 0.3s ease;
}

.task-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 加载状态 */
.task-table :deep(.ant-spin-blur) {
  border-radius: 8px;
}

/* 分页器样式 */
.task-table :deep(.ant-pagination) {
  margin-top: 24px;
  margin-bottom: 0;
}

.task-table :deep(.ant-pagination-item) {
  border-radius: 6px;
}

.task-table :deep(.ant-pagination-item-active) {
  background: #1890ff;
  border-color: #1890ff;
}

.task-table :deep(.ant-pagination-item-active a) {
  color: #fff;
}
</style>
