<template>
  <div
    v-if="fixedSider"
    :style="{
      width: collapsed ? `${collapsedWidth}px` : `${siderWidth}px`,
      maxWidth: collapsed ? `${collapsedWidth}px` : `${siderWidth}px`,
      minWidth: collapsed ? `${collapsedWidth}px` : `${siderWidth}px`,
      ...siderStyle
    }"
  />
  <a-layout-sider
    v-if="splitMenus ? (selectedMenus ?? []).length > 0 : true"
    :theme="theme === 'inverted' ? 'dark' : 'light'"
    :collapsed="collapsed && !isMobile"
    :trigger="null"
    :collapsed-width="collapsedWidth"
    :width="siderWidth"
    collapsible
    :class="cls"
    :style="siderStyle"
  >
    <div class="ant-pro-sider-logo" :class="logoCls">
      <a>
        <img :src="logo" alt="logo" />
        <h1>项目管理系统</h1>
      </a>
    </div>
    <div class="flex-1 of-x-hidden of-y-auto scrollbar">
      <div class="menu-list">
        <div
          class="menu-item"
          :class="resolveMenuCls('/main/agent')"
          @click="goViews('/main/agent')"
        >
          <RobotOutlined class="mr-2" />
          <span>个人看板</span>
        </div>
        <!-- <div
          class="menu-item"
          :class="resolveMenuCls('/main/knowledge-base')"
          @click="goViews('/main/knowledge-base')"
        >
          <DatabaseOutlined class="mr-2" />
          <span>知识库</span>
        </div> -->
        <div
          class="menu-item"
          :class="resolveMenuCls('/main/my-team')"
          @click="goViews('/main/my-team')"
        >
          <TeamOutlined class="mr-2" />
          <span>我的团队</span>
        </div>
        <div class="mt-12 px-5">
          <a-button type="primary" block> 新建项目 </a-button>
        </div>
      </div>
      <div class="px-5">
        <a-divider style="margin: 24px 0 18px 0"></a-divider>
      </div>
      <Menu />
      <div class="pb-5"></div>
    </div>

    <!-- <div v-if="!isMobile && leftCollapsed" class="w-100% flex-shrink-0 ant-pro-sider-collapsed-button"
      :class="theme === 'inverted' ? 'ant-pro-sider-collapsed-button-inverted' : ''">
      <a-menu class="ant-pro-sider-menu" mode="inline" :theme="theme === 'inverted' ? 'dark' : 'light'"
        :selectable="false" @click="  ?.(!collapsed)">
        <a-menu-item>
          <template #icon>
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </template>
</a-menu-item>
</a-menu>
</div> -->
  </a-layout-sider>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
// import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue';
import { useLayoutState } from '../../basic-layout/context';
import Menu from '../menu/index.vue';
import { RobotOutlined, DatabaseOutlined, TeamOutlined } from '@ant-design/icons-vue';
const router = useRouter();

const { currentRoute } = useCurrentRoute();

const currentRoutePath = ref(currentRoute.value.path);

const {
  collapsed,
  // leftCollapsed,
  // handleCollapsed,
  selectedMenus,
  splitMenus,
  layout,
  logo,
  theme,
  // title,
  collapsedWidth,
  siderWidth,
  headerHeight,
  fixedSider,
  isMobile,
  header
} = useLayoutState();

const prefixCls = shallowRef('ant-pro-sider');

const siderStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    paddingTop: `${layout.value !== 'side' && !isMobile.value ? headerHeight.value : 0}px`,
    transition:
      'background-color 0.3s ease 0s, min-width 0.3s ease 0s, max-width 0.3s cubic-bezier(0.645, 0.045, 0.355, 1) 0s',
    overflow: 'hidden'
  };

  // bugfix https://github.com/antdv-pro/antdv-pro/issues/173
  if (layout.value === 'mix' && header.value === false) style.paddingTop = '0px';

  return style;
});

const cls = computed(() => ({
  [prefixCls.value]: true,
  [`${prefixCls.value}-fixed`]: fixedSider.value,
  [`${prefixCls.value}-layout-${layout.value}`]: !!layout.value
}));

// const showLogo = computed(() => {
//   return (layout.value === 'side' || isMobile.value) && layout.value !== 'mix';
// });

const logoCls = computed(() => {
  return {};
  // return {
  //   'ant-pro-sider-collapsed': collapsed.value && !isMobile.value,
  //   'ant-pro-sider-logo-dark': theme.value === 'inverted',
  // };
});

const resolveMenuCls = computed(() => (path: string) => {
  return {
    active: currentRoutePath.value === path
  };
});

const goViews = (path: string) => {
  router.push({
    path: path
  });
};

watch(currentRoute, data => {
  currentRoutePath.value = data.path;
});
</script>

<style lang="less">
@import './index.less';

.menu-list {
  padding: 4px;

  > .menu-item {
    display: flex;
    height: 40px;
    line-height: 40px;
    cursor: pointer;
    transition: all 0.3s;
    border-radius: 8px;
    padding-left: 24px;
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.06);
    }

    &.active {
      background-color: #e6f4ff;
      color: #1677ff;
    }
  }
}
</style>
