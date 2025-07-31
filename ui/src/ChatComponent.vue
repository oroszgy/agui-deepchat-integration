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
import {computed, nextTick, onMounted, ref} from 'vue'
import {EventType} from '@ag-ui/core'
import type {
  AGUIEvent,
  AGUIMessage,
  AGUIRequestBody,
  ChatConfig,
  DeepChatBody,
  DeepChatElement,
  DeepChatSignals
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
const chatHistory = ref<AGUIMessage[]>([])
const threadId = ref(`thread-${Date.now()}`)

// Computed properties
const chatStyle = computed(() => "border-radius: 10px; width: 96vw; height: calc(100vh - 120px); padding-top: 10px; font-size: 1.2rem;")

// Chat functionality methods
const handleConnection = async (body: DeepChatBody, signals: DeepChatSignals): Promise<void> => {
  try {
    if (!body.messages || body.messages.length === 0) {
      signals.onResponse({text: props.config.introMessage || 'Hello, how can I help you?'})
      return
    }

    const lastMessage = body.messages[body.messages.length - 1]
    const userMessage: AGUIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: lastMessage.text || lastMessage.content || ''
    }

    // Add user message to history
    chatHistory.value.push(userMessage)

    // Prepare request body using ag-ui types
    const requestBody: AGUIRequestBody = {
      messages: chatHistory.value,
      threadId: threadId.value,
      stream: true
    }

    // Make streaming request to backend
    const response = await fetch(`${props.config.backendUrl}chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    await handleStreamingResponse(response, signals)

  } catch (error) {
    console.error('Error in chat connection:', error)
    signals.onResponse({
      text: 'Sorry, I encountered an error. Please try again.'
    })
  }
}

const handleStreamingResponse = async (response: Response, signals: DeepChatSignals): Promise<void> => {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  let assistantMessage: AGUIMessage = {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: ''
  }

  let fullResponse = ''

  if (!reader) {
    throw new Error('Failed to get response reader')
  }

  try {
    while (true) {
      const {done, value} = await reader.read()

      if (done) break

      const chunk = decoder.decode(value, {stream: true})
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data: ')) continue

        const eventData = line.substring(6) // Remove 'data: ' prefix

        if (eventData === '[DONE]') {
          // Finalize the assistant message
          assistantMessage.content = fullResponse
          chatHistory.value.push(assistantMessage)
          signals.onResponse({text: fullResponse})
          return
        }

        try {
          // Parse the event data directly as JSON
          const event = JSON.parse(eventData) as AGUIEvent

          await processAGUIEvent(event, assistantMessage)

          // Update full response for streaming display
          if (event.type === EventType.TEXT_MESSAGE_CONTENT && event.data?.content) {
            fullResponse += event.data.content
            signals.onResponse({ text: fullResponse })
          }
        } catch (parseError) {
          console.warn('Failed to parse event data:', parseError)
          // Fallback: treat as plain text content
          if (eventData.trim()) {
            fullResponse += eventData
            signals.onResponse({text: fullResponse})
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

const processAGUIEvent = async (event: AGUIEvent, assistantMessage: AGUIMessage): Promise<void> => {
  switch (event.type) {
    case EventType.TEXT_MESSAGE_START:
      console.log('Text message started')
      break

    case EventType.TEXT_MESSAGE_CONTENT:
      if (event.data?.content) {
        assistantMessage.content = (assistantMessage.content || '') + event.data.content
      }
      break

    case EventType.TEXT_MESSAGE_END:
      console.log('Text message completed')
      break

    case EventType.TOOL_CALL_START:
      console.log('Tool call started:', event.data)
      break

    case EventType.TOOL_CALL_END:
      console.log('Tool call completed:', event.data)
      break

    case EventType.RUN_STARTED:
      console.log('Run started:', event.data)
      break

    case EventType.RUN_FINISHED:
      console.log('Run finished:', event.data)
      break

    case EventType.RUN_ERROR:
      console.error('Run error:', event.data)
      break

    default:
      console.log('Unhandled event type:', event.type, event.data)
  }
}

// Initialize chat component
onMounted(async () => {
  await nextTick()

  if (chatElement.value) {
    // Set up deep-chat connection handler
    chatElement.value.connect = {
      handler: handleConnection
    }

    console.log('Chat component initialized with ag-ui integration')
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f5f5;
}

h1 {
  color: #333;
  margin-bottom: 20px;
  font-family: 'Arial', sans-serif;
}

deep-chat {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #ddd;
}
</style>
