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
import type {ChatConfig, DeepChatBody, DeepChatElement, DeepChatSignals, Message} from './types'
import {APP_CONSTANTS, createDefaultConfig, Logger} from './constants'
import {MessageUtils, RequestUtils, ValidationUtils} from './utils'

interface Props {
  config?: ChatConfig
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  config: createDefaultConfig,
  title: 'PolicyAlign DEMO'
})

// State management
const chatElement = ref<DeepChatElement>()
const chatHistory = ref<Message[]>([])
const threadId = ref(`thread-${Date.now()}`)

const chatStyle = computed(() => {
  const style = props.config.style || APP_CONSTANTS.DEFAULT_CHAT_STYLE
  Logger.style(style)
  return style
})

// Message processing functions
const processIncomingMessages = (body: DeepChatBody): Message[] => {
  const newMessages = MessageUtils.convertFromDeepChat(body.messages)
  const userMessages = MessageUtils.filterNewUserMessages(newMessages, chatHistory.value)

  userMessages.forEach(msg => {
    chatHistory.value.push(msg)
    Logger.success('Added user message to history', msg)
  })

  Logger.message('Current chat history length', chatHistory.value.length)
  Logger.message('Complete chat history', chatHistory.value)

  return newMessages
}

// Helper functions
const createMessage = (id: string, role: Message['role'], content: string): Message => {
  const message = {id, role, content}
  console.log(`Created message:`, message)
  return message
}

// Streaming event handlers
const handleTextMessageStart = (data: any): { id: string; content: string } => {
  console.log('📩 TEXT_MESSAGE_START:', data)
  const messageState = {id: data.messageId, content: ''}
  console.log('Initialized message tracking:', messageState)
  return messageState
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
  let streamResponse: any = null

  while (true) {
    const {done, value} = await reader.read()
    if (done) {
      console.log('📡 Stream reading completed')
      break
    }

    buffer += decoder.decode(value, {stream: true})
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
            console.log('🎬 Processing TEXT_MESSAGE_START event')
            if (data.messageId) {
              currentAssistantMessage = handleTextMessageStart(data)
              console.log('✅ TEXT_MESSAGE_START processed successfully')
            } else {
              console.warn('⚠️ TEXT_MESSAGE_START missing messageId:', data)
            }
            break

          case 'TEXT_MESSAGE_CONTENT':
            console.log('📝 Processing TEXT_MESSAGE_CONTENT event')
            if (data.delta && currentAssistantMessage) {
              currentAssistantMessage.content += data.delta

              // Stream each delta immediately to deep-chat
              if (!streamResponse) {
                console.log('🚀 Starting streaming response with first delta')
                signals.onResponse({text: data.delta})
                streamResponse = true // Mark that we've started the response
              } else {
                console.log('➕ Appending delta to existing response')
                signals.onResponse({text: data.delta})
              }
              console.log('✅ TEXT_MESSAGE_CONTENT processed successfully')
            } else {
              console.warn('⚠️ TEXT_MESSAGE_CONTENT missing delta or no current message:', {
                hasDelta: !!data.delta,
                hasCurrentMessage: !!currentAssistantMessage,
                data
              })
            }
            break

          case 'TEXT_MESSAGE_END':
            console.log('🏁 Processing TEXT_MESSAGE_END event')
            if (currentAssistantMessage) {
              const assistantMessage = createMessage(currentAssistantMessage.id, 'assistant', currentAssistantMessage.content)
              chatHistory.value.push(assistantMessage)
              console.log('📚 Updated chat history. Total messages:', chatHistory.value.length)

              // Handle case where no deltas were received
              if (!streamResponse) {
                console.log('⚠️ Edge case: No deltas received, sending complete content')
                signals.onResponse({text: currentAssistantMessage.content})
              } else {
                // Add separator for next message if there will be one
                console.log('🔄 Adding separator for next message')
                if (typeof streamResponse.onNext === 'function') {
                  streamResponse.onNext({text: '\n\n'})
                } else {
                  signals.onResponse({text: '\n\n'})
                }
              }

              currentAssistantMessage = null
              console.log('✅ TEXT_MESSAGE_END processed successfully')
            } else {
              console.warn('⚠️ TEXT_MESSAGE_END with no current message:', data)
            }
            break

          case 'RUN_STARTED':
            console.log('🚀 Processing RUN_STARTED event:', data)
            console.log('✅ RUN_STARTED acknowledged')
            break

          case 'RUN_FINISHED':
            console.log('🏁 Processing RUN_FINISHED event:', data)
            // Close the stream if it was opened
            if (streamResponse && typeof streamResponse.onFinish === 'function') {
              console.log('🔒 Closing stream response')
              streamResponse.onFinish()
            }
            console.log('🏁 RUN_FINISHED - ending stream processing')
            return

          case 'TOOL_CALL_START':
            console.log('🔧 Processing TOOL_CALL_START event:', data)
            console.log('Tool call initiated:', {
              toolCallId: data.toolCallId,
              toolName: data.toolCallName,
              parentMessageId: data.parentMessageId
            })
            break

          case 'TOOL_CALL_ARGS':
            console.log('🔧 Processing TOOL_CALL_ARGS event:', data)
            console.log('Tool call args delta:', {
              toolCallId: data.toolCallId,
              delta: data.delta
            })
            break

          case 'TOOL_CALL_END':
            console.log('🔧 Processing TOOL_CALL_END event:', data)
            console.log('Tool call completed:', {toolCallId: data.toolCallId})
            break

          case 'TOOL_CALL_RESULT':
            console.log('🔧 Processing TOOL_CALL_RESULT event:', data)
            console.log('Tool call result:', {
              toolCallId: data.toolCallId,
              messageId: data.messageId,
              content: data.content,
              role: data.role
            })
            break

          case 'ERROR':
            console.error('❌ Processing ERROR event:', data)
            console.error('Error details:', {
              message: data.message,
              code: data.code,
              details: data.details
            })
            if (streamResponse && typeof streamResponse.onFinish === 'function') {
              streamResponse.onFinish()
            }
            signals.onResponse({error: data.message || 'Unknown error occurred'})
            return

          default:
            console.log('🔍 Processing unknown event type:', data.type)
            console.log('🔍 Full event data:', data)
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse streaming event:', line, e)
      }
    }
  }
}

