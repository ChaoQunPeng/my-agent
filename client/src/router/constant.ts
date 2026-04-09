/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2025-09-25 09:45:23
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2026-04-03 10:53:22
 * @FilePath: /fadu-ai/src/router/constant.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { RouteRecordRaw } from 'vue-router'

export const ROOT_ROUTE_REDIRECT_PATH = '/account/center'
const Layout = () => import('~/layouts/index.vue')

export const rootRoute: RouteRecordRaw = {
  path: '/',
  name: 'rootPath',
  redirect: ROOT_ROUTE_REDIRECT_PATH,
  component: Layout,
  children: []
}
