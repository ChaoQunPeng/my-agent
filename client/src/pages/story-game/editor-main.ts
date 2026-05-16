import { createApp } from 'vue'
import StoryEditor from './editor.vue'
import '~/assets/styles/reset.css'
import 'uno.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

createApp(StoryEditor).mount('#story-editor')
