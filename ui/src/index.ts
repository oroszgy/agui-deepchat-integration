// Main library entry point
import type { App } from 'vue'
import ChatComponent from './ChatComponent.vue'

// Export the component
export { default as ChatComponent } from './ChatComponent.vue'

// Export all types
export type {
  ChatConfig,
  Message,
  DeepChatElement,
  DeepChatMessage,
  DeepChatBody,
  DeepChatSignals,
  HttpAgent
} from './types'

// Export component props interface
export type { ChatComponentProps } from './ChatComponent.vue'

// Export utilities and constants
export { APP_CONSTANTS, createDefaultConfig, Logger } from './constants'
export { MessageUtils, RequestUtils } from './utils'

// Vue plugin install function
export function install(app: App) {
  app.component('ChatComponent', ChatComponent)
}

// Default export for convenience
export default {
  install,
  ChatComponent
}
