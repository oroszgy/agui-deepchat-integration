<template>
  <h1>Policy align DEMO</h1>
  <!-- demo/textInput are examples of passing an object directly into a property (if this does not work refer to data values like in the history example) -->
  <!-- history is an example of passing a data object into a property -->
  <deep-chat
    :textInput="{ placeholder: { text: 'Welcome to the demo!' } }"
    :history="history"
    :style="{
      borderRadius: '10px',
      width: '96vw',
      height: 'calc(100vh - 120px)',
      paddingTop: '10px',
      fontSize: '1.2rem'
    }"
    :mixedfiles="{ files: { maxNumberOfFiles: 2, acceptedFormats: '.pdf,.md,.docx' } }"
    :connect="async (messages, files) => {
      // Format request for AG-UI protocol
      const payload = {
        messages: messages.map(m => ({
          role: m.role === 'ai' ? 'assistant' : m.role,
          content: m.text || m.content || ''
        })),
        files: files // remove if AG-UI does not support files
      };
      const response = await fetch('http://localhost:9000/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      // Parse AG-UI events/messages to DeepChat format
      if (data.events) {
        return data.events.map(e => ({
          role: e.role === 'assistant' ? 'ai' : e.role,
          text: e.content || e.text || ''
        }));
      }
      if (data.role && data.content) {
        return [{
          role: data.role === 'assistant' ? 'ai' : data.role,
          text: data.content
        }];
      }
      return [];
    }"
    :demo="false"
  />
</template>

<script>
import { ref } from 'vue';
import 'deep-chat';

export default {
  name: 'App',
  setup() {
    const history = ref([
      { role: 'user', text: 'Hey, how are you today?' },
      { role: 'ai', text: 'I am doing very well!' },
    ]);
    return { history };
  },
};
</script>

<style>
div {
  font-family: sans-serif;
  text-align: center;
  justify-content: center;
  display: grid;
}
</style>
