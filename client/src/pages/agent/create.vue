<template>
  <div class="p-24">
    <a-card>
      <template #title>
        <div class="flex items-center">
          <!-- <a-button shape="circle" @click="goBack">
            <ArrowLeftOutlined />
          </a-button> -->
          <span class="ml-4">创建项目</span>
        </div>
      </template>

      <a-form
        ref="formRef"
        :model="formState"
        :label-col="labelCol"
        :wrapper-col="wrapperCol"
        class="mt-6"
      >
        <a-form-item
          label="项目名称"
          name="name"
          :rules="[{ required: true, message: '请输入项目名称' }]"
        >
          <a-input v-model:value="formState.name" placeholder="请输入项目名称" />
        </a-form-item>

        <a-form-item
          label="项目描述"
          name="description"
          :rules="[{ required: true, message: '请输入项目描述' }]"
        >
          <a-textarea
            v-model:value="formState.description"
            placeholder="请输入项目描述"
            :rows="4"
          />
        </a-form-item>

        <a-form-item
          label="知识库选择"
          name="knowledgeBases"
          :rules="[{ required: true, message: '请选择至少一个知识库' }]"
        >
          <a-select
            v-model:value="formState.knowledgeBases"
            mode="multiple"
            placeholder="请选择知识库"
            :options="knowledgeBaseOptions"
          />
        </a-form-item>

        <a-form-item :wrapper-col="{ span: 14, offset: 4 }">
          <a-button type="primary" @click="handleSubmit">提交</a-button>
          <a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';
import { message } from 'ant-design-vue';

defineOptions({
  name: 'AgentCreate'
});

const router = useRouter();

const formRef = ref<FormInstance>();
const labelCol = { span: 4 };
const wrapperCol = { span: 14 };

interface FormState {
  name: string;
  description: string;
  knowledgeBases: number[];
}

const formState = reactive<FormState>({
  name: '',
  description: '',
  knowledgeBases: []
});

// 模拟知识库选项数据
const knowledgeBaseOptions = ref([
  { label: '法律法规库', value: 1 },
  { label: '判例库', value: 2 },
  { label: '合同模板库', value: 3 },
  { label: '法律咨询库', value: 4 }
]);

const handleSubmit = async () => {
  try {
    await formRef.value?.validateFields();
    console.log('表单数据:', formState);
    message.success('创建成功');
    router.push('/main/agent');
  } catch (errorInfo) {
    console.log('验证失败:', errorInfo);
    message.error('请检查表单填写是否正确');
  }
};

const handleReset = () => {
  formRef.value?.resetFields();
};

const goBack = () => {
  router.go(-1);
};
</script>
