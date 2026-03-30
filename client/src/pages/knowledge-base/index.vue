<template>
  <div p-24>
    <a-card mb-12>
      <a-form :label-col="{ span: 7 }" :model="formModel">
        <a-row :gutter="[15, 0]">
          <a-col :span="8">
            <a-form-item name="name" label="项目名称">
              <a-input v-model:value="formModel.name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item name="desc" label="描述">
              <a-input v-model:value="formModel.desc" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item name="creator" label="创建人">
              <a-input v-model:value="formModel.creator" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row v-if="expand" :gutter="[15, 0]">
          <a-col :span="8">
            <a-form-item name="createdAt" label="创建时间">
              <a-date-picker v-model:value="formModel.createdAt" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :span="24" style="text-align: right">
          <a-col :span="24">
            <a-space flex justify-end w-full>
              <a-button :loading="loading" type="primary" @click="onSearch"> 查询 </a-button>
              <a-button :loading="loading" @click="onReset"> 重置 </a-button>
              <a-button type="link" @click="expand = !expand">
                {{ expand ? '收起' : '展开' }}
                <UpOutlined v-if="expand" />
                <DownOutlined v-else />
              </a-button>
            </a-space>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card title="项目列表">
      <template #extra>
        <a-space size="middle">
          <a-tooltip title="刷新">
            <ReloadOutlined @click="onSearch" />
          </a-tooltip>
          <a-tooltip title="密度">
            <a-dropdown trigger="click">
              <ColumnHeightOutlined />
              <template #overlay>
                <a-menu
                  v-model:selected-keys="tableSize"
                  :items="sizeItems"
                  @click="handleSizeChange"
                />
              </template>
            </a-dropdown>
          </a-tooltip>
          <a-tooltip title="列设置">
            <a-dropdown v-model:open="dropdownVisible" trigger="click">
              <SettingOutlined />
              <template #overlay>
                <a-card>
                  <template #title>
                    <a-checkbox
                      v-model:checked="state.checkAll"
                      :indeterminate="state.indeterminate"
                      @change="handleCheckAllChange"
                    >
                      列选择
                    </a-checkbox>
                  </template>
                  <template #extra>
                    <a-button type="link" @click="handleResetChange"> 重置 </a-button>
                  </template>
                  <a-checkbox-group
                    v-model:value="state.checkList"
                    :options="options"
                    style="display: flex; flex-direction: column"
                    @change="handleCheckChange"
                  />
                </a-card>
              </template>
            </a-dropdown>
          </a-tooltip>
        </a-space>
      </template>

      <a-table
        :loading="loading"
        :columns="filterColumns"
        :data-source="dataSource"
        :pagination="pagination"
        :size="resolveTableSize"
      >
        <template #bodyCell="scope">
          <template v-if="scope?.column?.dataIndex === 'name'">
            <a @click="viewDetail(scope?.record?.id)">{{ scope.text }}</a>
          </template>
          <template v-else-if="scope?.column?.dataIndex === 'capacity'">
            <div gap-2>
              {{ formatCapacity(scope?.text) }}
            </div>
          </template>
          <template v-else-if="scope?.column?.dataIndex === 'action'">
            <div flex gap-2>
              <a @click="viewDetail(scope?.record?.id)">查看</a>
              <a-divider type="vertical" />
              <a c-error @click="handleDelete(scope?.record as AgentModel)"> 删除 </a>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 知识库详情抽屉 -->
    <KnowledgeBaseDetailDrawer
      :visible="drawerVisible"
      :knowledge-base-id="currentKnowledgeBaseId"
      @update:visible="drawerVisible = $event"
      @close="handleDrawerClose"
    />
  </div>
</template>

<script setup lang="ts">
import type { MenuProps, PaginationProps, TableProps } from 'ant-design-vue';
import type { Ref } from 'vue';
import {
  ColumnHeightOutlined,
  DownOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  UpOutlined
} from '@ant-design/icons-vue';
import { Modal } from 'ant-design-vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import KnowledgeBaseDetailDrawer from './detail-drawer.vue';

defineOptions({
  name: 'AgentList'
});

interface AgentModel {
  id: number;
  name: string;
  capacity: number;
  desc: string;
  createdAt: string;
  creator: string;
}

interface AgentParams {
  name?: string;
  desc?: string;
  creator?: string;
  createdAt?: string;
}

const router = useRouter();

