<template>
  <div id="app">
    <Upload />
  </div>
</template>

<script>
import Upload from "./components/Upload_v1.vue";

export default {
  name: "App",
  components: {
    Upload,
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
