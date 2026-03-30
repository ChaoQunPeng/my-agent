/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2025-09-25 09:45:23
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2025-10-17 13:25:31
 * @FilePath: /fadu-ai/src/config/default-setting.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { LayoutSetting } from '~@/stores/app';

export default {
  title: '项目管理系统',
  theme: 'light',
  logo: '/logo.svg',
  collapsed: false,
  drawerVisible: false,
  colorPrimary: '#1677FF',
  layout: 'side',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixedSider: true,
  splitMenus: false,
  header: true,
  menu: true,
  watermark: false,
  menuHeader: true,
  footer: false,
  colorWeak: false,
  colorGray: false,
  multiTab: false,
  multiTabFixed: false,
  keepAlive: true,
  accordionMode: false,
  leftCollapsed: true,
  compactAlgorithm: false,
  headerHeight: 48,
  copyright: 'Antdv Pro Team 2023',
  animationName: 'slide-fadein-right'
} as LayoutSetting;

export const animationNameList = [
  {
    label: 'None',
    value: 'none'
  },
  {
    label: 'Fadein Up',
    value: 'slide-fadein-up'
  },
  {
    label: 'Fadein Right',
    value: 'slide-fadein-right'
  },
  {
    label: 'Zoom Fadein',
    value: 'zoom-fadein'
  },
  {
    label: 'Fadein',
    value: 'fadein'
  }
];
export type AnimationNameValueType =
  | 'none'
  | 'slide-fadein-up'
  | 'slide-fadein-right'
  | 'zoom-fadein'
  | 'fadein';