// 格式化容量显示
const formatCapacity = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const message = useMessage();
const columns = shallowRef([
  {
    title: '项目名称',
    dataIndex: 'name'
  },
  {
    title: '知识容量',
    dataIndex: 'capacity',
    width: 120
  },
  {
    title: '描述',
    dataIndex: 'desc'
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 200
  },
  {
    title: '创建人',
    dataIndex: 'creator',
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
  total: 100,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: total => `总数据位：${total}`,
  onChange(current, pageSize) {
    pagination.pageSize = pageSize;
    pagination.current = current;
    init();
  }
});

const dataSource = shallowRef<AgentModel[]>([]);

const formModel = reactive<AgentParams>({
  name: undefined,
  desc: undefined,
  creator: undefined,
  createdAt: undefined
});

const tableSize = ref<string[]>(['middle']);
const sizeItems = ref<MenuProps['items']>([
  {
    key: 'large',
    label: '默认',
    title: '默认'
  },
  {
    key: 'middle',
    label: '中等',
    title: '中等'
  },
  {
    key: 'small',
    label: '紧凑',
    title: '紧凑'
  }
]);
const options = computed(() => {
  return columns.value.map(item => {
    if (item.dataIndex === 'action') {
      return {
        label: item.title,
        value: item.dataIndex,
        disabled: true
      };
    }
    return {
      label: item.title,
      value: item.dataIndex
    };
  });
});
const dropdownVisible = ref(false);
const getCheckList = computed(() => columns.value.map(item => item.dataIndex));
const state = reactive({
  indeterminate: false,
  checkAll: true,
  checkList: getCheckList.value
});

const resolveTableSize = computed(() => {
  return tableSize.value[0] as TableProps['size'];
});

// 抽屉相关状态
const drawerVisible = ref(false);
const currentKnowledgeBaseId = ref<number | string | null>(null);

async function init() {
  if (loading.value) return;
  loading.value = true;
  try {
    // 实际项目中这里会调用API获取数据
    // const { data } = await getListApi({
    //   ...formModel,
    //   current: pagination.current,
    //   pageSize: pagination.pageSize
    // });
    // dataSource.value = data ?? [];

    // 暂时使用模拟数据
    dataSource.value = [
      {
        id: 1,
        name: '法律咨询项目',
        capacity: 10240000,
        desc: '提供法律咨询服务的项目',
        createdAt: '2023-06-01 10:00:00',
        creator: '张三'
      },
      {
        id: 2,
        name: '财务分析项目',
        capacity: 5120000,
        desc: '提供财务数据分析服务的项目',
        createdAt: '2023-06-05 14:30:00',
        creator: '李四'
      },
      {
        id: 3,
        name: '客服助手项目',
        capacity: 2048000,
        desc: '提供客户服务支持的项目',
        createdAt: '2023-06-10 09:15:00',
        creator: '王五'
      }
    ];
  } catch (e) {
    console.log(e);
  } finally {
    loading.value = false;
  }
}

async function onSearch() {
  pagination.current = 1;
  await init();
}

async function onReset() {
  // 清空所有参数重新请求
  formModel.name = undefined;
  formModel.desc = undefined;
  formModel.creator = undefined;
  await init();
}

/**
 * 删除功能
 *  @param record
 *
 */
async function handleDelete(record: AgentModel) {
  const close = message.loading('删除中......');
  try {
    // 实际项目中这里会调用API删除数据
    // const res = await deleteApi(record!.id);
    // if (res.code === 200) await init();
    message.success('删除成功');

    // 本地模拟删除数据
    const index = dataSource.value.findIndex(item => item.id === record.id);
    if (index > -1) {
      dataSource.value.splice(index, 1);
    }
  } catch (e) {
    console.log(e);
    message.error('删除失败');
  } finally {
    close();
  }
}

/**
 * 查看详情
 */
function viewDetail(id: number) {
  currentKnowledgeBaseId.value = id;
  drawerVisible.value = true;
}

/**
 * 处理抽屉关闭
 */
function handleDrawerClose() {
  currentKnowledgeBaseId.value = null;
}

/**
 * 密度切换
 *
 */
const handleSizeChange: MenuProps['onClick'] = e => {
  tableSize.value[0] = e.key as string;
};

/**
 * 过滤
 *
 */
function filterAction(value: string[]) {
  return columns.value.filter(item => {
    if (value.includes(item.dataIndex)) {
      // 为true时，循环遍历的值会暴露出去
      return true;
    }
    return false;
  });
}

// 备份columns
const filterColumns = ref(filterAction(getCheckList.value));

/**
 * 全选/反选事件
 *
 */

function handleCheckAllChange(e: any) {
  Object.assign(state, {
    checkList: e.target.checked ? getCheckList.value : [],
    indeterminate: true
  });
  filterColumns.value = e.target.checked
    ? filterAction(getCheckList.value)
    : filterColumns.value.filter(item => item.dataIndex === 'action');
}

watch(
  () => state.checkList,
  val => {
    state.indeterminate = !!val.length && val.length < getCheckList.value.length;
    state.checkAll = val.length === getCheckList.value.length;
  }
);

/**
 * 重置事件
 *
 */
function handleResetChange() {
  state.checkList = getCheckList.value;
  filterColumns.value = filterAction(getCheckList.value);
}

/**
 * checkbox点击事件
 *
 */
function handleCheckChange(value: any) {
  const filterValue = filterAction(value);
  filterColumns.value = filterValue;
}

onMounted(() => {
  init();
});

const expand = ref(false);
</script>
