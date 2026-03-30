<!--
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2025-09-25 09:45:23
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2025-10-16 14:33:11
 * @FilePath: /fadu-ai/src/layouts/components/global-footer/index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { CopyrightCircleOutlined } from '@ant-design/icons-vue';

defineOptions({
  name: 'GlobalFooter'
});

defineProps<{
  copyright?: string;
  icp?: string;
}>();

const prefixCls = shallowRef('ant-pro-global-footer');
</script>

<template>
  <!-- <div :class="prefixCls">
    <div v-if="$slots.renderFooterLinks" :class="`${prefixCls}-links`">
      <slot name="renderFooterLinks" />
    </div>
    <div v-if="copyright" :class="`${prefixCls}-copyright`">
      <a v-if="icp" href="https://beian.miit.gov.cn/" target="_blank">{{ icp }}</a>
      <CopyrightCircleOutlined /> {{ copyright }}
    </div>
  </div> -->
</template>

<style lang="less">
@import 'index';
</style>
