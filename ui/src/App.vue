<template>
  <h1>Policy align DEMO</h1>
  <!-- demo/textInput are examples of passing an object directly into a property (if this does not work refer to data values like in the history example) -->
  <!-- history is an example of passing a data object into a property -->
  <deep-chat
    :demo="true"
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
