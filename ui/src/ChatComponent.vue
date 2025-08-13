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
import {ChatConfig, DeepChatBody, DeepChatElement, DeepChatSignals, Message, ToolCall, ToolResponse} from './types'
import {APP_CONSTANTS, createDefaultConfig, Logger} from './constants'
import {MessageUtils, RequestUtils, ToolCallUtils} from './utils'

export interface ChatComponentProps {
  config?: ChatConfig
  title?: string
}

const props = withDefaults(defineProps<ChatComponentProps>(), {
  config: createDefaultConfig,
  title: 'DEMO'
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


// Main streaming handler
const processStreamingEvents = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signals: DeepChatSignals
): Promise<void> => {
  Logger.event('Starting streaming event processing')
  const decoder = new TextDecoder()
  let buffer = ''
  let currentAssistantMessage: { id: string; content: string; toolCalls: ToolCall[] } | null = null
  let streamResponse: any = null
  let currentToolCalls = new Map<string, ToolCall>()
  let toolResponses: ToolResponse[] = []

  while (true) {
    const {done, value} = await reader.read()
    if (done) {
      Logger.event('Stream reading completed')
      break
    }

    buffer += decoder.decode(value, {stream: true})
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ') && line.length != 0) {
        Logger.event('Skipping non-data line:', `"${line}"`)
        continue
      }

      try {
        const jsonStr = line.substring(6).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        const data = JSON.parse(jsonStr)

        Logger.event('Processing ' + `"${data.type}"` + ' event')
        switch (data.type) {
          case 'TEXT_MESSAGE_START':
            if (data.messageId) {
              currentAssistantMessage = {
                id: data.messageId,
                content: '',
                toolCalls: []
              }
              currentToolCalls.clear()

            } else {
              Logger.warn('TEXT_MESSAGE_START missing messageId:', data)
            }
            break

          case 'TEXT_MESSAGE_CONTENT':
            if (data.delta && currentAssistantMessage) {
              currentAssistantMessage.content += data.delta

              // Stream each delta immediately to deep-chat
              if (!streamResponse) {
                Logger.stream('Starting streaming response with first delta with tools: ')
                signals.onResponse({text: data.delta})
                streamResponse = true
              } else {
                Logger.stream('Appending delta to existing response')
                signals.onResponse({text: data.delta})
              }

            } else {
              Logger.warn('TEXT_MESSAGE_CONTENT missing delta or no current message:', {
                hasDelta: !!data.delta,
                hasCurrentMessage: !!currentAssistantMessage,
                data
              })
            }
            break

          case 'TOOL_CALL_START':
            if (data.toolCallId && data.toolCallName) {
              const toolCall: ToolCall = {
                id: data.toolCallId,
                type: "function",
                function: {name: data.toolCallName, arguments: ""}
              }
              currentToolCalls.set(data.toolCallId, toolCall)
              Logger.tool("Tool call started " + toolCall)

              // Display tool call start in UI
              const toolDisplay = '\n\n🔧 `' + `${data.toolCallName}` + '`\n'
              if (!streamResponse) {
                signals.onResponse({text: toolDisplay})
                streamResponse = true
              } else {
                signals.onResponse({text: toolDisplay})
              }
            }
            break

          case 'TOOL_CALL_ARGS':
            if (data.toolCallId && data.delta) {
              const toolCall = currentToolCalls.get(data.toolCallId)
              if (toolCall) {
                const updatedToolCall = ToolCallUtils.updateToolCallArgs(toolCall, data.delta)
                currentToolCalls.set(data.toolCallId, updatedToolCall)
              }
            }
            break

          case 'TOOL_CALL_END':
            if (data.toolCallId) {
              const toolCall = currentToolCalls.get(data.toolCallId)
              if (toolCall) {
                signals.onResponse({text: "", overwrite: true})
              }
            }
            break

          case 'TOOL_CALL_RESULT':
            if (data.toolCallId && data.content) {
              // const toolCall = currentToolCalls.get(data.toolCallId)
              // if (toolCall) {
              //   const resultToolCall = ToolCallUtils.completeToolCall(toolCall, data.content)
              //   currentToolCalls.set(data.toolCallId, resultToolCall)
              //
              // }
              const toolMessage: ToolResponse = {
                id: data.messageId,
                role: "tool",
                content: data.content,
                toolCallId: data.toolCallId,
              }
              Logger.tool('Tool call completed:', toolMessage)
              toolResponses.push(toolMessage)
            }
            break

          case 'TEXT_MESSAGE_END':
            if (currentAssistantMessage) {
              // Add all tool calls to the message
              currentAssistantMessage.toolCalls = Array.from(currentToolCalls.values())

              const assistantMessage: Message = {
                id: currentAssistantMessage.id,
                role: 'assistant',
                content: currentAssistantMessage.content,
                toolCalls: currentAssistantMessage.toolCalls.length > 0 ? currentAssistantMessage.toolCalls : []
              }

              chatHistory.value.push(assistantMessage)
              chatHistory.value.push(...toolResponses)
              toolResponses = []

              Logger.message('📚 Updated chat history. Total messages:', chatHistory.value)

              // Handle case where no deltas were received
              if (!streamResponse) {
                Logger.warn('Edge case: No deltas received, sending complete content', data)
                signals.onResponse({text: currentAssistantMessage.content})
              }

              currentAssistantMessage = null
              currentToolCalls.clear()

            }
            break

          case 'RUN_STARTED':
            break

          case 'RUN_FINISHED':
            // Close the stream if it was opened
            if (streamResponse && typeof streamResponse.onFinish === 'function') {
              Logger.stream('Closing stream response')
              streamResponse.onFinish()
            }
            return

          case 'ERROR':
            Logger.error('Processing ERROR event:', data)
            Logger.error('Error details:', {
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
            Logger.warn('Processing unknown event type:', data)
        }
      } catch (e) {
        Logger.warn('Failed to parse streaming event:', line, e)
      }
    }
  }
}

// Main connection handler
const handleConnection = async (body: DeepChatBody, signals: DeepChatSignals): Promise<void> => {
  Logger.connection('New connection request started')
  // Logger.connection('Incoming body', body)

  try {
    // Process incoming messages using utilities
    const newMessages = processIncomingMessages(body)

    if (!newMessages.some(m => m.role === 'user')) {
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
    Logger.error('Chat element not found after initialization delay', chatElement)
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

    chatElement.value.connect = {
      handler: handleConnection,
      stream: true
    }

    Logger.message('Chat element configured with streaming enabled in connect object')
  } catch (error) {
    Logger.error('Error setting up chat element:', error)
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
