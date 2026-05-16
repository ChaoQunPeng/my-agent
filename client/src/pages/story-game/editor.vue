<template>
  <main class="story-editor-page">
    <aside class="editor-side">
      <header class="side-head">
        <p class="eyebrow">STORY FLOW</p>
        <h1>诡异剧情编辑器</h1>
      </header>

      <section class="field-block">
        <label class="field-label" for="node-id">当前节点 ID (严禁重复)</label>
        <input id="node-id" v-model.trim="nodeDraft.id" class="field-input" type="text" @focus="rememberNodeId" @change="applyNodeDraft" />
      </section>

      <section class="field-block">
        <label class="field-label" for="node-title">剧情简述 (节点显示)</label>
        <input id="node-title" v-model.trim="nodeDraft.title" class="field-input" type="text" @input="applyNodeDraft" />
      </section>

      <section class="field-block">
        <label class="field-label" for="next-node">创建分支选项</label>
        <div class="inline-fields">
          <select id="next-node" v-model="nextNodeId" class="field-select">
            <option v-for="node in nodes" :key="node.id" :value="node.id">{{ node.id }}</option>
          </select>
          <button class="tool-button" type="button" @click="addEdgeToSelected">连接</button>
        </div>
      </section>

      <section class="field-block">
        <div class="field-label">由此节点引出的分支</div>
        <div class="edge-list-wrapper">
          <div v-for="edge in selectedEdges" :key="edge.id" class="edge-pill-box">
            <span class="target-tag">👉 {{ edge.target }}</span>
            <input v-model="edge.label" class="edge-label-input" placeholder="输入选项文字(如: 喝下药水)" />
            <button class="remove-edge-btn" type="button" @click="removeEdge(edge.id)">✕</button>
          </div>
        </div>
        <p v-if="selectedEdges.length === 0" class="empty-text">该节点目前是死胡同。</p>
      </section>

      <div class="side-actions">
        <button class="action-button" type="button" @click="addNode">👻 惊悚节点</button>
        <button class="action-button primary-action" type="button" @click="layoutNodes">🔮 智能排布</button>
      </div>
    </aside>

    <section class="flow-panel">
      <VueFlow
        v-model:edges="edges"
        v-model:nodes="nodes"
        class="story-flow"
        :default-edge-options="defaultEdgeOptions"
        :fit-view-on-init="true"
        :min-zoom="0.2"
        :max-zoom="1.5"
        @connect="onConnect"
        @node-click="onNodeClick"
      >
        <Background pattern-color="#222" :gap="20" />
        <Controls />
      </VueFlow>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MarkerType, VueFlow, addEdge, type Connection, type Edge, type Node, type NodeMouseEvent } from '@vue-flow/core'
import { storyData } from './story-data'

interface StoryNodeData extends Record<string, unknown> {
  title: string
}

const getTitleFromText = (text: string) => {
  const title = text.split(/[。！？.!?]/)[0] || text
  return title.length > 14 ? `${title.slice(0, 14)}...` : title
}

const sourceNodes = Array.from(storyData.values())
const nodeDraft = reactive({ id: '', title: '' })
const selectedNodeId = ref(sourceNodes[0]?.id || '')
const nodeIdBeforeEdit = ref(selectedNodeId.value)
const nextNodeId = ref(selectedNodeId.value)

// 优化1：计算合理的网格初始位置（悬疑流向一般从左到右或从上到下）
const nodes = ref<Node<StoryNodeData>[]>(
  sourceNodes.map((node, index) => {
    // 专门让特殊的结局节点变色
    const isWinNode = node.id === 'win' || node.id.includes('end')
    return {
      id: node.id,
      type: 'default',
      class: isWinNode ? 'end-node-style' : 'story-node-style',
      position: {
        x: 80 + index * 240, // 从左往右一字蛇形排开，避免重叠
        y: 150 + (index % 2) * 180
      },
      data: {
        label: getTitleFromText(node.text),
        title: getTitleFromText(node.text)
      }
    }
  })
)

