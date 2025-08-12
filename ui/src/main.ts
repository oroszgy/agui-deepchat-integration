// Import Vue feature flags first
import './vue-flags'

// Simple and clean main.ts
import { createApp } from 'vue'
import ChatComponent from './ChatComponent.vue'
import type { ChatConfig } from './types'

// Configuration for the chat application
const chatConfig: ChatConfig = {
  backendUrl: 'http://localhost:9000/agui',
  placeholder: 'Welcome to the demo!',
  introMessage: 'Hello, how can I help you?',
  style: 'border-radius: 10px; width: 96vw; height: calc(100vh - 120px); padding-top: 10px; font-size: 1.2rem;'
}

// Create and mount the Vue app
const app = createApp(ChatComponent, {
  config: chatConfig,
  title: 'Deepchat AG-UI DEMO'
})

app.mount('#app')
