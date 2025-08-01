# AG-UI DeepChat Vue Component

A Vue.js chat component built on deep-chat and AG-UI client for creating conversational interfaces with streaming support.

## Installation

```bash
npm install @oroszgy/ag-ui-deepchat-vue
```

## Usage

### Basic Usage

```vue
<template>
  <div>
    <ChatComponent :config="chatConfig" title="My Chat App" />
  </div>
</template>

<script setup lang="ts">
import { ChatComponent, type ChatConfig } from '@oroszgy/ag-ui-deepchat-vue'

const chatConfig: ChatConfig = {
  backendUrl: 'http://localhost:9000/',
  placeholder: 'Type your message...',
  introMessage: 'Hello! How can I help you today?',
  style: 'border-radius: 10px; width: 100%; height: 500px;'
}
</script>
```

### Vue Plugin Installation

```typescript
import { createApp } from 'vue'
import AgUiDeepChatVue from '@oroszgy/ag-ui-deepchat-vue'
import App from './App.vue'

const app = createApp(App)
app.use(AgUiDeepChatVue)
app.mount('#app')
```

Then use in templates:
```vue
<template>
  <ChatComponent :config="chatConfig" />
</template>
```

## Configuration

The `ChatConfig` interface supports the following options:

- `backendUrl`: The URL of your chat backend
- `placeholder`: Placeholder text for the input field
- `introMessage`: Initial message shown to users
- `style`: Optional CSS styles for the chat container

## API

### Props

- `config` (ChatConfig): Chat configuration object
- `title` (string, optional): Title displayed above the chat

### Exposed Methods

- `resetChat()`: Resets the chat history and creates a new thread

## TypeScript Support

This package includes full TypeScript definitions. Import types as needed:

```typescript
import type { ChatConfig, Message, DeepChatElement } from '@oroszgy/ag-ui-deepchat-vue'
```

## Development

The component uses:
- Vue 3 Composition API
- TypeScript
- AG-UI client for backend communication
- deep-chat for the chat interface

## License

MIT
