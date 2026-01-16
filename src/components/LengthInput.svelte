<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parseImperial } from '../utils/format';

  export let visible: boolean = false;

  const dispatch = createEventDispatcher<{
    submit: { length: number };
    cancel: void;
  }>();

  let inputValue: string = '';
  let inputElement: HTMLInputElement;
  let error: string = '';

  $: if (visible && inputElement) {
    setTimeout(() => {
      inputElement.focus();
      inputElement.select();
    }, 0);
  }

  function handleSubmit(): void {
    const length = parseImperial(inputValue);
    if (length !== null && length > 0) {
      dispatch('submit', { length });
      close();
    } else {
      error = 'Invalid length format';
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      close();
    }
    error = '';
  }

  function close(): void {
    inputValue = '';
    error = '';
    dispatch('cancel');
  }
</script>

{#if visible}
  <div class="overlay" on:click={close} on:keydown={handleKeydown} role="button" tabindex="-1">
    <div class="modal" on:click|stopPropagation role="dialog">
      <h3>Set Segment Length</h3>
      <p class="help">Enter length in feet and inches (e.g., "10' 6\"" or "10.5")</p>

      <input
        type="text"
        bind:this={inputElement}
        bind:value={inputValue}
        on:keydown={handleKeydown}
        placeholder="e.g., 12' 6&quot;"
        class:error={!!error}
      />

      {#if error}
        <p class="error-message">{error}</p>
      {/if}

      <div class="buttons">
        <button class="cancel" on:click={close}>Cancel</button>
        <button class="submit" on:click={handleSubmit}>Apply</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--panel-bg);
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    border: 1px solid var(--border-color);
    min-width: 300px;
  }

  h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .help {
    margin: 0 0 16px 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 14px;
    background: var(--input-bg);
    color: var(--text-secondary);
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: var(--button-active);
  }

  input.error {
    border-color: #ef4444;
  }

  .error-message {
    margin: 8px 0 0 0;
    color: #ef4444;
    font-size: 12px;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  button {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cancel {
    background: var(--button-bg);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
  }

  .cancel:hover {
    background: var(--button-bg-hover);
  }

  .submit {
    background: var(--button-active);
    border: 1px solid var(--button-active);
    color: var(--text-primary);
  }

  .submit:hover {
    background: #0055aa;
  }
</style>