<template>
  <page-container>
    <a-card>
      <div flex justify-between items-center mb-16>
        <div>
          <h2 text-2xl font-bold>{{ knowledgeBaseName }}</h2>
          <p text-gray-500 mt-2>知识库详情</p>
        </div>
        <a-button type="primary" @click="uploadModalVisible = true">
          <UploadOutlined />
          上传文档
        </a-button>
      </div>

      <a-table
        :loading="loading"
        :columns="documentColumns"
        :data-source="documents"
        :pagination="pagination"
        :scroll="{ x: 'max-content' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'fileName'">
            <span>{{ record.fileName }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'fileSize'">
            <span>{{ formatFileSize(record.fileSize) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'uploadTime'">
            <span>{{ formatDate(record.uploadTime) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'uploader'">
            <span>{{ record.uploader }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <div flex gap-2>
              <a @click="downloadDocument(record)">下载</a>
              <a-divider type="vertical" />
              <a c-error @click="deleteDocument(record)">删除</a>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 上传文档弹窗 -->
    <a-modal
      v-model:open="uploadModalVisible"
      title="上传文档"
      :confirm-loading="uploading"
      @ok="handleUpload"
      @cancel="resetUploadForm"
    >
      <a-form :model="uploadForm" layout="vertical">
        <a-form-item label="选择文件" required>
          <a-upload-dragger
            v-model:file-list="fileList"
            :before-upload="beforeUpload"
            :multiple="true"
          >
            <button type="button" class="p-6 w-full">
              <p class="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p class="ant-upload-hint">支持单个或批量上传，允许的文件格式：PDF、DOC、DOCX、TXT</p>
            </button>
          </a-upload-dragger>
        </a-form-item>
      </a-form>
    </a-modal>
  </page-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { InboxOutlined, UploadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

defineOptions({
  name: 'KnowledgeBaseDetail'
})

const router = useRouter()

// 获取路由参数中的知识库ID
const knowledgeBaseId = router.currentRoute.value.params.id
const knowledgeBaseName = ref('法律条款知识库')

const loading = ref(false)
const uploading = ref(false)
const uploadModalVisible = ref(false)

// 上传表单
const uploadForm = ref({
  files: []
})
const fileList = ref([])

// 文档列表
const documents = ref([
  {
    id: '1',
    fileName: '合同法条款.docx',
    fileSize: 1024000,
    uploadTime: '2023-06-15T10:30:00Z',
    uploader: '张三'
  },
  {
    id: '2',
    fileName: '公司规章制度.pdf',
    fileSize: 2048000,
    uploadTime: '2023-06-16T14:45:00Z',
    uploader: '李四'
  },
  {
    id: '3',
    fileName: '劳动法摘要.txt',
    fileSize: 512000,
    uploadTime: '2023-06-17T09:15:00Z',
    uploader: '王五'
  }
])

// 表格列定义
const documentColumns = [
  {
    title: '文件名',
    dataIndex: 'fileName',
    width: 200
  },
  {
    title: '文件大小',
    dataIndex: 'fileSize',
    width: 120
  },
  {
    title: '上传时间',
    dataIndex: 'uploadTime',
    width: 200
  },
  {
    title: '上传人',
    dataIndex: 'uploader',
    width: 120
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 150
  }
]

// 分页配置
const pagination = {
  pageSize: 10,
  current: 1,
  total: 3,
  showTotal: (total: number) => `共 ${total} 条记录`,
  showSizeChanger: true,
  showQuickJumper: true
}

// 格式化文件大小
const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`
  } else {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

// 上传前检查
const beforeUpload = (file: File) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
  
  const isAllowedType = allowedTypes.includes(file.type)
  if (!isAllowedType) {
    message.error('只能上传 PDF、DOC、DOCX、TXT 格式的文件！')
    return false
  }
  
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    message.error('文件大小不能超过 10MB!')
    return false
  }
  
  return false // 返回false阻止自动上传
}

// 处理上传
const handleUpload = () => {
  if (fileList.value.length === 0) {
    message.warning('请选择要上传的文件')
    return
  }
  
  uploading.value = true
  
  // 模拟上传过程
  setTimeout(() => {
    uploading.value = false
    uploadModalVisible.value = false
    message.success('文件上传成功')
    resetUploadForm()
    
    // 添加新上传的文件到列表（模拟）
    fileList.value.forEach((file: any) => {
      documents.value.unshift({
        id: `${documents.value.length + 1}`,
        fileName: file.name,
        fileSize: file.size,
        uploadTime: new Date().toISOString(),
        uploader: '当前用户'
      })
    })
  }, 1500)
}

// 重置上传表单
const resetUploadForm = () => {
  fileList.value = []
  uploadForm.value = {
    files: []
  }
}

// 下载文档
const downloadDocument = (record: any) => {
  message.info(`开始下载文件: ${record.fileName}`)
  // 实际项目中这里会调用下载接口
}

// 删除文档
const deleteDocument = (record: any) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除文件 "${record.fileName}" 吗？此操作不可恢复。`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 实际项目中这里会调用删除接口
        message.success('文件删除成功')
        
        // 从列表中移除
        const index = documents.value.findIndex(doc => doc.id === record.id)
        if (index > -1) {
          documents.value.splice(index, 1)
        }
      } catch (error) {
        message.error('删除失败: ' + error)
      }
    }
  })
}
</script>

<style scoped>
/* 可以添加一些自定义样式 */
</style>