/**
 * Chat View - Main chat interface like VS Code Copilot
 * Supports multiple AI providers
 */

import { 
  ItemView, 
  WorkspaceLeaf, 
  setIcon,
  MarkdownRenderer,
  TFile,
  Notice,
} from 'obsidian';
import { ChatMessage, ChatSession, AIProvider } from '../model/AIProvider';
import { ProviderManager } from '../providers/ProviderManager';
import { ChatHistoryManager } from '../data/ChatHistoryManager';
import type { Ollama } from '../Ollama';

export const CHAT_VIEW_TYPE = 'ollama-chat-view';

export class ChatView extends ItemView {
  private plugin: Ollama;
  private providerManager: ProviderManager;
  private historyManager: ChatHistoryManager;
  private session: ChatSession;
  private messagesContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private inputField: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private cancelButton: HTMLButtonElement;
  private modelSelect: HTMLSelectElement;
  private providerSelect: HTMLSelectElement;
  private attachButton: HTMLButtonElement;
  private attachedNote: { path: string; content: string } | null = null;
  private currentAbortController: AbortController | null = null;
  private isGenerating = false;

  constructor(leaf: WorkspaceLeaf, plugin: Ollama) {
    super(leaf);
    this.plugin = plugin;
    this.providerManager = new ProviderManager(plugin.settings.providers);
    this.providerManager.setActiveProvider(plugin.settings.activeProvider);
    this.historyManager = new ChatHistoryManager(plugin.app);
    this.session = this.createNewSession();
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return '🦙 AI Chat';
  }

  getIcon(): string {
    return 'message-square';
  }

