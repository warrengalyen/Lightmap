<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    lightDefinitions,
    addLightDefinition,
    updateLightDefinition,
    deleteLightDefinition,
    addLightDefinitionFromIES,
    setSelectedDefinition
  } from '../stores/lightDefinitionsStore';
  import { readIESFile } from '../lighting/IESParser';
  import type { LightDefinition } from '../types';

  export let visible: boolean = false;

  const dispatch = createEventDispatcher<{ close: void }>();

  let definitions: LightDefinition[] = [];
  $: definitions = $lightDefinitions;

  // Form state for creating/editing
  let isCreating = false;
  let isEditing = false;
  let editingId: string | null = null;
  let formName = '';
  let formLumen = 800;
  let formBeamAngle = 60;
  let formWarmth = 3000;
  let formError = '';

  // IES import
  let iesFileInput: HTMLInputElement;
  let iesImportError: string | null = null;
  let iesImportSuccess: string | null = null;

  function close(): void {
    resetForm();
    dispatch('close');
  }

  function resetForm(): void {
    isCreating = false;
    isEditing = false;
    editingId = null;
    formName = '';
    formLumen = 800;
    formBeamAngle = 60;
    formWarmth = 3000;
    formError = '';
  }

  function startCreate(): void {
    resetForm();
    isCreating = true;
  }

  function startEdit(def: LightDefinition): void {
    if (!def.id.startsWith('custom-')) return; // Can't edit built-ins
    resetForm();
    isEditing = true;
    editingId = def.id;
    formName = def.name;
    formLumen = def.lumen;
    formBeamAngle = def.beamAngle;
    formWarmth = def.warmth;
  }

  function validateForm(): boolean {
    if (!formName.trim()) {
      formError = 'Name is required';
      return false;
    }
    if (formLumen < 1 || formLumen > 100000) {
      formError = 'Lumens must be between 1 and 100,000';
      return false;
    }
    if (formBeamAngle < 1 || formBeamAngle > 180) {
      formError = 'Beam angle must be between 1 and 180 degrees';
      return false;
    }
    if (formWarmth < 1000 || formWarmth > 10000) {
      formError = 'Color temperature must be between 1000K and 10000K';
      return false;
    }
    formError = '';
    return true;
  }

  function saveDefinition(): void {
    if (!validateForm()) return;

    if (isCreating) {
      const newDef = addLightDefinition({
        name: formName.trim(),
        lumen: formLumen,
        beamAngle: formBeamAngle,
        warmth: formWarmth,
      });
      setSelectedDefinition(newDef.id);
    } else if (isEditing && editingId) {
      updateLightDefinition(editingId, {
        name: formName.trim(),
        lumen: formLumen,
        beamAngle: formBeamAngle,
        warmth: formWarmth,
      });
    }

    resetForm();
  }

  function handleDelete(id: string): void {
    if (!id.startsWith('custom-')) return;
    if (confirm('Delete this light type? This cannot be undone.')) {
      deleteLightDefinition(id);
    }
  }

  function triggerIESImport(): void {
    iesFileInput?.click();
  }

  async function handleIESFileSelect(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    iesImportError = null;
    iesImportSuccess = null;

    const result = await readIESFile(file);

    if (result.success && result.data) {
      const newDef = addLightDefinitionFromIES(result.data);
      setSelectedDefinition(newDef.id);
      iesImportSuccess = `Imported: ${result.data.lumens}lm, ${result.data.beamAngle}° beam`;

      setTimeout(() => {
        iesImportSuccess = null;
      }, 3000);
    } else {
      iesImportError = result.error || 'Failed to parse IES file';
    }

    input.value = '';
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (isCreating || isEditing) {
        resetForm();
      } else {
        close();
      }
    }
  }

  function isBuiltIn(def: LightDefinition): boolean {
    return !def.id.startsWith('custom-');
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
  <div class="modal-overlay" on:click={close} on:keydown={(e) => e.key === 'Enter' && close()} role="button" tabindex="0">
    <div class="modal" on:click|stopPropagation on:keydown|stopPropagation role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h2>Light Types</h2>
        <button class="close-button" on:click={close} title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        {#if isCreating || isEditing}
          <div class="form-section">
            <h3>{isCreating ? 'Create New Light Type' : 'Edit Light Type'}</h3>

            {#if formError}
              <div class="form-error">{formError}</div>
            {/if}

            <label class="form-field">
              <span>Name</span>
              <input
                type="text"
                bind:value={formName}
                placeholder="e.g., My Custom Light"
              />
            </label>

            <label class="form-field">
              <span>Lumens</span>
              <div class="input-with-unit">
                <input
                  type="number"
                  bind:value={formLumen}
                  min="1"
                  max="100000"
                  step="50"
                />
                <span class="unit">lm</span>
              </div>
            </label>

            <label class="form-field">
              <span>Beam Angle</span>
              <div class="input-with-unit">
                <input
                  type="number"
                  bind:value={formBeamAngle}
                  min="1"
                  max="180"
                  step="5"
                />
                <span class="unit">°</span>
              </div>
            </label>

            <label class="form-field">
              <span>Color Temperature</span>
              <div class="input-with-unit">
                <input
                  type="number"
                  bind:value={formWarmth}
                  min="1000"
                  max="10000"
                  step="100"
                />
                <span class="unit">K</span>
              </div>
            </label>

            <div class="form-actions">
              <button class="btn btn-secondary" on:click={resetForm}>Cancel</button>
              <button class="btn btn-primary" on:click={saveDefinition}>
                {isCreating ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        {:else}
          <div class="actions-bar">
            <button class="btn btn-primary" on:click={startCreate}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Light Type
            </button>
            <button class="btn btn-secondary" on:click={triggerIESImport}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import IES
            </button>
            <input
              type="file"
              accept=".ies"
              bind:this={iesFileInput}
              on:change={handleIESFileSelect}
              class="hidden-input"
            />
          </div>

          {#if iesImportError}
            <div class="import-message error">{iesImportError}</div>
          {/if}
          {#if iesImportSuccess}
            <div class="import-message success">{iesImportSuccess}</div>
          {/if}

          <div class="definitions-list">
            <div class="list-section">
              <h4>Built-in Types</h4>
              {#each definitions.filter(d => isBuiltIn(d)) as def (def.id)}
                <div class="definition-item">
                  <div class="definition-info">
                    <span class="definition-name">{def.name}</span>
                    <span class="definition-specs">
                      {def.lumen} lm &bull; {def.beamAngle}° &bull; {def.warmth}K
                    </span>
                  </div>
                </div>
              {/each}
            </div>

            {#if definitions.some(d => !isBuiltIn(d))}
              <div class="list-section">
                <h4>Custom Types</h4>
                {#each definitions.filter(d => !isBuiltIn(d)) as def (def.id)}
                  <div class="definition-item custom">
                    <div class="definition-info">
                      <span class="definition-name">{def.name}</span>
                      <span class="definition-specs">
                        {def.lumen} lm &bull; {def.beamAngle}° &bull; {def.warmth}K
                      </span>
                    </div>
                    <div class="definition-actions">
                      <button
                        class="icon-btn"
                        on:click={() => startEdit(def)}
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        class="icon-btn delete"
                        on:click={() => handleDelete(def.id)}
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    width: 480px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--text-muted);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: var(--button-bg-hover);
    color: var(--text-primary);
  }

  .close-button svg {
    width: 20px;
    height: 20px;
  }

  .modal-body {
    padding: 16px 20px;
    overflow-y: auto;
    flex: 1;
  }

  .actions-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn svg {
    width: 16px;
    height: 16px;
  }

  .btn-primary {
    background: var(--button-active);
    border-color: var(--button-active);
    color: white;
  }

  .btn-primary:hover {
    filter: brightness(1.1);
  }

  .btn-secondary {
    background: var(--button-bg);
    color: var(--text-secondary);
  }

  .btn-secondary:hover {
    background: var(--button-bg-hover);
  }

  .hidden-input {
    display: none;
  }

  .import-message {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 12px;
  }

  .import-message.error {
    background: #2d1f1f;
    border: 1px solid #3e2828;
    color: #ff6b6b;
  }

  .import-message.success {
    background: #1f2d1f;
    border: 1px solid #28382e;
    color: #6bff6b;
  }

  .definitions-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .list-section h4 {
    margin: 0 0 8px 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .definition-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    margin-bottom: 6px;
  }

  .definition-item.custom {
    border-color: var(--button-active);
    border-style: dashed;
  }

  .definition-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .definition-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .definition-specs {
    font-size: 11px;
    color: var(--text-muted);
  }

  .definition-actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    color: var(--text-muted);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    background: var(--button-bg-hover);
    color: var(--text-primary);
  }

  .icon-btn.delete:hover {
    background: #3e2828;
    color: #ff6b6b;
  }

  .icon-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Form styles */
  .form-section h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .form-error {
    padding: 8px 12px;
    background: #2d1f1f;
    border: 1px solid #3e2828;
    border-radius: 6px;
    color: #ff6b6b;
    font-size: 12px;
    margin-bottom: 12px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .form-field span {
    font-size: 12px;
    color: var(--text-muted);
  }

  .form-field input {
    padding: 8px 12px;
    border: 1px solid var(--input-border);
    border-radius: 6px;
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 13px;
  }

  .form-field input:focus {
    outline: none;
    border-color: var(--button-active);
  }

  .input-with-unit {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .input-with-unit input {
    flex: 1;
  }

  .input-with-unit .unit {
    font-size: 13px;
    color: var(--text-muted);
    min-width: 24px;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
  }
</style>
