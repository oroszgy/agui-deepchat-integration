// Type definitions for AG-UI protocol and deep-chat component integration
import type {HttpAgent} from '@ag-ui/client'

// Re-export ag-ui types for convenience
export type {HttpAgent}

// Deep-chat component types
export interface DeepChatMessage {
    role: 'user' | 'ai' | 'assistant'
    text?: string
    content?: string
}

export interface DeepChatBody {
    messages?: DeepChatMessage[]
}

export interface DeepChatSignals {
    onResponse: (response: {
        role?: string,
        text?: string,
        html?: string,
        custom?: any,
        error?: string,
        overwrite?: boolean
    }) => void
    onOpen?: () => void
    onClose?: () => void
    stopClicked?: {
        listener: () => void
    }
}

export interface DeepChatElement extends HTMLElement {
    history: any[]
    connect: {
        handler: (body: DeepChatBody, signals: DeepChatSignals) => Promise<void>
        stream: boolean
    }
}

// AG-UI Message interface
export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system' | 'tool' | 'developer'
    content: string
    toolCalls?: ToolCall[]
}

// Tool call interfaces
export interface ToolCall {
  id: string // Unique ID for this tool call
  type: "function" // Type of tool call
  function: {
    name: string // Name of the function to call
    arguments: string // JSON-encoded string of arguments
  }
}

export interface ToolResponse {
    id: string
    role: 'tool'
    content: string
    toolCallId: string // References the original tool call
}

// Chat Configuration
export interface ChatConfig {
    backendUrl: string
    placeholder: string
    introMessage: string
    style?: string // Optional custom CSS style for the chat element
}
