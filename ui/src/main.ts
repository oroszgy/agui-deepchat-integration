import { createApp } from 'vue'
import ChatComponent from './ChatComponent.vue'
import type { ChatConfig } from './types'

// Configuration for the chat application
const chatConfig: ChatConfig = {
  backendUrl: 'http://localhost:9000/',
  placeholder: 'Welcome to the demo!',
  introMessage: 'Hello, how can I help you?'
}

// Create and mount the Vue app
const app = createApp(ChatComponent, {
  config: chatConfig,
  title: 'PolicyAlign DEMO'
})

app.mount('#app')
