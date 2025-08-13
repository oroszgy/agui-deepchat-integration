import type {DeepChatBody, Message, ToolCall} from './types'
import {APP_CONSTANTS} from './constants'

export const MessageUtils = {
    create: (id: string, role: Message['role'], content: string): Message => ({id, role, content}),

    generateId: (index: number): string => `msg-${Date.now()}-${index}`,

    convertFromDeepChat: (messages: DeepChatBody['messages'] = []): Message[] =>
        messages.map((m, index) =>
            MessageUtils.create(
                MessageUtils.generateId(index),
                m.role === 'ai' ? 'assistant' : (m.role as 'user' | 'assistant'),
                m.text || m.content || ''
            )
        ),

    isDuplicate: (msg: Message, existingMessages: Message[]): boolean =>
        existingMessages.some(h =>
            h.content === msg.content &&
            h.role === 'user' &&
            Math.abs(Date.now() - parseInt(h.id.split('-')[1])) < APP_CONSTANTS.DUPLICATE_CHECK_WINDOW_MS
        ),

    filterNewUserMessages: (messages: Message[], existingMessages: Message[]): Message[] =>
        messages.filter(msg =>
            msg.role === 'user' && !MessageUtils.isDuplicate(msg, existingMessages)
        )
}

export const RequestUtils = {
    createBody: (chatHistory: Message[], threadId: string) => ({
        messages: chatHistory,
        runId: `run-${Date.now()}`,
        state: '',
        threadId,
        tools: [],
        context: [],
        forwardedProps: {},
    })
}

export const ToolCallUtils = {
    updateToolCallArgs: (toolCall: ToolCall, delta: string): ToolCall => ({
        ...toolCall,
        function: {
            ...toolCall.function,
            arguments: toolCall.function.arguments + delta,
        }
    })
}
