<template>
  <div class="chat-container">
    <h1>{{ title }}</h1>
    <deep-chat
      ref="chatElement"
      id="chat-element"
      demo="false"
      :style="chatStyle"
    ></deep-chat>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import type {
  DeepChatElement,
  DeepChatBody,
  DeepChatSignals,
  Message,
  ChatConfig
} from './types'

// Props
interface Props {
  config?: ChatConfig
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({
    backendUrl: 'http://localhost:9000/',
    placeholder: 'Welcome to the demo!',
    introMessage: 'Hello, how can I help you?'
  }),
  title: 'PolicyAlign DEMO'
})

// Reactive refs
const chatElement = ref<DeepChatElement>()
const threadId = ref(`thread-${Date.now()}`)

// Computed properties
const chatStyle = computed(() => "border-radius: 10px; width: 96vw; height: calc(100vh - 120px); padding-top: 10px; font-size: 1.2rem;")

// Handle streaming Server-Sent Events response
const handleStreamingResponse = (text: string, signals: DeepChatSignals): void => {
  const lines = text.split('\n')
  let messageContent = ''
  let assistantMessageId: string | null = null

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.substring(6).trim()
        if (jsonStr && jsonStr !== '[DONE]') {
          const data = JSON.parse(jsonStr)

          if (data.type === 'TEXT_MESSAGE_START' && data.messageId) {
            assistantMessageId = data.messageId
            messageContent = '' // Reset content for new message
          } else if (data.type === 'TEXT_MESSAGE_CONTENT' && data.delta) {
            messageContent += data.delta
          } else if (data.type === 'TEXT_MESSAGE_END') {
            // Message is complete, we can finalize it
            break
          }
        }
      } catch (e) {
        // Silently continue on parse errors for individual events
        console.warn('Failed to parse streaming event:', line)
      }
    }
  }

  if (messageContent) {
    signals.onResponse({ text: messageContent })
  } else {
    signals.onResponse({ text: '[No content found in streaming response]' })
  }
}

// Chat functionality methods
const handleConnection = async (body: DeepChatBody, signals: DeepChatSignals): Promise<void> => {
  try {
    // For now, fall back to direct HTTP until ag-ui client build issues are resolved
    // This maintains ag-ui protocol compatibility while avoiding build issues

    // Convert DeepChat messages to AG-UI Message format
    const messages: Message[] = (body.messages || []).map((m, index) => ({
      id: `msg-${Date.now()}-${index}`,
      role: m.role === 'ai' ? 'assistant' : (m.role as 'user' | 'assistant'),
      content: m.text || m.content || ''
    }))

    if (!messages.length || !messages.some(m => m.role === 'user')) {
      signals.onResponse({ text: '[No user message to send]' })
      return
    }

    console.log('Sending messages to agent:', messages)

    // Use AG-UI protocol format for the request body
    const requestBody = {
      messages,
      runId: `run-${Date.now()}`,
      threadId: threadId.value,
      state: {},
      tools: [],
      context: [],
      forwardedProps: {}
    }

    const response = await fetch(props.config.backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      signals.onResponse({ text: `[Backend error ${response.status}]: ${errorText}` })
      return
    }

    // Handle the response (streaming Server-Sent Events format)
    const text = await response.text()

    // Check if this is a streaming response (Server-Sent Events)
    if (text.startsWith('data:') || text.includes('\ndata:')) {
      handleStreamingResponse(text, signals)
    } else {
      // Try to parse as regular JSON
      try {
        const data = JSON.parse(text)

        // Handle AG-UI protocol response format
        if (data.newMessages && data.newMessages.length > 0) {
          const assistantMessage = data.newMessages
            .filter((msg: Message) => msg.role === 'assistant')
            .pop()

          if (assistantMessage && assistantMessage.content) {
            signals.onResponse({ text: assistantMessage.content })
          } else {
            signals.onResponse({ text: '[No response content from agent]' })
          }
        } else {
          signals.onResponse({ text: '[No response from agent]' })
        }
      } catch (e) {
        // If not JSON, treat as plain text response
        signals.onResponse({ text: text || '[Empty response]' })
      }
    }
  } catch (e) {
    const error = e as Error
    console.error('Agent error:', error)
    signals.onResponse({ text: `[Agent error] ${error.message}` })
  }
}

const setupChatElement = async (): Promise<void> => {
  await nextTick()

  if (!chatElement.value) {
    console.error('Chat element not found')
    return
  }

  // Configure the deep-chat element
  chatElement.value.history = []

  // Set textInput as a string attribute (not reactive binding)
  chatElement.value.setAttribute(
    'textInput',
    JSON.stringify({
      placeholder: { text: props.config.placeholder }
    })
  )

  chatElement.value.setAttribute(
    'introMessage',
    JSON.stringify({
      text: props.config.introMessage
    })
  )

  // Set up the connection handler
  chatElement.value.connect = {
    handler: handleConnection
  }
}

// Lifecycle
onMounted(() => {
  setupChatElement()
})

// Expose methods for parent components if needed
defineExpose({
  resetChat: () => {
    threadId.value = `thread-${Date.now()}`
    if (chatElement.value) {
      chatElement.value.history = []
    }
  }
})
</script>

<style scoped>
.chat-container {
  font-family: sans-serif;
  text-align: center;
  justify-content: center;
  display: grid;
}

h1 {
  margin-bottom: 1rem;
}
</style>
