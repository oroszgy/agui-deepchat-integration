// Type definitions for deep-chat component and application interfaces

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

export interface AGUIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AGUIRequestBody {
  threadId: string;
  runId: string;
  state: {
    conversationLength: number;
    lastMessageId?: string;
  };
  tools: any[];
  context: any[];
  forwardedProps: Record<string, any>;
  messages: AGUIMessage[];
}

export interface StreamingEvent {
  type: string;
  messageId?: string;
  delta?: string;
}

export interface AGUIEvent {
  event: 'error' | 'system' | 'message';
  data?: {
    message?: string;
    content?: string;
  };
}

export interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// Vue-specific types
export interface ChatConfig {
  backendUrl: string;
  placeholder?: string;
  introMessage?: string;
}

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
