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

// State management
const chatElement = ref<DeepChatElement>()
const chatHistory = ref<Message[]>([])
const threadId = ref(`thread-${Date.now()}`)

const chatStyle = computed(() =>
  "border-radius: 10px; width: 96vw; height: calc(100vh - 120px); padding-top: 10px; font-size: 1.2rem;"
)

// Helper functions
const createMessage = (id: string, role: Message['role'], content: string): Message => {
  const message = { id, role, content }
  console.log(`Created message:`, message)
  return message
}

const convertDeepChatMessages = (messages: DeepChatBody['messages'] = []): Message[] => {
  console.log('Converting DeepChat messages:', messages)
  const converted = messages.map((m, index) => createMessage(
    `msg-${Date.now()}-${index}`,
    m.role === 'ai' ? 'assistant' : (m.role as 'user' | 'assistant'),
    m.text || m.content || ''
  ))
  console.log('Converted messages:', converted)
  return converted
}

const isUserMessageDuplicate = (msg: Message): boolean => {
  const isDuplicate = chatHistory.value.some(h =>
    h.content === msg.content &&
    h.role === 'user' &&
    Math.abs(Date.now() - parseInt(h.id.split('-')[1])) < 5000
  )
  console.log(`Checking duplicate for message "${msg.content}":`, isDuplicate)
  return isDuplicate
}

const createRequestBody = () => {
  const body = {
    messages: chatHistory.value,
    runId: `run-${Date.now()}`,
    threadId: threadId.value,
    state: {
      conversationLength: chatHistory.value.length,
      lastMessageId: chatHistory.value[chatHistory.value.length - 1]?.id
    },
    tools: [],
    context: [],
    forwardedProps: {}
  }
  console.log('Created request body:', body)
  return body
}

// Streaming event handlers
const handleTextMessageStart = (data: any): { id: string; content: string } => {
  console.log('📩 TEXT_MESSAGE_START:', data)
  const messageState = { id: data.messageId, content: '' }
  console.log('Initialized message tracking:', messageState)
  return messageState
}

const handleTextMessageContent = (
  data: any,
  currentMessage: { id: string; content: string },
  signals: DeepChatSignals,
  hasStartedResponse: boolean
): boolean => {
  console.log('📝 TEXT_MESSAGE_CONTENT delta:', data.delta)
  currentMessage.content += data.delta
  console.log('Current message content length:', currentMessage.content.length)

  if (!hasStartedResponse) {
    console.log('🚀 Starting streaming response with first delta')
    signals.onResponse({ text: data.delta })
    return true
  } else {
    console.log('➕ Appending delta to existing response')
    signals.onResponse({ text: data.delta })
    return hasStartedResponse
  }
}

const handleTextMessageEnd = (
  currentMessage: { id: string; content: string },
  signals: DeepChatSignals,
  hasStartedResponse: boolean
): boolean => {
  console.log('✅ TEXT_MESSAGE_END for message:', currentMessage.id)
  console.log('Final message content:', currentMessage.content)

  const assistantMessage = createMessage(currentMessage.id, 'assistant', currentMessage.content)
  chatHistory.value.push(assistantMessage)
  console.log('📚 Updated chat history. Total messages:', chatHistory.value.length)

  if (!hasStartedResponse) {
    console.log('⚠️ Edge case: No deltas received, sending complete content')
    signals.onResponse({ text: currentMessage.content })
    return true
  } else {
    console.log('🔄 Adding separator for next message')
    signals.onResponse({ text: '\n\n' })
    return hasStartedResponse
  }
}

