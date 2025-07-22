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
  AGUIMessage,
  AGUIRequestBody,
  StreamingEvent,
  AGUIEvent,
  OpenAIResponse,
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
const chatHistory = ref<AGUIMessage[]>([])
const threadId = ref(`thread-${Date.now()}`)

// Computed properties
const chatStyle = computed(() => "border-radius: 10px; width: 96vw; height: calc(100vh - 120px); padding-top: 10px; font-size: 1.2rem;")

// Chat functionality methods
const handleConnection = async (body: DeepChatBody, signals: DeepChatSignals): Promise<void> => {
  try {
    // Map DeepChat roles to AG-UI roles and ensure correct structure
    const aguiMessages: AGUIMessage[] = (body.messages || []).map((m, index) => ({
      id: `msg-${Date.now()}-${index}`,
      role: m.role === 'ai' ? 'assistant' : m.role as 'user' | 'assistant',
      content: m.text || m.content || ''
    }))

    // Update chat history with new messages
    for (const msg of aguiMessages) {
      const existingIndex = chatHistory.value.findIndex((h: AGUIMessage) => h.id === msg.id)
      if (existingIndex === -1) {
        chatHistory.value.push(msg)
      }
    }

    console.log('Sending complete chat history:', chatHistory.value)

    if (!aguiMessages.length || !aguiMessages.some(m => m.role === 'user')) {
      signals.onResponse({ text: '[No user message to send]' })
      return
    }

    const response = await sendToBackend()
    await handleResponse(response, signals)

  } catch (e) {
    const error = e as Error
    signals.onResponse({ text: `[Handler error] ${error.message}` })
  }
}

const sendToBackend = async (): Promise<Response> => {
  const requestBody: AGUIRequestBody = {
    threadId: threadId.value,
    runId: `run-${Date.now()}`,
    state: {
      conversationLength: chatHistory.value.length,
      lastMessageId: chatHistory.value[chatHistory.value.length - 1]?.id
    },
    tools: [],
    context: [],
    forwardedProps: {},
    messages: chatHistory.value
  }

  return await fetch(props.config.backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })
}

const handleResponse = async (response: Response, signals: DeepChatSignals): Promise<void> => {
  if (!response.ok) {
    const errorText = await response.text()
    signals.onResponse({ text: `[Backend error ${response.status}]: ${errorText}` })
    return
  }

  const text = await response.text()

  // Handle streaming response (Server-Sent Events)
  if (text.startsWith('data:') || text.includes('\ndata:')) {
    handleStreamingResponse(text, signals)
    return
  }

  // Try to parse as regular JSON
  try {
    const data = JSON.parse(text)
    handleJsonResponse(data, signals)
  } catch (e) {
    const error = e as Error
    signals.onResponse({ text: `[JSON parse error] ${error.message}` })
  }
}

const handleStreamingResponse = (text: string, signals: DeepChatSignals): void => {
  const lines = text.split('\n')
  let messageContent = ''
  let assistantMessageId: string | null = null

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.substring(6).trim()
        if (jsonStr && jsonStr !== '[DONE]') {
          const data: StreamingEvent = JSON.parse(jsonStr)

          if (data.type === 'TEXT_MESSAGE_START' && data.messageId) {
            assistantMessageId = data.messageId
          } else if (data.type === 'TEXT_MESSAGE_CONTENT' && data.delta) {
            messageContent += data.delta
          }
        }
      } catch (e) {
        // Silently continue on parse errors
      }
    }
  }

  if (messageContent) {
    const assistantMessage: AGUIMessage = {
      id: assistantMessageId || `assistant-${Date.now()}`,
      role: 'assistant',
      content: messageContent
    }
    chatHistory.value.push(assistantMessage)
    signals.onResponse({ text: messageContent })
  } else {
    signals.onResponse({ text: '[No content found in streaming response]' })
  }
}

const handleJsonResponse = (data: any, signals: DeepChatSignals): void => {
  if (Array.isArray(data)) {
    for (const event of data as AGUIEvent[]) {
      if (event.event === 'error') {
        signals.onResponse({ text: `[Error] ${event.data?.message || 'Unknown error'}` })
        return
      } else if (event.event === 'system') {
        signals.onResponse({ text: `[System] ${event.data?.content || ''}` })
        return
      } else if (event.event === 'message') {
        signals.onResponse({ text: event.data?.content || '' })
        return
      }
    }
    signals.onResponse({ text: '[No message event in response]' })
  } else if (data.event) {
    const event = data as AGUIEvent
    if (event.event === 'error') {
      signals.onResponse({ text: `[Error] ${event.data?.message || 'Unknown error'}` })
    } else if (event.event === 'system') {
      signals.onResponse({ text: `[System] ${event.data?.content || ''}` })
    } else if (event.event === 'message') {
      signals.onResponse({ text: event.data?.content || '' })
    } else {
      signals.onResponse({ text: `[Unknown event: ${event.event}]` })
    }
  } else if ((data as OpenAIResponse).choices) {
    const openAIData = data as OpenAIResponse
    signals.onResponse({ text: openAIData.choices?.[0]?.message?.content || '' })
  } else {
    signals.onResponse({ text: '[Unrecognized response format]' })
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
    chatHistory.value = []
    threadId.value = `thread-${Date.now()}`
  },
  getChatHistory: () => chatHistory.value
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
