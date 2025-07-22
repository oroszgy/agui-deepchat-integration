// Type definitions for AG-UI protocol and deep-chat component integration

// Deep-chat component types
export interface DeepChatMessage {
  role: 'user' | 'ai' | 'assistant';
  text?: string;
  content?: string;
}

export interface DeepChatBody {
  messages?: DeepChatMessage[];
}

export interface DeepChatSignals {
  onResponse: (response: { text: string }) => void;
}

export interface DeepChatElement extends HTMLElement {
  history: any[];
  connect: {
    handler: (body: DeepChatBody, signals: DeepChatSignals) => Promise<void>;
  };
}

// AG-UI Protocol Types (matching specification from https://docs.ag-ui.com/concepts/events)

// Event Types Enum - Updated to match AG-UI specification
export enum AGUIEventType {
  // Lifecycle Events
  RUN_STARTED = 'RUN_STARTED',
  RUN_FINISHED = 'RUN_FINISHED',
  RUN_ERROR = 'RUN_ERROR',
  STEP_STARTED = 'STEP_STARTED',
  STEP_FINISHED = 'STEP_FINISHED',

  // Text Message Events
  TEXT_MESSAGE_START = 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT = 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END = 'TEXT_MESSAGE_END',

  // Tool Call Events
  TOOL_CALL_START = 'TOOL_CALL_START',
  TOOL_CALL_ARGS = 'TOOL_CALL_ARGS',
  TOOL_CALL_END = 'TOOL_CALL_END',
  TOOL_CALL_RESULT = 'TOOL_CALL_RESULT',

  // State Management Events
  STATE_SNAPSHOT = 'STATE_SNAPSHOT',
  STATE_DELTA = 'STATE_DELTA',
  MESSAGES_SNAPSHOT = 'MESSAGES_SNAPSHOT',

  // Special Events
  RAW = 'RAW',
  CUSTOM = 'CUSTOM',

  // Legacy support
  MESSAGE_START = 'MESSAGE_START',
  MESSAGE_END = 'MESSAGE_END',
  COMPLETION = 'COMPLETION',
  INTERRUPT = 'INTERRUPT',
  RESUME = 'RESUME'
}

// Base Event Interface
export interface BaseAGUIEvent {
  type: AGUIEventType;
  timestamp?: string;
  rawEvent?: any;
}

// Base Message Interface
export interface BaseMessage {
  id: string;
  role: string;
  content?: string;
  name?: string;
}

// Core AG-UI Message Structure - Updated to match specification
export interface AGUIMessage extends BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content?: string;
  name?: string;
  toolCalls?: ToolCall[]; // For assistant messages
  toolCallId?: string;   // For tool messages
}

// Tool Call Structure
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// Tool Definition
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// JSON Patch Operations for State Deltas (RFC 6902)
export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string; // JSON Pointer (RFC 6901)
  value?: any; // For add, replace operations
  from?: string; // For move, copy operations
}

// Lifecycle Events
export interface RunStartedEvent extends BaseAGUIEvent {
  type: AGUIEventType.RUN_STARTED;
  threadId: string;
  runId: string;
}

export interface RunFinishedEvent extends BaseAGUIEvent {
  type: AGUIEventType.RUN_FINISHED;
  threadId: string;
  runId: string;
  result?: any;
}

export interface RunErrorEvent extends BaseAGUIEvent {
  type: AGUIEventType.RUN_ERROR;
  message: string;
  code?: string;
  details?: any;
}

export interface StepStartedEvent extends BaseAGUIEvent {
  type: AGUIEventType.STEP_STARTED;
  stepName: string;
}

export interface StepFinishedEvent extends BaseAGUIEvent {
  type: AGUIEventType.STEP_FINISHED;
  stepName: string;
}

// Text Message Events
export interface TextMessageStartEvent extends BaseAGUIEvent {
  type: AGUIEventType.TEXT_MESSAGE_START;
  messageId: string;
  role: 'assistant' | 'user';
  parentMessageId?: string;
}