// Main connection handler
const handleConnection = async (body: DeepChatBody, signals: DeepChatSignals): Promise<void> => {
  Logger.connection('New connection request started')
  Logger.connection('Incoming body', body)

  try {
    // Process incoming messages using utilities
    const newMessages = processIncomingMessages(body)

    if (!ValidationUtils.hasUserMessage(newMessages)) {
      Logger.warn('No user messages found, sending placeholder response', null)
      signals.onResponse({text: '[No user message to send]'})
      return
    }

    // Setup HTTP request
    Logger.connection('Setting up HTTP request to backend')
    const abortController = new AbortController()

    if (signals.stopClicked) {
      Logger.connection('Stop button handler registered')
      signals.stopClicked.listener = () => {
        Logger.connection('Stream stop requested by user')
        abortController.abort()
      }
    }

    Logger.connection(`Sending request to: ${props.config.backendUrl}`)
    const response = await fetch(props.config.backendUrl, {
      method: 'POST',
      headers: APP_CONSTANTS.HTTP_HEADERS,
      body: JSON.stringify(RequestUtils.createBody(chatHistory.value, threadId.value)),
      signal: abortController.signal
    })

    Logger.connection(`Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      Logger.error('Backend request failed', `${response.status}: ${errorText}`)
      signals.onResponse({error: `Backend error ${response.status}: ${errorText}`})
      return
    }

    Logger.success('Backend connection established successfully')
    signals.onOpen?.()

    const reader = response.body?.getReader()
    if (!reader) {
      Logger.error('Unable to get response stream reader', reader)
      signals.onResponse({error: 'Unable to read response stream'})
      return
    }

    Logger.stream('Stream reader obtained, starting event processing')
    try {
      await processStreamingEvents(reader, signals)
      Logger.success('Streaming completed successfully')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        Logger.connection('Stream was aborted by user')
      } else {
        Logger.error('Stream reading error', error)
        signals.onResponse({error: 'Stream reading error'})
      }
    } finally {
      Logger.stream('Releasing stream reader lock')
      reader.releaseLock()
      Logger.connection('Closing connection')
      signals.onClose?.()
    }

  } catch (e) {
    const error = e as Error
    Logger.error('Connection error', error.message)
    Logger.error('Error stack', error.stack)
    signals.onResponse({error: `Connection error: ${error.message}`})
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

    chatElement.value.setAttribute('textInput', JSON.stringify({
      placeholder: {text: props.config.placeholder}
    }))

    chatElement.value.setAttribute('introMessage', JSON.stringify({
      text: props.config.introMessage
    }))

    // In deep-chat v2.0.0+, stream property is part of the connect object
    chatElement.value.connect = {
      handler: handleConnection,
      stream: true // Stream property moved here in v2.0.0
    }

    console.log('✅ Chat element configured with streaming enabled in connect object')
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
