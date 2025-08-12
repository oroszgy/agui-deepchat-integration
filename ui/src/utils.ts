// Utility functions for message processing and validation
import type {DeepChatBody, Message, ToolCall} from './types'
import {APP_CONSTANTS, Logger} from './constants'

// Message creation and validation utilities
export const MessageUtils = {
    create: (id: string, role: Message['role'], content: string): Message => {
        const message = {id, role, content}
        // Logger.message('Created message', message)
        return message
    },

    generateId: (index: number): string => `msg-${Date.now()}-${index}`,

    convertFromDeepChat: (messages: DeepChatBody['messages'] = []): Message[] => {
        // Logger.message('Converting DeepChat messages', messages)
        const converted = messages.map((m, index) =>
            MessageUtils.create(
                MessageUtils.generateId(index),
                m.role === 'ai' ? 'assistant' : (m.role as 'user' | 'assistant'),
                m.text || m.content || ''
            )
        )
        // Logger.message('Converted messages', converted)
        return converted
    },

    isDuplicate: (msg: Message, existingMessages: Message[]): boolean => {
        const isDuplicate = existingMessages.some(h =>
            h.content === msg.content &&
            h.role === 'user' &&
            Math.abs(Date.now() - parseInt(h.id.split('-')[1])) < APP_CONSTANTS.DUPLICATE_CHECK_WINDOW_MS
        )
        // Logger.message(`Checking duplicate for message "${msg.content}"`, isDuplicate)
        return isDuplicate
    },

    filterNewUserMessages: (messages: Message[], existingMessages: Message[]): Message[] => {
        return messages.filter(msg =>
            msg.role === 'user' && !MessageUtils.isDuplicate(msg, existingMessages)
        )
    }
}

// Request body creation utilities
export const RequestUtils = {
    createBody: (chatHistory: Message[], threadId: string) => {
        const body = {
            messages: chatHistory,
            runId: `run-${Date.now()}`,
            state: "",
            threadId: threadId,
            tools: [],
            context: [],
            forwardedProps: {},
        }
        Logger.message('Created request body', body)
        return body
    }
}


// Validation utilities
export const ValidationUtils = {
    hasRequiredMessageId: (data: any): boolean => {
        const isValid = data && data.messageId
        if (!isValid) {
            Logger.warn('Missing messageId in event', data)
        }
        return isValid
    },

    hasRequiredDelta: (data: any): boolean => {
        const isValid = data && data.delta
        if (!isValid) {
            Logger.warn('Missing delta in content event', data)
        }
        return isValid
    },

    hasUserMessage: (messages: Message[]): boolean => {
        return messages.some(m => m.role === 'user')
    }
}

// Tool call utilities
export const ToolCallUtils = {
    createToolCall: (id: string, name: string): ToolCall => {
        return {
            id,
            name,
            args: '',
            status: 'started'
        }
    },

    updateToolCallArgs: (toolCall: ToolCall, delta: string): ToolCall => {
        return {
            ...toolCall,
            args: toolCall.args + delta,
            status: 'in_progress'
        }
    },

    completeToolCall: (toolCall: ToolCall, result?: string): ToolCall => {
        return {
            ...toolCall,
            result: result || '',
            status: 'completed'
        }
    },

    findToolCall: (toolCalls: ToolCall[], id: string): ToolCall | undefined => {
        return toolCalls.find(tc => tc.id === id)
    },

    formatToolCallDisplay: (toolCall: ToolCall): string => {
        const statusIcon = toolCall.status === 'completed' ? '✅' :
            toolCall.status === 'in_progress' ? '⏳' : '🔄'

        let display = `${statusIcon} **Tool Call: ${toolCall.name}**\n`

        if (toolCall.args) {
            display += `📋 Arguments: \`${toolCall.args}\`\n`
        }

        if (toolCall.result) {
            display += `📤 Result: ${toolCall.result}\n`
        }

        return display + '\n'
    }
}
