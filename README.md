1、整理拆分/Users/pengchaoqun/code/my-agent/client/src/pages/dialog/index.vue 的组件、样式。你能看到素材区域
有很多种不同的业务，后面只会越来越多，所以我想拆分开来。把公共的部分提取出来。目前会变化的地方就是素材区域，以后有类似聊天对话页面，我都会创建一个新文件，而不是在素材区域增加组件

2、调整/Users/pengchaoqun/code/my-agent/client/src/pages/writer-assistant/novel-outline/index.vue 布局。恢复任务、上传 TXT 并拆分、任务进度放到一个 tab 里切换展示。任务进度需要有任务进行才展示

3、新增一个生成 meta 数据的页面，参考/Users/pengchaoqun/code/my-agent/client/src/pages/writer-assistant/novel-outline/index.vue，要有恢复进度的功能，和/Users/pengchaoqun/code/my-agent/client/src/pages/writer-assistant/novel-outline/index.vue 类似