// 优化2：提取真实的 options.text 作为连线上的标签
const edges = ref<Edge[]>(
  sourceNodes.flatMap(node =>
    node.options.map((option, index) => ({
      id: `${node.id}-${option.nextId}-${index}`,
      source: node.id,
      target: option.nextId,
      label: option.text.length > 12 ? option.text.slice(0, 12) + '...' : option.text
    }))
  )
)

// 优化3：改用 SmoothStep (直角折线)，并给予悬疑色调。折线在复杂连线中比曲线清晰 10 倍
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#882222' // 猩红箭头
  },
  style: {
    stroke: '#443333', // 暗红线段
    strokeWidth: 2
  }
}

const selectedNode = computed(() => nodes.value.find(node => node.id === selectedNodeId.value) || nodes.value[0])
const selectedEdges = computed(() => edges.value.filter(edge => edge.source === selectedNode.value?.id))

watch(
  selectedNode,
  node => {
    if (!node) return
    nodeDraft.id = node.id
    nodeDraft.title = node.data?.title || node.id
    nodeIdBeforeEdit.value = node.id
    nextNodeId.value = node.id
  },
  { immediate: true }
)

const rememberNodeId = () => {
  nodeIdBeforeEdit.value = selectedNode.value.id
}

const applyNodeDraft = () => {
  const node = selectedNode.value
  if (!node) return

  const oldId = nodeIdBeforeEdit.value
  const normalizedId = nodeDraft.id || `node_${Date.now()}`
  const hasDuplicate = nodes.value.some(item => item.id === normalizedId && item.id !== oldId)
  const nextId = hasDuplicate ? `${normalizedId}_${nodes.value.length + 1}` : normalizedId

  node.id = nextId
  node.data = {
    ...node.data,
    label: nodeDraft.title || nextId,
    title: nodeDraft.title || nextId
  }

  if (oldId && oldId !== nextId) {
    edges.value = edges.value.map(edge => ({
      ...edge,
      id: edge.id.replace(oldId, nextId),
      source: edge.source === oldId ? nextId : edge.source,
      target: edge.target === oldId ? nextId : edge.target
    }))
  }

  selectedNodeId.value = nextId
  nodeDraft.id = nextId
  nodeIdBeforeEdit.value = nextId
}

const onNodeClick = (event: NodeMouseEvent) => {
  selectedNodeId.value = event.node.id
}

const onConnect = (connection: Connection) => {
  if (!connection.source || !connection.target) return
  edges.value = addEdge(
    {
      ...connection,
      id: `${connection.source}-${connection.target}-${Date.now()}`,
      label: '新选择分支',
      type: 'smoothstep'
    },
    edges.value
  ) as Edge[]
}

const addEdgeToSelected = () => {
  const node = selectedNode.value
  if (!node || !nextNodeId.value) return
  if (edges.value.some(edge => edge.source === node.id && edge.target === nextNodeId.value)) return

  edges.value = addEdge(
    {
      id: `${node.id}-${nextNodeId.value}-${Date.now()}`,
      source: node.id,
      target: nextNodeId.value,
      label: '新选择分支',
      type: 'smoothstep'
    },
    edges.value
  ) as Edge[]
}

const removeEdge = (edgeId: string) => {
  edges.value = edges.value.filter(edge => edge.id !== edgeId)
}

const addNode = () => {
  const index = nodes.value.length + 1
  const id = `room_${index}`
  nodes.value.push({
    id,
    type: 'default',
    class: 'story-node-style',
    position: { x: 100 + index * 60, y: 200 + (index % 3) * 60 },
    data: {
      label: `未命名惊悚房间 ${index}`,
      title: `未命名惊悚房间 ${index}`
    }
  })
  selectedNodeId.value = id
}

// 优化4：智能拓扑阶梯排布（告别凌乱的撞车网格）
const layoutNodes = () => {
  const levelMap = new Map<string, number>()

  // 寻路算法，计算每个节点在剧情树中的深度
  const calculateLevels = (currentId: string, currentLevel: number) => {
    const currentStored = levelMap.get(currentId) || 0
    if (currentLevel > currentStored) {
      levelMap.set(currentId, currentLevel)
      // 找出当前节点指向的所有子节点
      edges.value.filter(e => e.source === currentId).forEach(e => calculateLevels(e.target, currentLevel + 1))
    }
  }

  // 从 start 节点开始延伸
  calculateLevels('start', 1)

  // 渲染层级列
  const colCounters: Record<number, number> = {}

  nodes.value.forEach(node => {
    const level = levelMap.get(node.id) || 1
    if (!colCounters[level]) colCounters[level] = 0

    node.position = {
      x: level * 280 - 150, // 根据故事线深度往右推
      y: colCounters[level] * 160 + 120 // 同一深度的分支往下排开
    }
    colCounters[level]++
  })
}
</script>