  private createNewSession(): ChatSession {
    return {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      model: this.plugin.settings.defaultModel,
      provider: this.providerManager.getActiveProviderId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('ollama-chat-container');
    
    // Add RTL support for Persian/Arabic
    const isRTL = document.documentElement.dir === 'rtl' || 
                  window.getComputedStyle(document.documentElement).direction === 'rtl';
    if (isRTL) {
      container.classList.add('rtl');
      container.setAttribute('dir', 'rtl');
    }

    // Header
    const header = container.createDiv({ cls: 'ollama-chat-header' });
    this.createHeader(header);

    // Messages container
    this.messagesContainer = container.createDiv({ cls: 'ollama-chat-messages' });
    
    // Welcome message
    this.addWelcomeMessage();

    // Input container
    this.inputContainer = container.createDiv({ cls: 'ollama-chat-input-container' });
    this.createInputArea(this.inputContainer);

    // Load providers and models
    await this.loadProviders();
    await this.loadModels();
  }

  private createHeader(header: HTMLElement) {
    // Title
    const titleContainer = header.createDiv({ cls: 'ollama-chat-title' });
    const icon = titleContainer.createSpan({ cls: 'ollama-chat-icon' });
    setIcon(icon, 'bot');
    titleContainer.createSpan({ text: ' Chat' });

    // Controls
    const controls = header.createDiv({ cls: 'ollama-chat-controls' });

    // Provider selector
    this.providerSelect = controls.createEl('select', { cls: 'ollama-provider-select' });
    this.providerSelect.addEventListener('change', async () => {
      this.providerManager.setActiveProvider(this.providerSelect.value);
      this.session.provider = this.providerSelect.value;
      await this.loadModels();
    });

    // Model selector
    this.modelSelect = controls.createEl('select', { cls: 'ollama-model-select' });
    this.modelSelect.createEl('option', { 
      value: this.plugin.settings.defaultModel, 
      text: this.plugin.settings.defaultModel 
    });
    this.modelSelect.addEventListener('change', () => {
      this.session.model = this.modelSelect.value;
    });

    // New chat button
    const newChatBtn = controls.createEl('button', { cls: 'ollama-btn ollama-btn-icon' });
    setIcon(newChatBtn, 'plus');
    newChatBtn.title = 'New Chat';
    newChatBtn.addEventListener('click', () => this.startNewChat());

    // Clear button
    const clearBtn = controls.createEl('button', { cls: 'ollama-btn ollama-btn-icon' });
    setIcon(clearBtn, 'trash-2');
    clearBtn.title = 'Clear Chat';
    clearBtn.addEventListener('click', () => this.clearChat());
  }

  private createInputArea(container: HTMLElement) {
    // Attachment preview
    const attachmentPreview = container.createDiv({ cls: 'ollama-attachment-preview', attr: { style: 'display: none;' } });
    
    // Input row
    const inputRow = container.createDiv({ cls: 'ollama-input-row' });

    // Attach button
    this.attachButton = inputRow.createEl('button', { cls: 'ollama-btn ollama-btn-icon ollama-attach-btn' });
    setIcon(this.attachButton, 'paperclip');
    this.attachButton.title = 'Attach current note';
    this.attachButton.addEventListener('click', () => this.attachCurrentNote(attachmentPreview));

    // Text input
    this.inputField = inputRow.createEl('textarea', {
      cls: 'ollama-chat-input',
      attr: { 
        placeholder: 'Ask anything... (Enter to send, Shift+Enter for new line)',
        rows: '1'
      }
    });

    // Auto-resize textarea
    this.inputField.addEventListener('input', () => {
      this.inputField.style.height = 'auto';
      this.inputField.style.height = Math.min(this.inputField.scrollHeight, 150) + 'px';
    });

    // Keyboard shortcuts: Enter to send, Shift+Enter for newline
    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.sendButton = inputRow.createEl('button', { cls: 'ollama-btn ollama-btn-primary ollama-send-btn' });
    setIcon(this.sendButton, 'send');
    this.sendButton.title = 'Send message';
    this.sendButton.addEventListener('click', () => this.sendMessage());

    // Cancel button (hidden by default)
    this.cancelButton = inputRow.createEl('button', { 
      cls: 'ollama-btn ollama-btn-danger ollama-cancel-btn',
      attr: { style: 'display: none;' }
    });
    setIcon(this.cancelButton, 'x');
    this.cancelButton.title = 'Cancel generation';
    this.cancelButton.addEventListener('click', () => this.cancelGeneration());
  }

  private async loadProviders() {
    this.providerSelect.empty();
    
    const providerInfo = this.providerManager.getProviderInfo();
    for (const info of providerInfo) {
      if (info.available) {
        this.providerSelect.createEl('option', { 
          value: info.id, 
          text: info.name 
        });
      }
    }
    
    this.providerSelect.value = this.providerManager.getActiveProviderId();
  }

  private async loadModels() {
    const provider = this.providerManager.getActiveProvider();
    const models = await provider.getModels();
    this.modelSelect.empty();
    
    for (const model of models) {
      this.modelSelect.createEl('option', { value: model, text: model });
    }
    
    // Set default
    if (models.length > 0) {
      this.session.model = models[0];
      this.modelSelect.value = models[0];
    }
  }

  private addWelcomeMessage() {
    const welcome = this.messagesContainer.createDiv({ cls: 'ollama-welcome' });
    welcome.createEl('h3', { text: '🦙 Welcome to AI Assistant!' });
    welcome.createEl('p', { text: 'I can help you with your notes. Try:' });
    
    const examples = welcome.createEl('ul', { cls: 'ollama-examples' });
    const examplePrompts = [
      '📝 "Summarize this note for me"',
      '💡 "Explain this concept in simple terms"',
      '✏️ "Help me rewrite this paragraph"',
      '🔍 "What are the key points here?"',
    ];
    
    examplePrompts.forEach(prompt => {
      const li = examples.createEl('li');
      li.textContent = prompt;
      li.addEventListener('click', () => {
        this.inputField.value = prompt.replace(/^[📝💡✏️🔍]\s*"/, '').replace(/"$/, '');
        this.inputField.focus();
      });
    });
    
    welcome.createEl('p', { 
      cls: 'ollama-hint',
      text: '💡 Tip: Click the 📎 button to attach your current note to the chat!' 
    });
  }

  private attachCurrentNote(previewEl: HTMLElement) {
    const activeFile = this.app.workspace.getActiveFile();
    
    if (!activeFile || !(activeFile instanceof TFile)) {
      this.showNotice('No note is currently open');
      return;
    }

    this.app.vault.read(activeFile).then(content => {
      this.attachedNote = {
        path: activeFile.path,
        content: content
      };

      // Show preview
      previewEl.empty();
      previewEl.style.display = 'flex';
      
      const noteIcon = previewEl.createSpan({ cls: 'ollama-attachment-icon' });
      setIcon(noteIcon, 'file-text');
      
      previewEl.createSpan({ 
        cls: 'ollama-attachment-name',
        text: activeFile.basename 
      });
      
      const removeBtn = previewEl.createEl('button', { cls: 'ollama-attachment-remove' });
      setIcon(removeBtn, 'x');
      removeBtn.addEventListener('click', () => {
        this.attachedNote = null;
        previewEl.style.display = 'none';
      });

      this.showNotice(`📎 Attached: ${activeFile.basename}`);
    });
  }

  private async sendMessage() {
    const text = this.inputField.value.trim();
    if (!text || this.isGenerating) return;

    // Clear input
    this.inputField.value = '';
    this.inputField.style.height = 'auto';

    // Remove welcome message
    const welcome = this.messagesContainer.querySelector('.ollama-welcome');
    if (welcome) welcome.remove();

    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachedNote: this.attachedNote || undefined,
    };

    this.session.messages.push(userMessage);
    this.renderMessage(userMessage);

    // Clear attachment after sending
    const attachPreview = this.inputContainer.querySelector('.ollama-attachment-preview') as HTMLElement;
    if (attachPreview) {
      attachPreview.style.display = 'none';
    }

    // Build prompt with context
    let fullPrompt = text;
    if (this.attachedNote) {
      fullPrompt = `Here is my note "${this.attachedNote.path}":\n\n---\n${this.attachedNote.content}\n---\n\nUser question: ${text}`;
      this.attachedNote = null;
    }

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    this.session.messages.push(assistantMessage);
    const messageEl = this.renderMessage(assistantMessage);
    const contentEl = messageEl.querySelector('.ollama-message-content') as HTMLElement;

    // Show cancel button, hide send
    this.sendButton.style.display = 'none';
    this.cancelButton.style.display = 'flex';
    this.isGenerating = true;

    // Get active provider
    const provider = this.providerManager.getActiveProvider();

    // Start streaming
    this.currentAbortController = provider.chat(
      this.session.messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.attachedNote 
          ? `[Note: ${m.attachedNote.path}]\n${m.attachedNote.content}\n\n${m.content}`
          : m.content
      })),
      this.session.model,
      {
        onToken: (token) => {
          assistantMessage.content += token;
          this.renderMarkdown(contentEl, assistantMessage.content);
          this.scrollToBottom();
        },
        onComplete: (fullResponse) => {
          assistantMessage.content = fullResponse;
          assistantMessage.isStreaming = false;
          this.renderMarkdown(contentEl, fullResponse);
          this.finishGeneration(messageEl);
        },
        onError: (error) => {
          assistantMessage.error = error.message;
          assistantMessage.isStreaming = false;
          contentEl.addClass('ollama-error');
          contentEl.textContent = `❌ Error: ${error.message}`;
          this.finishGeneration(messageEl);
        }
      },
      { 
        temperature: this.plugin.settings.chatTemperature,
        systemPrompt: this.plugin.settings.chatSystemPrompt,
        maxTokens: this.plugin.settings.chatMaxTokens,
      }
    );
  }

  private renderMessage(message: ChatMessage): HTMLElement {
    const messageEl = this.messagesContainer.createDiv({ 
      cls: `ollama-message ollama-message-${message.role}` 
    });

    // Avatar
    const avatar = messageEl.createDiv({ cls: 'ollama-message-avatar' });
    setIcon(avatar, message.role === 'user' ? 'user' : 'bot');

    // Content container
    const contentContainer = messageEl.createDiv({ cls: 'ollama-message-container' });

    // Attached note badge
    if (message.attachedNote) {
      const badge = contentContainer.createDiv({ cls: 'ollama-attached-badge' });
      setIcon(badge.createSpan(), 'file-text');
      badge.createSpan({ text: ` ${message.attachedNote.path}` });
    }

    // Message content
    const content = contentContainer.createDiv({ cls: 'ollama-message-content' });
    
    if (message.isStreaming) {
      content.createSpan({ cls: 'ollama-typing-indicator', text: '●●●' });
    } else if (message.error) {
      content.addClass('ollama-error');
      content.textContent = `❌ ${message.error}`;
    } else {
      this.renderMarkdown(content, message.content);
    }

    this.scrollToBottom();
    return messageEl;
  }

  private async renderMarkdown(el: HTMLElement, content: string) {
    el.empty();
    await MarkdownRenderer.render(
      this.app,
      content,
      el,
      '',
      this.plugin
    );
  }

  private cancelGeneration() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  private finishGeneration(messageEl: HTMLElement) {
    this.isGenerating = false;
    this.currentAbortController = null;
    this.sendButton.style.display = 'flex';
    this.cancelButton.style.display = 'none';

    // Save session to history
    if (this.plugin.settings.saveHistory) {
      this.historyManager.saveSession(this.session).catch(err => 
        console.error('Failed to save chat history:', err)
      );
    }

    // Remove streaming indicator
    const indicator = messageEl.querySelector('.ollama-typing-indicator');
    if (indicator) indicator.remove();

    // Add action buttons for assistant messages
    const container = messageEl.querySelector('.ollama-message-container');
    if (container && messageEl.hasClass('ollama-message-assistant')) {
      const actions = container.createDiv({ cls: 'ollama-message-actions' });
      
      // Copy button
      const copyBtn = actions.createEl('button', { cls: 'ollama-action-btn' });
      setIcon(copyBtn, 'copy');
      copyBtn.title = 'Copy to clipboard';
      copyBtn.addEventListener('click', () => {
        const content = messageEl.querySelector('.ollama-message-content')?.textContent || '';
        navigator.clipboard.writeText(content);
        this.showNotice('Copied to clipboard!');
      });

      // Insert to note button
      const insertBtn = actions.createEl('button', { cls: 'ollama-action-btn' });
      setIcon(insertBtn, 'file-plus');
      insertBtn.title = 'Insert into current note';
      insertBtn.addEventListener('click', () => {
        const content = this.session.messages.find(m => 
          m.id === messageEl.dataset.messageId
        )?.content || '';
        this.insertToNote(content);
      });
    }
  }

  private insertToNote(content: string) {
    const activeView = this.app.workspace.getActiveViewOfType(ItemView);
    if (activeView && 'editor' in activeView) {
      const editor = (activeView as any).editor;
      editor.replaceSelection(content);
      this.showNotice('Inserted into note!');
    } else {
      this.showNotice('Please open a note first');
    }
  }

  private scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private startNewChat() {
    this.session = this.createNewSession();
    this.messagesContainer.empty();
    this.addWelcomeMessage();
    this.inputField.value = '';
    this.attachedNote = null;
  }

  private clearChat() {
    this.startNewChat();
    this.showNotice('Chat cleared');
  }

  private showNotice(message: string) {
    // Use Obsidian's Notice 
    new Notice(message);
  }

  async onClose() {
    this.cancelGeneration();
  }
}
