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
const chatHistory = ref<Message[]>([])
const threadId = ref(`thread-${Date.now()}`)

// Computed properties
const chatStyle = computed(() => "border-radius: 10px; width: 96vw; height: calc(100vh - 120px); padding-top: 10px; font-size: 1.2rem;")

// Chat functionality methods - Real-time streaming implementation
const handleConnection = async (body: DeepChatBody, signals: DeepChatSignals): Promise<void> => {
  try {
    // Convert DeepChat messages to AG-UI Message format
    const newMessages: Message[] = (body.messages || []).map((m, index) => ({
      id: `msg-${Date.now()}-${index}`,
      role: m.role === 'ai' ? 'assistant' : (m.role as 'user' | 'assistant'),
      content: m.text || m.content || ''
    }))

    // Add new user messages to chat history (deep-chat sends the latest user message)
    for (const msg of newMessages) {
      if (msg.role === 'user') {
        // Check if this user message is already in history to avoid duplicates
        const existingIndex = chatHistory.value.findIndex(h =>
          h.content === msg.content &&
          h.role === 'user' &&
          Math.abs(Date.now() - parseInt(h.id.split('-')[1])) < 5000 // Within 5 seconds
        )
        if (existingIndex === -1) {
          chatHistory.value.push(msg)
          console.log('Added user message to history:', msg)
        }
      }
    }

    if (!newMessages.length || !newMessages.some(m => m.role === 'user')) {
      signals.onResponse({ text: '[No user message to send]' })
      return
    }

    console.log('Sending complete chat history:', chatHistory.value)

    // Use AG-UI protocol format for the request body with complete history
    const requestBody = {
      messages: chatHistory.value, // Send complete history including the new user message
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

    // Create AbortController for cancellation support
    const abortController = new AbortController()

    // Set up stop button functionality
    if (signals.stopClicked) {
      signals.stopClicked.listener = () => {
        console.log('Stream stop requested')
        abortController.abort()
      }
    }

    const response = await fetch(props.config.backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      signals.onResponse({ error: `Backend error ${response.status}: ${errorText}` })
      return
    }

    // Signal that connection is established and stop loading indicator
    if (signals.onOpen) {
      signals.onOpen()
    }

    // Process the streaming response in real-time
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      signals.onResponse({ error: 'Unable to read response stream' })
      return
    }

    let buffer = ''
    let currentAssistantMessage: { id: string; content: string } | null = null
    let hasStartedResponse = false

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines from the buffer
        const lines = buffer.split('\n')
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6).trim()
              if (jsonStr && jsonStr !== '[DONE]') {
                const data = JSON.parse(jsonStr)
                console.log('Received streaming event:', data)

                // Handle different event types
                if (data.type === 'TEXT_MESSAGE_START' && data.messageId) {
                  // Message started - initialize new message tracking
                  currentAssistantMessage = {
                    id: data.messageId,
                    content: ''
                  }
                  console.log('Message started:', data.messageId)
                } else if (data.type === 'TEXT_MESSAGE_CONTENT' && data.delta && currentAssistantMessage) {
                  // Accumulate the message content
                  currentAssistantMessage.content += data.delta

                  // Stream each delta immediately to deep-chat
                  if (!hasStartedResponse) {
                    // Start the response with the first delta
                    signals.onResponse({ text: data.delta })
                    hasStartedResponse = true
                    console.log('Started streaming response with delta:', data.delta)
                  } else {
                    // Continue streaming with additional deltas
                    signals.onResponse({ text: data.delta })
                    console.log('Streamed delta:', data.delta)
                  }
                } else if (data.type === 'TEXT_MESSAGE_END' && currentAssistantMessage) {
                  // Message complete - add to history
                  const assistantMessage: Message = {
                    id: currentAssistantMessage.id,
                    role: 'assistant',
                    content: currentAssistantMessage.content
                  }
                  chatHistory.value.push(assistantMessage)
                  console.log('Message completed and added to history:', assistantMessage)

                  // Add separator for next message if there will be one
                  if (!hasStartedResponse) {
                    // Edge case: if no deltas were received, send the complete content
                    signals.onResponse({ text: currentAssistantMessage.content })
                    hasStartedResponse = true
                  } else {
                    // Add separator between messages
                    signals.onResponse({ text: '\n\n' })
                  }

                  currentAssistantMessage = null
                } else if (data.type === 'RUN_FINISHED') {
                  // Run finished
                  console.log('Run finished')
                  break
                }
              }
            } catch (e) {
              console.warn('Failed to parse streaming event:', line, e)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream was aborted by user')
      } else {
        console.error('Stream reading error:', error)
        signals.onResponse({ error: 'Stream reading error' })
      }
    } finally {
      reader.releaseLock()
      // Signal that the stream is closed
      if (signals.onClose) {
        signals.onClose()
      }
    }

  } catch (e) {
    const error = e as Error
    console.error('Connection error:', error)
    signals.onResponse({ error: `Connection error: ${error.message}` })
  }
}

const setupChatElement = async (): Promise<void> => {
  // Wait for the next tick and give deep-chat more time to initialize
  await nextTick()

  // Add a small delay to ensure deep-chat is fully loaded
  await new Promise(resolve => setTimeout(resolve, 100))

  if (!chatElement.value) {
    console.error('Chat element not found after initialization delay')
    return
  }

  try {
    // Configure the deep-chat element
    chatElement.value.history = []

    // Enable streaming properly for deep-chat
    chatElement.value.stream = true

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

    // Set up the connection handler with streaming support
    chatElement.value.connect = {
      handler: handleConnection
    }
  } catch (error) {
    console.error('Error setting up chat element:', error)
    // Fallback: try again after a longer delay
    setTimeout(() => {
      if (chatElement.value) {
        try {
          chatElement.value.stream = true
          console.log('Successfully set stream property on retry')
        } catch (e) {
          console.error('Failed to set stream property on retry:', e)
        }
      }
    }, 500)
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
