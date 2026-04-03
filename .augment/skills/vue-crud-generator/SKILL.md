---
name: vue-crud-generator
description: 当用户要求创建前端 Vue 页面、前端 CRUD 页面（如"帮我创建 product 的前端页面"、"新建 order 管理页面"等）时，自动按照项目规范生成完整的 Vue 3 CRUD 前端文件。
---

# Vue 3 CRUD 前端生成规范

当用户要求创建前端 CRUD 页面时，按以下规范在项目中生成 **3 个文件** 并修改 **1 个路由文件**。

## 命名规则

给定模块名（如 `product-category`）：
- **kebab-case**：`product-category`（文件名、目录名、路由路径）
- **PascalCase**：`ProductCategory`（组件名、类型名）
- **camelCase**：`productCategory`（变量名）
- **中文名**：用户提供，或根据英文推断（如 product → 商品）

## 项目技术栈

- Vue 3 Composition API + `<script setup lang="ts">`
- Ant Design Vue（组件全局注册，无需 import）
- `useTableQuery` composable（路径 `~@/composables/table-query`）
- HTTP 工具：`useGet`、`usePost`、`usePut`、`useDelete`（全局自动导入，无需 import）
- `ref`、`computed`、`reactive` 等 Vue API 全部自动导入，无需 import
- `lodash` 的 `cloneDeep` 需要显式 import

## 必须生成的 3 个文件

### 1. `client/src/api/<kebab>/<kebab>.ts`

```typescript
interface {Pascal}Model {
  id?: string;
  // 根据用户提供的字段生成，每个字段加 JSDoc 注释
  name: string;
}

type {Pascal}Params = Partial<Omit<{Pascal}Model, 'id'>> & {
  current?: number;
  pageSize?: number;
};

export async function get{Pascal}ListApi(params?: {Pascal}Params) {
  return usePost<{ records: {Pascal}Model[]; total: number }>('/<route>/get-{kebab}-list', params);
}

export async function get{Pascal}ByIdApi(id: string) {
  return usePost<{Pascal}Model>('/<route>/get-{kebab}-by-id', { id });
}

export async function create{Pascal}Api(data: Omit<{Pascal}Model, 'id'>) {
  return usePost<{Pascal}Model>('/<route>/create-{kebab}', data);
}

export async function update{Pascal}Api(id: string, data: Partial<Omit<{Pascal}Model, 'id'>>) {
  return usePost<{Pascal}Model>('/<route>/update-{kebab}', { id, ...data });
}

export async function delete{Pascal}Api(id: string) {
  return usePost('/<route>/delete-{kebab}', { id });
}

export type { {Pascal}Model, {Pascal}Params };
```

### 2. `client/src/pages/<kebab>/index.vue`

```vue
<script setup lang="ts">
import type { {Pascal}Model } from '~@/api/<kebab>/<kebab>';
import { PlusOutlined } from '@ant-design/icons-vue';
import { get{Pascal}ListApi, delete{Pascal}Api } from '~@/api/<kebab>/<kebab>';
import { useTableQuery } from '~@/composables/table-query';
import {Pascal}Modal from './components/{kebab}-modal.vue';

const message = useMessage();

const columns = shallowRef([
  // 根据用户字段生成列，最后固定加操作列
  { title: '名称', dataIndex: 'name' },
  { title: '操作', dataIndex: 'action' }
]);

const { state, initQuery, resetQuery, query } = useTableQuery({
  queryApi: get{Pascal}ListApi,
  queryParams: {
    // 根据用户字段生成查询参数，初始值为 undefined
    name: undefined
  }
});

const {camel}Modal = ref<InstanceType<typeof {Pascal}Modal>>();

async function handleDelete(record: {Pascal}Model) {
  if (!record.id) return message.error('id 不能为空');
  try {
    const res = await delete{Pascal}Api(record.id);
    if (res.code === 200) {
      message.success('删除成功');
      await query();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleAdd() {
  {camel}Modal.value?.open();
}

function handleEdit(record: {Pascal}Model) {
  {camel}Modal.value?.open(record);
}
</script>

<template>
  <page-container>
    <a-card mb-4>
      <a-form class="crud-search-wrapper" :label-col="{ span: 7 }" :model="state.queryParams">
        <a-row :gutter="[15, 0]">
          <!-- 根据用户字段生成搜索表单项 -->
          <a-col :span="6">
            <a-form-item name="name" label="名称">
              <a-input v-model:value="state.queryParams.name" placeholder="请输入名称" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-space flex justify-end w-full>
              <a-button :loading="state.loading" type="primary" @click="initQuery">查询</a-button>
              <a-button :loading="state.loading" @click="resetQuery">重置</a-button>
            </a-space>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card title="{中文名}管理">
      <template #extra>
        <a-button type="primary" @click="handleAdd">
          <template #icon><PlusOutlined /></template>
          新增
        </a-button>
      </template>
      <a-table
        row-key="id"
        :loading="state.loading"
        :columns="columns"
        :data-source="state.dataSource"
        :pagination="state.pagination"
      >
        <template #bodyCell="scope">
          <template v-if="scope?.column?.dataIndex === 'action'">
            <div flex gap-2>
              <a-button type="link" @click="handleEdit(scope?.record as {Pascal}Model)">编辑</a-button>
              <a-popconfirm title="确定删除？" ok-text="确定" cancel-text="取消" @confirm="handleDelete(scope?.record as {Pascal}Model)">
                <a-button type="link">删除</a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <{Pascal}Modal ref="{camel}Modal" @ok="query" />
  </page-container>
</template>

<style lang="less" scoped>
.crud-search-wrapper {
  .ant-form-item { margin: 0; }
}
</style>
```

