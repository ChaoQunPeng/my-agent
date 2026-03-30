<!--
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2025-09-25 09:45:23
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2025-10-17 11:22:17
 * @FilePath: /fadu-ai/src/layouts/components/menu/index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { useLayoutState } from '../../basic-layout/context';
import SubMenu from './sub-menu.vue';

const {
  theme,
  collapsed,
  layout,
  isMobile,
  selectedMenus,
  selectedKeys,
  openKeys,
  handleOpenKeys,
  handleSelectedKeys,
  handleMenuSelect
} = useLayoutState();
const menuTheme = computed(() => {
  if (theme.value === 'inverted') return 'dark';
  return theme.value;
});
</script>

<template>
  <a-menu
    :selected-keys="selectedKeys"
    :open-keys="collapsed ? [] : openKeys"
    :mode="layout === 'top' && !isMobile ? 'horizontal' : 'inline'"
    :theme="menuTheme"
    :collapsed="collapsed"
    class="ant-pro-sider-menu"
    @update:open-keys="handleOpenKeys"
    @update:selected-keys="handleSelectedKeys"
    @select="handleMenuSelect"
  >
    <template v-for="item in selectedMenus">
      <template v-if="!item.hideInMenu">
        <SubMenu :key="item.path" :item="item" />
      </template>
    </template>
  </a-menu>
</template>
