import type { RouteRecordRaw } from 'vue-router'
import { AccessEnum } from '~@/utils/constant'
import { basicRouteMap } from './router-modules'

export default [
  // {
  //   path: '/main',
  //   redirect: '',
  //   name: 'Marketplace',
  //   component: basicRouteMap.RouteView,
  //   children: [
  //     {
  //       path: '/dialog',
  //       name: 'DialogIndex',
  //       component: () => import('~/pages/dialog/index.vue'),
  //       meta: {
  //         title: '智能对话'
  //       }
  //     }
  //   ]
  // }
  {
    path: '/dialog',
    name: 'DialogIndex',
    component: () => import('~/pages/dialog/index.vue'),
    meta: {
      title: '智能对话',
      icon: 'MessageOutlined'
    }
  }

  /*
   * 任务管理路由
   */
  ,{
    path: '/task',
    name: 'Task',
    component: () => import('~/pages/task/task-list.vue'),
    meta: {
      title: '任务管理',
      icon: 'CheckSquareOutlined'
    }
  }
] as RouteRecordRaw[]
