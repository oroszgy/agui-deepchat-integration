<template>
  <h1>Deep Chat</h1>
  <!-- demo/textInput are examples of passing an object directly into a property (if this does not work refer to data values like in the history example) -->
  <!-- history is an example of passing a data object into a property -->
  <deep-chat
    :demo="true"
    :textInput="{ placeholder: { text: 'Welcome to the demo!' } }"
    :history="history"
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
