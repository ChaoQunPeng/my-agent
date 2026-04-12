<template>
  <div
    class="session-item"
    :class="{ active: isActive }"
    @click="handleClick"
  >
    <div class="session-info">
      <div class="session-title">{{ session.title }}</div>
      <div class="session-time">{{ formatTime(session.updatedAt) }}</div>
    </div>
    <div class="session-actions" @click.stop>
      <a-dropdown :trigger="['click']">
        <a-button type="text" size="small" @click.stop>
          <MoreOutlined />
        </a-button>
        <template #overlay>
          <a-menu @click="handleAction">
            <a-menu-item key="edit">
              <EditOutlined /> 编辑
            </a-menu-item>
            <a-menu-item key="delete" danger>
              <DeleteOutlined /> 删除
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MoreOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import type { Session } from '@/api/session'

interface Props {
  session: Session
  isActive?: boolean
}

interface Emits {
  (e: 'click', sessionId: string): void
  (e: 'action', action: string, sessionId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const emit = defineEmits<Emits>()

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1小时，显示分钟
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }

  // 小于24小时，显示小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }

  // 否则显示日期
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 处理点击事件
const handleClick = () => {
  emit('click', props.session.sessionId)
}

// 处理操作菜单点击
const handleAction = (info: any) => {
  emit('action', info.key, props.session.sessionId)
}
</script>

<style scoped lang="less">
.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #e6f7ff;

    .session-actions {
      opacity: 1;
    }
  }

  &.active {
    background: #e6f7ff;
  }

  .session-info {
    flex: 1;
    min-width: 0;

    .session-title {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-time {
      font-size: 12px;
      color: #8c8c8c;
    }
  }

  .session-actions {
    opacity: 0;
    transition: opacity 0.2s;
    margin-left: 8px;
  }
}
</style>
