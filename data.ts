/** @type {Map<string, StoryNode>} */
export const storyData = new Map([
  [
    'start',
    {
      id: 'start',
      text: '你面前有一瓶药水。你的体力现在很低。',
      onEnter: state => {
        // 生命周期示例：进入初始房间时写入剧情标记并输出日志。
        state.flags.visitedStart = true
        console.log('进入了初始房间')
      },
      onExit: state => {
        // 生命周期示例：离开初始房间时记录离开次数。
        state.flags.leaveStartCount = (state.flags.leaveStartCount || 0) + 1
      },
      options: [
        {
          text: '喝下药水',
          nextId: 'corridor',
          action: state => {
            // action 示例：点击后先修改全局状态，再进入下一个节点。
            state.hp += 20
            state.inventory.push('空药瓶')
          }
        },
        {
          text: '不喝直接走',
          nextId: 'corridor'
        }
      ]
    }
  ],
  [
    'corridor',
    {
      id: 'corridor',
      text: '走廊里有一个守卫。他握紧长矛，警惕地盯着你。',
      onEnter: state => {
        // 生命周期示例：首次进入走廊时设置遇到守卫的剧情开关。
        state.flags.metGuard = true
      },
      options: [
        {
          text: '战斗',
          nextId: 'win',
          condition: state => state.hp > 100,
          action: state => {
            // action 示例：战斗会消耗体力并获得金币。
            state.hp -= 30
            state.gold += 15
          }
        },
        {
          text: '逃跑',
          nextId: 'start',
          action: state => {
            // action 示例：逃跑有代价，避免选择毫无后果。
            state.hp = Math.max(1, state.hp - 5)
          }
        }
      ]
    }
  ],
  [
    'win',
    {
      id: 'win',
      text: '你击败了守卫，拿到钥匙，成功走出了地下城。',
      onEnter: state => {
        // 生命周期示例：胜利节点只负责写入最终剧情状态。
        state.flags.gameFinished = true
        state.inventory.push('地下城钥匙')
      },
      options: [
        {
          text: '重新开始',
          nextId: 'start',
          action: state => {
            // 示例数据内的重开动作：重置关键状态，保留引擎逻辑不变。
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
