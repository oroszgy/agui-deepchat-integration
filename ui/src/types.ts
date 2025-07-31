// Type definitions for deep-chat component integration with ag-ui library
import { EventType } from '@ag-ui/core'

// Define AG-UI compatible types based on the protocol specification
export type AGUIEventType = keyof typeof EventType

export interface AGUIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content?: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

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

// AG-UI Event interface
export interface AGUIEvent {
  type: AGUIEventType;
  data?: any;
  timestamp?: string;
}

// Application-specific types
export interface ChatConfig {
  backendUrl: string;
  placeholder?: string;
  introMessage?: string;
}

export interface AGUIRequestBody {
  messages: AGUIMessage[];
  threadId: string;
  stream?: boolean;
}
