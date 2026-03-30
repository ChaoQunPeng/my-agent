/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2025-09-25 09:45:23
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2025-10-16 14:38:31
 * @FilePath: /fadu-ai/unocss.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
  presetUno
} from 'unocss';
import presetChinese from 'unocss-preset-chinese';
import presetEase from 'unocss-preset-ease';
import antdUnoTheme from './themes/antd-uno-theme.json';

export default defineConfig({
  safelist: ['py-16px', 'pb-16px'],
  theme: {
    ...antdUnoTheme,
    unit: 'px'
  },
  units: ['px'],
  presets: [
    presetWind3({
      unit: 'px'
    }),
    presetAttributify(),
    presetChinese(),
    presetEase(),
    presetTypography(),
    presetIcons({
      scale: 1.2,
      warn: true
    }),
    presetUno({
      // 设置单位为 px
      unit: 'px'
    })
  ],
  rules: [
    // Margin 相关
    [/^m-([\.\d]+)$/, ([_, num]) => ({ margin: `${num}px` })],
    [/^mx-([\.\d]+)$/, ([_, num]) => ({ 'margin-left': `${num}px`, 'margin-right': `${num}px` })],
    [/^my-([\.\d]+)$/, ([_, num]) => ({ 'margin-top': `${num}px`, 'margin-bottom': `${num}px` })],
    [/^mt-([\.\d]+)$/, ([_, num]) => ({ 'margin-top': `${num}px` })],
    [/^mr-([\.\d]+)$/, ([_, num]) => ({ 'margin-right': `${num}px` })],
    [/^mb-([\.\d]+)$/, ([_, num]) => ({ 'margin-bottom': `${num}px` })],
    [/^ml-([\.\d]+)$/, ([_, num]) => ({ 'margin-left': `${num}px` })],

    // Padding 相关
    [/^p-([\.\d]+)$/, ([_, num]) => ({ padding: `${num}px` })],
    [/^px-([\.\d]+)$/, ([_, num]) => ({ 'padding-left': `${num}px`, 'padding-right': `${num}px` })],
    [/^py-([\.\d]+)$/, ([_, num]) => ({ 'padding-top': `${num}px`, 'padding-bottom': `${num}px` })],
    [/^pt-([\.\d]+)$/, ([_, num]) => ({ 'padding-top': `${num}px` })],
    [/^pr-([\.\d]+)$/, ([_, num]) => ({ 'padding-right': `${num}px` })],
    [/^pb-([\.\d]+)$/, ([_, num]) => ({ 'padding-bottom': `${num}px` })],
    [/^pl-([\.\d]+)$/, ([_, num]) => ({ 'padding-left': `${num}px` })]
  ],
  shortcuts: [
    ['flex-center', 'flex items-center justify-center'],
    ['flex-between', 'flex items-center justify-between'],
    ['flex-end', 'flex items-end justify-between']
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()]
});
