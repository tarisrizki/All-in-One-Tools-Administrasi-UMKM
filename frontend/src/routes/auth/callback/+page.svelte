<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let busy = $state(false);
  let error = $state('');

  async function google() {
    if (!supabase) { error = 'VITE_SUPABASE_URL belum diisi (.env)'; return;...[truncated]