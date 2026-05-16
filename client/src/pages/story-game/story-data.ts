export interface StoryState {
  hp: number // 此时的 hp 更像“理智值/生命体征”
  gold: number // 此时的 gold 换成“铜质筹码/血钱”
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

// 初始状态：你一无所有，而且一醒来就已经处于危险的虚弱状态
export const createInitialState = (): StoryState => ({
  hp: 90,
  gold: 0,
  inventory: [],
  flags: {}
})

export const storyData = new Map<string, StoryNode>([
  /* ------------------ 节点 1：初始房间（诡异的苏醒） ------------------ */
  [
    'start',
    {
      id: 'start',
      text: '你在冰冷的解剖台上醒来。空气中弥漫着福尔马林和铁锈的死味。墙上的煤气灯发出类似人类喘息的嘶嘶声。你发现无名指被切断了，但奇怪的是，台面上放着一瓶还在微微温热的、颜色像人血一样的“暗红药水”。',
      onEnter: state => {
        state.flags.visitedStart = true
      },
      onExit: state => {
        // 记录你在这个噩梦房间循环了多少次
        state.flags.leaveStartCount = Number(state.flags.leaveStartCount || 0) + 1
      },
      options: [
        {
          text: '别无选择，一口喝下那瓶温热的血液药水 (痛觉麻木，精神恢复，留下空试管)',
          nextId: 'corridor',
          action: state => {
            state.hp += 20
            state.inventory.push('空试管')
          }
        },
        {
          text: '强忍着伤口和眩晕，不碰来路不明的东西，推开沉重的铁门走向走廊',
          nextId: 'corridor'
        }
      ]
    }
  ],

  /* ------------------ 节点 2：走廊 (潜伏的梦魇) ------------------ */
  [
    'corridor',
    {
      id: 'corridor',
      text: '幽暗的走廊深处，站着一个两米高、没有面孔的“高大畸形人”。他手里拖着一把巨大的碎骨锤，虽然没有眼睛，但他那畸形抽搐的脖子似乎正死死“盯着”你这个方向。',
      onEnter: state => {
        state.flags.metGuard = true
      },
      options: [
        {
          // 惊悚改动：需要极高的理智/生命值才敢正面冲过去
          text: '赌一把！从他身边强行冲过去 (需精神意志 > 100)',
          nextId: 'win',
          condition: state => state.hp > 100,
          action: state => {
            state.hp -= 30 // 被锤风扫中，代价惨痛
            state.gold += 15 // 从他身上掉落的沾血筹码
          }
        },
        {
          // 惊悚改动：这里的金币变成了用来买命的冥币/死人筹码
          text: '扔出死人筹码制造声响，引开畸形人 (需要 10 枚铜质筹码)',
          nextId: 'win',
          condition: state => state.gold >= 10,
          action: state => {
            state.gold -= 10
          }
        },
        {
          text: '披上那件散发着尸臭的“剥皮雨衣”，屏住呼吸潜行绕开',
          nextId: 'win',
          condition: state => state.inventory.includes('剥皮雨衣')
        },
        {
          text: '惊恐之下，你慌不择路地推开一扇侧门，滑入了黑漆漆的地下排水废墟',
          nextId: 'ruins'
        },
        {
          text: '恐惧战胜了理智，你尖叫着逃回刚才醒来的解剖室 (惊恐导致大汗淋漓，体力-5)',
          nextId: 'start',
          action: state => {
            state.hp = Math.max(1, state.hp - 5)
          }
        }
      ]
    }
  ],

  /* ------------------ 节点 3：地下废墟 (【多选】令人毛骨悚然的发现) ------------------ */
  [
    'ruins',
    {
      id: 'ruins',
      text: '这里是古老的地下排水淤泥区。恶臭扑鼻。正中央伫立着一座用无数人类头骨堆砌成的“狂热祭坛”，角落里躺着一具刚死不久、死状极度惊恐的尸体……等一下，他的衣服为什么和你一模一样？',
      options: [
        {
          // 搜刮骸骨 -> 搜查“自己”的尸体
          text: '💀 忍着强烈的反胃，搜查那具诡异的、和自己一模一样的尸体',
          nextId: 'ruins',
          condition: state => !state.flags.ruinsSearched,
          action: state => {
            state.flags.ruinsSearched = true
            state.gold += 25 // 钱包里竟然有你失踪的刻字筹码
            state.inventory.push('沾血的解剖刀')
          }
        },
        {
          // 祭坛祈祷 -> 邪恶仪式的献祭
          text: '🩸 将自己的血液接入空试管，供奉给头骨祭坛 (以血换取虚假的狂热，体力+15)',
          nextId: 'ruins',
          condition: state => state.inventory.includes('空试管') && !state.flags.altarActivated,
          action: state => {
            state.flags.altarActivated = true
            state.hp += 15
            // 消耗掉空试管
            const idx = state.inventory.indexOf('空试管')
            if (idx > -1) state.inventory.splice(idx, 1)
          }
        },
        {
          text: '🚪 这里太诡异了，一刻也不想多呆，推开角落写着“出口”的生锈铁门',
          nextId: 'merchant'
        }
      ]
    }
  ],

  /* ------------------ 节点 4：无脸商贩 (【单选】与魔鬼的恶心交易) ------------------ */
  [
    'merchant',
    {
      id: 'merchant',
      text: '黑暗中亮起一堆绿色的鬼火。一个用绷带把整个脑袋缠死、只留出一只巨大黄色复眼的怪人坐在那里。“嘿……又是新来的小老鼠。我这里有能让你活命的好东西，但规则就是规则：你只能带走一样，别想贪心。”',
      options: [
        {
          text: '🛒 购买 剥皮雨衣 (能掩盖活人气息的恶臭雨衣，需要 20 筹码)',
          nextId: 'corridor',
          condition: state => state.gold >= 20 && !state.inventory.includes('剥皮雨衣'),
          action: state => {
            state.gold -= 20
            state.inventory.push('剥皮雨衣')
          }
        },
        {
          text: '🔄 交出 沾血的解剖刀，换取 畸形怪面具 (戴上它能让你产生幻觉，忘却痛苦，hp+10)',
          nextId: 'corridor',
          condition: state => state.inventory.includes('沾血的解剖刀') && !state.inventory.includes('畸形怪面具'),
          action: state => {
            const idx = state.inventory.indexOf('沾血的解剖刀')
            if (idx > -1) state.inventory.splice(idx, 1)
            state.inventory.push('畸形怪面具')
            state.hp += 10
          }
        },
        {
          text: '👋 他的复眼让你浑身发毛，你什么都不敢买，低着头匆匆回到了走廊',
          nextId: 'corridor'
        }
      ]
    }
  ],

  /* ------------------ 节点 5：逃出生天？（细思极恐的结局） ------------------ */
  [
    'win',
    {
      id: 'win',
      text: '你终于越过了那个可怕的怪物！你用沾满鲜血的手拧开了疯人院最深处的沉重铁门。刺眼的阳光洒在脸上，你逃出来了！……等等，为什么外面的街道空无一人？为什么你的右手，不知何时也少了一根无名指？',
      onEnter: state => {
        state.flags.gameFinished = true
        state.inventory.push('未知病院的病历本')
      },
      options: [
        {
          text: '噩梦重塑……（再次醒来，直面轮回）',
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
