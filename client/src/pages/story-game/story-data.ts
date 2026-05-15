export interface StoryState {
  hp: number
  gold: number
  inventory: string[]
  flags: Record<string, boolean | number>
}

export interface StoryOption {
  text: string
  nextId: string
  condition?: (state: StoryState) => boolean
  action?: (state: StoryState) => void
}

export interface StoryNode {
  id: string
  text: string
  onEnter?: (state: StoryState) => void
  onExit?: (state: StoryState) => void
  options: StoryOption[]
}

export const createInitialState = (): StoryState => ({
  hp: 90,
  gold: 0,
  inventory: [],
  flags: {}
})

export const storyData = new Map<string, StoryNode>([
  /* ------------------ 节点 1：初始房间 ------------------ */
  [
    'start',
    {
      id: 'start',
      text: '你面前有一瓶未知的红浆药水。四周墙壁上火把忽明忽暗，你的身体感到有些虚弱。',
      onEnter: state => {
        state.flags.visitedStart = true
      },
      onExit: state => {
        state.flags.leaveStartCount = Number(state.flags.leaveStartCount || 0) + 1
      },
      options: [
        {
          text: '🧪 喝下药水 (体力+20，获得空药瓶)',
          nextId: 'corridor',
          action: state => {
            state.hp += 20
            state.inventory.push('空药瓶')
          }
        },
        {
          text: '🚶 不喝，直接推门走向走廊',
          nextId: 'corridor'
        }
      ]
    }
  ],

  /* ------------------ 节点 2：走廊 (衍生分支) ------------------ */
  [
    'corridor',
    {
      id: 'corridor',
      text: '走廊里有一个身穿重甲的守卫。他握紧长矛，警惕地盯着你。',
      onEnter: state => {
        state.flags.metGuard = true
      },
      options: [
        {
          text: '⚔️ 迎面战斗 (需体力 > 100)',
          nextId: 'win',
          condition: state => state.hp > 100,
          action: state => {
            state.hp -= 30
            state.gold += 15
          }
        },
        {
          text: '💰 贿赂守卫 (需要 10 金币)',
          nextId: 'win',
          condition: state => state.gold >= 10,
          action: state => {
            state.gold -= 10
          }
        },
        {
          text: '🤫 潜行绕开 (有“隐形斗篷”即可免战)',
          nextId: 'win',
          condition: state => state.inventory.includes('隐形斗篷')
        },
        {
          text: '🏃 溜进旁边的密室 (前往古老遗迹)',
          nextId: 'ruins'
        },
        {
          text: '🔙 慌忙狼狈地逃跑 (体力-5)',
          nextId: 'start',
          action: state => {
            state.hp = Math.max(1, state.hp - 5)
          }
        }
      ]
    }
  ],

  /* ------------------ 节点 3：古老遗迹 (【多选】多重交互数据) ------------------ */
  [
    'ruins',
    {
      id: 'ruins',
      text: '这是一处古老的室内遗迹，中央有一座散发着微光的哥特祭坛，角落里还有一具散落的骸骨。你可以仔细搜寻这里。',
      options: [
        {
          // 多选操作 A：搜刮骸骨（只能搜刮一次）
          text: '💀 搜查角落的骸骨 (可重复触发检查)',
          nextId: 'ruins',
          condition: state => !state.flags.ruinsSearched,
          action: state => {
            state.flags.ruinsSearched = true
            state.gold += 25
            state.inventory.push('生锈的铁剑')
          }
        },
        {
          // 多选操作 B：向祭坛祈祷
          text: '🙏 触摸微光祭坛 (体力+15，消耗空药瓶)',
          nextId: 'ruins',
          condition: state => state.inventory.includes('空药瓶') && !state.flags.altarActivated,
          action: state => {
            state.flags.altarActivated = true
            state.hp += 15
            // 移除一个空药瓶
            const idx = state.inventory.indexOf('空药瓶')
            if (idx > -1) state.inventory.splice(idx, 1)
          }
        },
        {
          // 离开多选区域，前往单选区域
          text: '🚪 搜刮完毕，推开深处的铁门',
          nextId: 'merchant'
        }
      ]
    }
  ],

  /* ------------------ 节点 4：黑市商人 (【单选】条件排他数据) ------------------ */
  [
    'merchant',
    {
      id: 'merchant',
      text: '一个兜帽蒙面的地牢商人坐在火堆旁。“嘿，旅行者。看看我的尖货，但你只能选一个，概不赊账。”',
      options: [
        {
          // 单选 A：金币充足时可见/可选
          text: '🛒 购买 隐形斗篷 (需要 20 金币)',
          nextId: 'corridor',
          condition: state => state.gold >= 20 && !state.inventory.includes('隐形斗篷'),
          action: state => {
            state.gold -= 20
            state.inventory.push('隐形斗篷')
          }
        },
        {
          // 单选 B：用武器交换
          text: '🔄 用 生锈的铁剑 换取 镀金盾牌 (体力最大值增幅感官)',
          nextId: 'corridor',
          condition: state => state.inventory.includes('生锈的铁剑') && !state.inventory.includes('镀金盾牌'),
          action: state => {
            const idx = state.inventory.indexOf('生锈的铁剑')
            if (idx > -1) state.inventory.splice(idx, 1)
            state.inventory.push('镀金盾牌')
            state.hp += 10
          }
        },
        {
          // 单选 C：穷困潦倒或不想购买时的保底离开选项
          text: '👋 纯粹路过，什么都不买直接离开',
          nextId: 'corridor'
        }
      ]
    }
  ],

  /* ------------------ 节点 5：胜利结局 ------------------ */
  [
    'win',
    {
      id: 'win',
      text: '祝贺你！你越过了守卫，拿到了领主的黄金钥匙，成功逃离了这片阴暗的地下城！',
      onEnter: state => {
        state.flags.gameFinished = true
        state.inventory.push('地下城钥匙')
      },
      options: [
        {
          text: '🔄 再次挑战（重置游戏）',
          nextId: 'start',
          action: state => {
            state.hp = 90
            state.gold = 0
            state.inventory.length = 0
            state.flags = {}
          }
        }
      ]
    }
  ]
])
