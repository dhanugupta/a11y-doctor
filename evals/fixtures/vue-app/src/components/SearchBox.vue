<template>
  <div class="search">
    <!-- expect: form-label -->
    <input v-model="query" placeholder="Search">
    <label for="cat">Category</label>
    <select id="cat" v-model="cat"><option>All</option></select>
    <!-- expect: click-without-keyboard -->
    <span class="clear" @click="query = ''">×</span>
    <!-- expect: control-name -->
    <button @click="submit"><SearchIcon /></button>
    <button :aria-label="t('submit')" @click="submit"><SearchIcon /></button>
    <img :src="logo" :alt="brand">
    <!-- expect: mouse-only -->
    <div @mouseenter="showTip = true" @mouseleave="showTip = false">?</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const query = ref<string>('');
</script>

<style scoped>
/* expect: focus-outline-removed */
button:focus { outline: none; }
</style>
