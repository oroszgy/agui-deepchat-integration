// Application constants and configuration
export const APP_CONSTANTS = {
    // Timing constants
    DUPLICATE_CHECK_WINDOW_MS: 5000,
    ELEMENT_INIT_DELAY_MS: 100,

    // Default styles
    DEFAULT_CHAT_STYLE: 'border-radius: 10px; width: 96vw; height: calc(100vh - 120px); padding-top: 10px; font-size: 1.2rem;',

    // HTTP constants
    HTTP_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
    },

    // Server-Sent Events constants
    SSE_PREFIX: 'data: ',
    SSE_DONE: '[DONE]',

    // Event types
    EVENT_TYPES: {
        TEXT_MESSAGE_START: 'TEXT_MESSAGE_START',
        TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
        TEXT_MESSAGE_END: 'TEXT_MESSAGE_END',
        RUN_STARTED: 'RUN_STARTED',
        RUN_FINISHED: 'RUN_FINISHED',
        TOOL_CALL_START: 'TOOL_CALL_START',
        TOOL_CALL_ARGS: 'TOOL_CALL_ARGS',
        TOOL_CALL_END: 'TOOL_CALL_END',
        TOOL_CALL_RESULT: 'TOOL_CALL_RESULT',
        ERROR: 'ERROR'
    } as const,

    // Message separators
    MESSAGE_SEPARATOR: '\n\n'
} as const

// Default configuration factory
export const createDefaultConfig = () => ({
    backendUrl: 'http://localhost:9000/',
    placeholder: 'Welcome to the demo!',
    introMessage: 'Hello, how can I help you?',
    style: APP_CONSTANTS.DEFAULT_CHAT_STYLE
})

// Logging utilities
export const Logger = {
    message: (action: string, data?: any) => console.log(`📝 ${action}:`, data),
    stream: (action: string, data?: any) => console.log(`🔄 ${action}`, data || ''),
    event: (type: string, data?: any) => console.log(`🎯 ${type} `, data),
    connection: (action: string, data?: any) => console.log(`🔌 ${action}`, data || ''),
    tool: (action: string, data?: any) => console.log(`🔧 ${action}:`, data),
    style: (style: string) => console.log('🎨 Applied chat style:', style),
    error: (action: string, error: any) => console.error(`❌ ${action}:`, error),
    warn: (action: string, data: any) => console.warn(`⚠️ ${action}:`, data),
    success: (action: string, data?: any) => console.log(`✅ ${action}`, data || ''),
}