export interface TextMessageContentEvent extends BaseAGUIEvent {
  type: AGUIEventType.TEXT_MESSAGE_CONTENT;
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent extends BaseAGUIEvent {
  type: AGUIEventType.TEXT_MESSAGE_END;
  messageId: string;
}

// Tool Call Events
export interface ToolCallStartEvent extends BaseAGUIEvent {
  type: AGUIEventType.TOOL_CALL_START;
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface ToolCallArgsEvent extends BaseAGUIEvent {
  type: AGUIEventType.TOOL_CALL_ARGS;
  toolCallId: string;
  delta: string; // JSON fragment to append to arguments
}

export interface ToolCallEndEvent extends BaseAGUIEvent {
  type: AGUIEventType.TOOL_CALL_END;
  toolCallId: string;
}

export interface ToolCallResultEvent extends BaseAGUIEvent {
  type: AGUIEventType.TOOL_CALL_RESULT;
  messageId: string;
  toolCallId: string;
  content: string;
  role?: 'tool';
}

// State Management Events
export interface StateSnapshotEvent extends BaseAGUIEvent {
  type: AGUIEventType.STATE_SNAPSHOT;
  snapshot: any; // Complete state object
}

export interface StateDeltaEvent extends BaseAGUIEvent {
  type: AGUIEventType.STATE_DELTA;
  delta: JsonPatchOperation[]; // Array of JSON Patch operations
}

export interface MessagesSnapshotEvent extends BaseAGUIEvent {
  type: AGUIEventType.MESSAGES_SNAPSHOT;
  messages: Message[]; // Updated to use the more specific Message union type
}

// Special Events
export interface RawEvent extends BaseAGUIEvent {
  type: AGUIEventType.RAW;
  event: any; // Original event data
  source?: string; // Optional source identifier
}

export interface CustomEvent extends BaseAGUIEvent {
  type: AGUIEventType.CUSTOM;
  name: string; // Name of the custom event
  value: any; // Value associated with the event
}

// Legacy Events for backward compatibility
export interface MessageStartEvent extends BaseAGUIEvent {
  type: AGUIEventType.MESSAGE_START;
  [key: string]: any;
}

export interface MessageEndEvent extends BaseAGUIEvent {
  type: AGUIEventType.MESSAGE_END;
  [key: string]: any;
}

export interface CompletionEvent extends BaseAGUIEvent {
  type: AGUIEventType.COMPLETION;
  [key: string]: any;
}

export interface InterruptEvent extends BaseAGUIEvent {
  type: AGUIEventType.INTERRUPT;
  [key: string]: any;
}

export interface ResumeEvent extends BaseAGUIEvent {
  type: AGUIEventType.RESUME;
  [key: string]: any;
}

// Specific Message Types
export interface UserMessage extends BaseMessage {
  id: string;
  role: 'user';
  content: string;
  name?: string;
}

export interface AssistantMessage extends BaseMessage {
  id: string;
  role: 'assistant';
  content?: string;
  name?: string;
  toolCalls?: ToolCall[];
}

export interface SystemMessage extends BaseMessage {
  id: string;
  role: 'system';
  content: string;
  name?: string;
}

export interface ToolMessage extends BaseMessage {
  id: string;
  role: 'tool';
  content: string;
  toolCallId: string;
}

export interface DeveloperMessage extends BaseMessage {
  id: string;
  role: 'developer';
  content: string;
  name?: string;
}

// Message type union for type safety
export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ToolMessage
  | DeveloperMessage;

// Union type for all AG-UI events
export type AGUIEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | StepStartedEvent
  | StepFinishedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | ToolCallResultEvent
  | StateSnapshotEvent
  | StateDeltaEvent
  | MessagesSnapshotEvent
  | RawEvent
  | CustomEvent
  | MessageStartEvent
  | MessageEndEvent
  | CompletionEvent
  | InterruptEvent
  | ResumeEvent;

// AG-UI Request Body (for sending to agents)
export interface AGUIRequestBody {
  threadId: string;
  runId: string;
  state?: any;
  tools?: Tool[];
  context?: any[];
  forwardedProps?: Record<string, any>;
  messages: AGUIMessage[];
}

// Chat Configuration
export interface ChatConfig {
  backendUrl: string;
  placeholder: string;
  introMessage: string;
}

// Legacy types for backward compatibility
export interface StreamingEvent {
  type: string;
  messageId?: string;
  toolCallId?: string;
  delta?: string;
  data?: any;
}

export interface LegacyAGUIEvent {
  event: 'error' | 'system' | 'message';
  data?: {
    message?: string;
    content?: string;
  };
}

export interface OpenAIResponse {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

// Global declarations
declare global {
  interface Window {
    HTMLElement: typeof HTMLElement;
  }
}

// Vue component type declarations
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
