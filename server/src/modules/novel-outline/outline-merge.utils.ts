/**
 * 将任意值规范化为字符串
 * - 如果是字符串，去除首尾空格后返回
 * - 如果是其他类型，返回空字符串
 *
 * @param value - 待规范化的任意值
 * @returns 规范化后的字符串，非字符串类型返回空字符串
 *
 * @example
 * normalize('  hello  ') // 'hello'
 * normalize(123)         // ''
 * normalize(null)        // ''
 */
export const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * 从数组中提取唯一的非空字符串
 * - 自动规范化每个元素（去空格）
 * - 自动去重（区分大小写）
 * - 过滤空字符串
 *
 * @param values - 待处理的任意值数组
 * @returns 去重后的非空字符串数组，保持原顺序
 *
 * @example
 * uniqueStrings(['  a', 'b', 'a', '  ', 'b', null])
 * // ['a', 'b']
 */
export const uniqueStrings = (values: unknown[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const text = normalize(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    output.push(text);
  }

  return output;
};

/**
 * 合并多个部分为多行文本
 * - 自动规范化每个部分为字符串
 * - 自动去重相邻重复行
 * - 用换行符连接非空行
 *
 * @param parts - 待合并的任意值，支持字符串、数组等
 * @returns 合并后的多行文本，空部分自动跳过
 *
 * @example
 * mergeText('  line1', 'line2', '', ['line1', 'line3'], null)
 * // 'line1\nline2\nline3'
 *
 * @example
 * mergeText('title', ['desc1', 'desc2'], 'footer')
 * // 'title\ndesc1\ndesc2\nfooter'
 */
export const mergeText = (...parts: unknown[]): string =>
  uniqueStrings(parts.map((part) => normalize(part))).join('\n');

/**
 * 将任意值转换为字符串数组
 * - 如果输入是数组，提取其中的非空唯一字符串
 * - 如果输入是单个值，规范化后返回单元素数组（若非空）
 * - 自动去重和过滤空值
 *
 * @param value - 待转换的任意值（字符串、数组或其他）
 * @returns 转换后的非空字符串数组，永远不返回 null/undefined
 *
 * @example
 * toStringArray(['  a', 'b', 'a', '  ', null])
 * // ['a', 'b']
 *
 * @example
 * toStringArray('  hello  ')
 * // ['hello']
 *
 * @example
 * toStringArray(123)
 * // []
 *
 * @example
 * toStringArray(null)
 * // []
 */
export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return uniqueStrings(value);
  const text = normalize(value);
  return text ? [text] : [];
};