<style scoped>
/* 保持你的优秀暗黑风配色，并进行针对性强化 */
.story-editor-page {
  --bg: #030303;
  --panel: #0a0a0c;
  --panel-2: #121215;
  --line: #222225;
  --text: #e2e2e8;
  --muted: #75757c;
  --accent: #882222; /* 悬疑惊悚标志色：暗红 */

  min-height: 100vh;
  display: grid;
  grid-template-columns: 350px 1fr; /* 稍加宽左栏 */
  background: var(--bg);
  color: var(--text);
  font-family: 'Courier New', Courier, monospace;
}

.editor-side {
  border-right: 1px solid var(--line);
  background: var(--panel);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  max-height: 100vh;
}

.side-head {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--accent);
  font-weight: bold;
  font-size: 11px;
  letter-spacing: 2px;
}

h1 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.5px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  color: var(--muted);
  font-size: 12px;
}

.field-input,
.field-select {
  width: 100%;
  height: 38px;
  border: 1px solid var(--line);
  background: #000;
  color: var(--text);
  padding: 0 10px;
  box-sizing: border-box;
}

.field-input:focus,
.field-select:focus {
  border-color: var(--accent);
  outline: none;
}

.inline-fields {
  display: grid;
  grid-template-columns: 1fr 70px;
  gap: 8px;
}

.tool-button,
.action-button {
  height: 38px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-button:hover,
.action-button:hover {
  border-color: var(--text);
  background: #1c1c22;
}

.primary-action {
  border-color: var(--accent);
  color: #ff9999;
}
.primary-action:hover {
  background: var(--accent);
  color: #fff;
}

/* 丰富分支选项的配置样式 */
.edge-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.edge-pill-box {
  background: #000;
  border: 1px solid var(--line);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-tag {
  font-size: 11px;
  background: #1a1515;
  color: #ff6666;
  padding: 2px 6px;
  border: 1px solid #441111;
  white-space: nowrap;
}

.edge-label-input {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--line);
  color: #fff;
  font-size: 12px;
  padding: 2px 0;
}
.edge-label-input:focus {
  outline: none;
  border-bottom-color: var(--accent);
}

.remove-edge-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
}
.remove-edge-btn:hover {
  color: #ff3333;
}

.side-actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 15px;
}

.flow-panel {
  height: 100vh;
}

.story-flow {
  width: 100%;
  height: 100%;
  background: #050506;
}

/* 节点自定义样式优化 */
:deep(.vue-flow__node-default) {
  width: 190px;
  padding: 12px;
  background: #0f0f12;
  border: 1px solid #25252b;
  color: #ddddde;
  border-radius: 4px;
  font-size: 13px;
  text-align: left;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

:deep(.vue-flow__node-default.selected) {
  border-color: #aa3333 !important;
  box-shadow: 0 0 10px rgba(170, 51, 51, 0.4) !important;
}

/* 专门定制的结局/终点节点样式 */
:deep(.end-node-style) {
  background: #1c1212 !important;
  border-color: #5a1818 !important;
  color: #ff9999 !important;
}

:deep(.vue-flow__edge-path) {
  transition: stroke 0.2s ease;
}

:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke: #aa3333 !important;
  stroke-width: 3px !important;
}

:deep(.vue-flow__edge-textbg) {
  fill: #050506;
  rx: 4; /* 文字背景圆角 */
}

:deep(.vue-flow__edge-text) {
  fill: #998888;
  font-size: 11px;
}

:deep(.vue-flow__handle) {
  background: #555;
  width: 8px;
  height: 8px;
}
:deep(.vue-flow__handle:hover) {
  background: var(--accent);
}
</style>
