/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2025-09-25 09:45:23
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2025-10-17 15:08:45
 * @FilePath: /fadu-ai/src/router/static-routes.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { RouteRecordRaw } from 'vue-router'
import { basicRouteMap } from './router-modules'
const Layout = () => import('~/layouts/index.vue')

export default [
  {
    path: '/login',
    component: () => import('~/pages/common/login.vue'),
    meta: {
      title: '登录'
    }
  },
  {
    path: '/401',
    name: 'Error401',
    component: () => import('~/pages/exception/401.vue'),
    meta: {
      title: '授权已过期'
    }
  },
  {
    path: '/common',
    name: 'LayoutBasicRedirect',
    component: Layout,
    redirect: '/common/redirect',
    children: [
      {
        path: '/common/redirect',
        component: () => import('~/pages/common/route-view.vue'),
        name: 'CommonRedirect',
        redirect: '/redirect',
        children: [
          {
            path: '/redirect/:path(.*)',
            name: 'RedirectPath',
            component: () => import('~/pages/common/redirect.vue')
          }
        ]
      }
    ]
  },
  {
    path: '/:pathMatch(.*)',
    meta: {
      title: '找不到页面'
    },
    component: () => import('~/pages/exception/error.vue')
  }
] as RouteRecordRaw[]
