import {
  DeepChatElement,
  DeepChatBody,
  DeepChatSignals,
  AGUIMessage,
  AGUIRequestBody,
  StreamingEvent,
  AGUIEvent,
  OpenAIResponse
} from './types.js';

class PolicyAlignChat {
  // @ts-ignore
  private elementRef: DeepChatElement;
  private chatHistory: AGUIMessage[] = [];
  private threadId: string;
  private backendUrl: string;

  constructor(backendUrl: string = 'http://localhost:9000/') {
    this.backendUrl = backendUrl;
    this.threadId = `thread-${Date.now()}`;
    this.init();
  }

  private init(): void {
    // Wait for the component to load
    document.addEventListener('DOMContentLoaded', () => {
      this.setupChatElement();
    });

    // Fallback if DOMContentLoaded has already fired
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupChatElement();
      });
    } else {
      this.setupChatElement();
    }
  }

  private setupChatElement(): void {
    const element = document.getElementById("chat-element") as DeepChatElement;
    if (!element) {
      console.error('Chat element not found');
      return;
    }

    this.elementRef = element;
    this.configureElement();
  }

  private configureElement(): void {
    // Setting value via a property (easiest way)
    this.elementRef.history = [];
    this.elementRef.setAttribute(
      "introMessage",
      JSON.stringify({
        text: "Hello, how can I help you?",
      })
    );

    // AG-UI protocol connect handler with event handling
    this.elementRef.connect = {
      handler: this.handleConnection.bind(this)
    };
  }

  private async handleConnection(body: DeepChatBody, signals: DeepChatSignals): Promise<void> {
    try {
      // Map DeepChat roles to AG-UI roles and ensure correct structure
      const aguiMessages: AGUIMessage[] = (body.messages || []).map((m, index) => ({
        id: `msg-${Date.now()}-${index}`, // Unique message ID
        role: m.role === 'ai' ? 'assistant' : m.role as 'user' | 'assistant',
        content: m.text || m.content || ''
      }));

      // Update chat history with new messages
      for (const msg of aguiMessages) {
        const existingIndex = this.chatHistory.findIndex(h => h.id === msg.id);
        if (existingIndex === -1) {
          this.chatHistory.push(msg);
        }
      }

      // Print the complete chat history being sent
      console.log('Sending complete chat history:', this.chatHistory);

      if (!aguiMessages.length || !aguiMessages.some(m => m.role === 'user')) {
        signals.onResponse({ text: '[No user message to send]' });
        return;
      }

      const response = await this.sendToBackend();
      await this.handleResponse(response, signals);

    } catch (e) {
      const error = e as Error;
      signals.onResponse({ text: `[Handler error] ${error.message}` });
    }
  }

  private async sendToBackend(): Promise<Response> {
    // Build complete AG-UI request body with full chat history
    const requestBody: AGUIRequestBody = {
      threadId: this.threadId, // Use persistent thread ID
      runId: `run-${Date.now()}`,
      state: {
        conversationLength: this.chatHistory.length,
        lastMessageId: this.chatHistory[this.chatHistory.length - 1]?.id
      },
      tools: [],
      context: [],
      forwardedProps: {},
      messages: this.chatHistory // Send complete history, not just current messages
    };

    const response = await fetch(this.backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    return response;
  }

  private async handleResponse(response: Response, signals: DeepChatSignals): Promise<void> {
    if (!response.ok) {
      const errorText = await response.text();
      signals.onResponse({ text: `[Backend error ${response.status}]: ${errorText}` });
      return;
    }

    const text = await response.text();

    // Handle streaming response (Server-Sent Events)
    if (text.startsWith('data:') || text.includes('\ndata:')) {
      this.handleStreamingResponse(text, signals);
      return;
    }

    // Try to parse as regular JSON
    try {
      const data = JSON.parse(text);
      this.handleJsonResponse(data, signals);
    } catch (e) {
      const error = e as Error;
      signals.onResponse({ text: `[JSON parse error] ${error.message}` });
    }
  }

  private handleStreamingResponse(text: string, signals: DeepChatSignals): void {
    const lines = text.split('\n');
    let messageContent = '';
    let assistantMessageId: string | null = null;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonStr = line.substring(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            const data: StreamingEvent = JSON.parse(jsonStr);

            // Handle pydantic-ai AG-UI specific message format
            if (data.type === 'TEXT_MESSAGE_START' && data.messageId) {
              assistantMessageId = data.messageId;
            } else if (data.type === 'TEXT_MESSAGE_CONTENT' && data.delta) {
              messageContent += data.delta;
            }
          }
        } catch (e) {
          // Silently continue on parse errors
        }
      }
    }

    if (messageContent) {
      // Add assistant's response to chat history
      const assistantMessage: AGUIMessage = {
        id: assistantMessageId || `assistant-${Date.now()}`,
        role: 'assistant',
        content: messageContent
      };
      this.chatHistory.push(assistantMessage);

      signals.onResponse({ text: messageContent });
    } else {
      signals.onResponse({ text: '[No content found in streaming response]' });
    }
  }

  private handleJsonResponse(data: any, signals: DeepChatSignals): void {
    // AG-UI event handling
    if (Array.isArray(data)) {
      for (const event of data as AGUIEvent[]) {
        if (event.event === 'error') {
          signals.onResponse({ text: `[Error] ${event.data?.message || 'Unknown error'}` });
          return;
        } else if (event.event === 'system') {
          signals.onResponse({ text: `[System] ${event.data?.content || ''}` });
          return;
        } else if (event.event === 'message') {
          signals.onResponse({ text: event.data?.content || '' });
          return;
        }
      }
      signals.onResponse({ text: '[No message event in response]' });
    } else if (data.event) {
      const event = data as AGUIEvent;
      if (event.event === 'error') {
        signals.onResponse({ text: `[Error] ${event.data?.message || 'Unknown error'}` });
      } else if (event.event === 'system') {
        signals.onResponse({ text: `[System] ${event.data?.content || ''}` });
      } else if (event.event === 'message') {
        signals.onResponse({ text: event.data?.content || '' });
      } else {
        signals.onResponse({ text: `[Unknown event: ${event.event}]` });
      }
    } else if ((data as OpenAIResponse).choices) {
      const openAIData = data as OpenAIResponse;
      signals.onResponse({ text: openAIData.choices?.[0]?.message?.content || '' });
    } else {
      signals.onResponse({ text: '[Unrecognized response format]' });
    }
  }
}

// Initialize the application
new PolicyAlignChat();