### 3. `client/src/pages/<kebab>/components/<kebab>-modal.vue`

```vue
<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import type { {Pascal}Model } from '~@/api/<kebab>/<kebab>';
import { create{Pascal}Api, update{Pascal}Api } from '~@/api/<kebab>/<kebab>';
import { cloneDeep } from 'lodash';

const emit = defineEmits(['cancel', 'ok']);
const message = useMessage();

const isUpdate = ref(false);
const visible = ref(false);
const title = computed(() => isUpdate.value ? '编辑' : '新增');
const formRef = ref<FormInstance>();

// 根据用户字段生成初始值
const initialForm = (): Omit<{Pascal}Model, 'id'> => ({
  name: ''
});

const formData = ref<{Pascal}Model>(initialForm());
const labelCol = { style: { width: '100px' } };
const wrapperCol = { span: 24 };

function open(record?: {Pascal}Model) {
  visible.value = true;
  isUpdate.value = !!record?.id;
  formData.value = record ? cloneDeep(record) : initialForm();
}

async function handleOk() {
  try {
    await formRef.value?.validate();
    const { id, ...rest } = formData.value;
    if (isUpdate.value && id) {
      await update{Pascal}Api(id, rest);
      message.success('更新成功');
    } else {
      await create{Pascal}Api(rest);
      message.success('创建成功');
    }
    emit('ok');
    visible.value = false;
  } catch (e) {
    console.log('Form error:', e);
  }
}

function handleCancel() {
  formRef.value?.resetFields();
  emit('cancel');
}

defineExpose({ open });
</script>

<template>
  <a-modal v-model:open="visible" :title="title" @ok="handleOk" @cancel="handleCancel">
    <a-form ref="formRef" :model="formData" :label-col="labelCol" :wrapper-col="wrapperCol">
      <!-- 根据用户字段生成表单项，必填字段加 rules -->
      <a-form-item name="name" label="名称" :rules="[{ required: true, message: '请输入名称' }]">
        <a-input v-model:value="formData.name" placeholder="请输入名称" :maxlength="100" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
```

## 路由注册（修改已有文件）

在 `client/src/router/dynamic-routes.ts` 的数组中添加路由：

```typescript
{
  path: '/<kebab>',
  name: '{Pascal}Index',
  component: () => import('~/pages/<kebab>/index.vue'),
  meta: {
    title: '{中文名}管理',
    icon: 'TableOutlined'  // 可根据业务选择合适图标
  }
}
```

## 注意事项

- `useGet`、`usePost`、`usePut`、`useDelete`、`ref`、`computed` 等均为**全局自动导入**，不需要 import
- `useMessage()` 也是全局自动导入的
- 只有 `lodash` 的 `cloneDeep`、图标组件（`PlusOutlined` 等）、`useTableQuery`、API 函数、子组件需要显式 import
- 后端 API 路由为复数形式（`products`、`product-categories`）
- `useTableQuery` 的 `queryApi` 期望返回 `{ data: { records: [], total: 0 } }` 格式
- 生成后列出所有创建/修改的文件路径

