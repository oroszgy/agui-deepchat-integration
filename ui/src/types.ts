// Type definitions for AG-UI protocol and deep-chat component integration
import type { HttpAgent } from '@ag-ui/client'

// Re-export ag-ui types for convenience
export type { HttpAgent }

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

// AG-UI Message interface (compatible with ag-ui client)
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content?: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
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

// Chat Configuration
export interface ChatConfig {
  backendUrl: string;
  placeholder: string;
  introMessage: string;
}

// AG-UI Event Types
export enum AGUIEventType {
  TEXT_MESSAGE_START = 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT = 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END = 'TEXT_MESSAGE_END',
  RUN_STARTED = 'RUN_STARTED',
  RUN_FINISHED = 'RUN_FINISHED',
  RUN_ERROR = 'RUN_ERROR'
}