// Main streaming handler
const processStreamingEvents = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signals: DeepChatSignals
): Promise<void> => {
  console.log('🔄 Starting streaming event processing')
  const decoder = new TextDecoder()
  let buffer = ''
  let currentAssistantMessage: { id: string; content: string } | null = null
  let hasStartedResponse = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      console.log('📡 Stream reading completed')
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) {
        console.log('🔍 Skipping non-data line:', line.length > 0 ? `"${line}"` : '(empty line)')
        continue
      }

      try {
        const jsonStr = line.substring(6).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        const data = JSON.parse(jsonStr)
        console.log('🎯 Received streaming event:', data)

        switch (data.type) {
          case 'TEXT_MESSAGE_START':
            if (data.messageId) {
              currentAssistantMessage = handleTextMessageStart(data)
            }
            break

          case 'TEXT_MESSAGE_CONTENT':
            if (data.delta && currentAssistantMessage) {
              hasStartedResponse = handleTextMessageContent(
                data,
                currentAssistantMessage,
                signals,
                hasStartedResponse
              )
            }
            break

          case 'TEXT_MESSAGE_END':
            if (currentAssistantMessage) {
              hasStartedResponse = handleTextMessageEnd(
                currentAssistantMessage,
                signals,
                hasStartedResponse
              )
              currentAssistantMessage = null
            }
            break

          case 'RUN_FINISHED':
            console.log('🏁 RUN_FINISHED - ending stream processing')
            return

          default:
            console.log('🔍 Other event type:', data.type)
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse streaming event:', line, e)
      }
    }
  }
}

// Main connection handler
const handleConnection = async (body: DeepChatBody, signals: DeepChatSignals): Promise<void> => {
  console.log('🔌 New connection request started')
  console.log('Incoming body:', body)

  try {
    // Process incoming messages
    const newMessages = convertDeepChatMessages(body.messages)
    console.log('📩 Processing new messages:', newMessages)

    // Add new user messages to history
    const userMessages = newMessages.filter(msg => msg.role === 'user' && !isUserMessageDuplicate(msg))
    console.log('👤 New user messages to add:', userMessages)

    userMessages.forEach(msg => {
      chatHistory.value.push(msg)
      console.log('✅ Added user message to history:', msg)
    })

    console.log('📚 Current chat history length:', chatHistory.value.length)
    console.log('📚 Complete chat history:', chatHistory.value)

    if (!newMessages.some(m => m.role === 'user')) {
      console.log('⚠️ No user messages found, sending placeholder response')
      signals.onResponse({ text: '[No user message to send]' })
      return
    }

    // Setup request
    console.log('🌐 Setting up HTTP request to backend')
    const abortController = new AbortController()
    if (signals.stopClicked) {
      console.log('⏹️ Stop button handler registered')
      signals.stopClicked.listener = () => {
        console.log('🛑 Stream stop requested by user')
        abortController.abort()
      }
    }

    console.log(`📤 Sending request to: ${props.config.backendUrl}`)
    const response = await fetch(props.config.backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(createRequestBody()),
      signal: abortController.signal
    })

    console.log(`📡 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      console.error('❌ Backend request failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      signals.onResponse({ error: `Backend error ${response.status}: ${errorText}` })
      return
    }

    console.log('✅ Backend connection established successfully')
    signals.onOpen?.()

    const reader = response.body?.getReader()
    if (!reader) {
      console.error('❌ Unable to get response stream reader')
      signals.onResponse({ error: 'Unable to read response stream' })
      return
    }

    console.log('📖 Stream reader obtained, starting event processing')
    try {
      await processStreamingEvents(reader, signals)
      console.log('✅ Streaming completed successfully')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Stream was aborted by user')
      } else {
        console.error('❌ Stream reading error:', error)
        signals.onResponse({ error: 'Stream reading error' })
      }
    } finally {
      console.log('🔒 Releasing stream reader lock')
      reader.releaseLock()
      console.log('🔌 Closing connection')
      signals.onClose?.()
    }

  } catch (e) {
    const error = e as Error
    console.error('💥 Connection error:', error)
    console.error('Error stack:', error.stack)
    signals.onResponse({ error: `Connection error: ${error.message}` })
  }
}

// Component setup
const setupChatElement = async (): Promise<void> => {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))

  if (!chatElement.value) {
    console.error('Chat element not found after initialization delay')
    return
  }

  try {
    chatElement.value.history = []
    chatElement.value.stream = true

    chatElement.value.setAttribute('textInput', JSON.stringify({
      placeholder: { text: props.config.placeholder }
    }))

    chatElement.value.setAttribute('introMessage', JSON.stringify({
      text: props.config.introMessage
    }))

    chatElement.value.connect = { handler: handleConnection }
  } catch (error) {
    console.error('Error setting up chat element:', error)
  }
}

onMounted(setupChatElement)

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
