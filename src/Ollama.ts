/**
 * Obsidian Ollama Plugin - Enhanced with Chat Interface
 * 
 * Features:
 * - Copilot-like chat interface
 * - Streaming responses with cancellation
 * - Note attachment support
 * - Multi-model support
 */

import { kebabCase } from "service/kebabCase";
import { Editor, Notice, Plugin, requestUrl, WorkspaceLeaf } from "obsidian";
import { OllamaSettingTab } from "OllamaSettingTab";
import { DEFAULT_SETTINGS } from "data/defaultSettings";
import { OllamaSettings } from "model/OllamaSettings";
import { ChatView, CHAT_VIEW_TYPE } from "ui/ChatView";

export class Ollama extends Plugin {
  settings: OllamaSettings;

  async onload() {
    await this.loadSettings();
    
    // Register the chat view
    this.registerView(
      CHAT_VIEW_TYPE,
      (leaf) => new ChatView(leaf, this)
    );
    
    // Add command to open chat
    this.addCommand({
      id: 'open-chat',
      name: 'Open AI Chat',
      callback: () => this.activateChatView(),
    });
    
    // Add ribbon icon for chat
    this.addRibbonIcon('message-square', 'Open AI Chat', () => {
      this.activateChatView();
    });
    
    // Add legacy prompt commands
    this.addPromptCommands();
    
    // Add settings tab
    this.addSettingTab(new OllamaSettingTab(this.app, this));
    
    console.log('Ollama plugin loaded - Chat interface ready!');
  }

  async activateChatView() {
    const { workspace } = this.app;
    
    let leaf = workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];
    
    if (!leaf) {
      // Create new leaf in right sidebar
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({
          type: CHAT_VIEW_TYPE,
          active: true,
        });
      }
    }
    
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  private addPromptCommands() {
    this.settings.commands.forEach((command) => {
      this.addCommand({
        id: kebabCase(command.name),
        name: command.name,
        editorCallback: (editor: Editor) => {
          const selection = editor.getSelection();
          const text = selection ? selection : editor.getValue();
          const cursorPosition = editor.getCursor();

          // Show loading indicator
          editor.replaceRange("✍️", cursorPosition);
          
          // Use streaming for better UX
          this.generateWithStreaming(
            command.prompt + "\n\n" + text,
            command.model || this.settings.defaultModel,
            command.temperature || 0.2,
            editor,
            cursorPosition
          );
        },
      });
    });
  }
  
  private async generateWithStreaming(
    prompt: string,
    model: string,
    temperature: number,
    editor: Editor,
    cursorPosition: { line: number; ch: number }
  ) {
    let fullResponse = '';
    
    try {
      const response = await fetch(`${this.settings.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          stream: true,
          options: { temperature },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let isFirst = true;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              fullResponse += json.response;
              
              // Update editor with streaming content
              const endPos = isFirst 
                ? { line: cursorPosition.line, ch: cursorPosition.ch + 1 }
                : { line: cursorPosition.line, ch: cursorPosition.ch + fullResponse.length - json.response.length };
              
              if (isFirst) {
                // Replace the loading indicator
                editor.replaceRange(
                  fullResponse.trim(),
                  cursorPosition,
                  { line: cursorPosition.line, ch: cursorPosition.ch + 1 }
                );
                isFirst = false;
              } else {
                // Append new content
                editor.replaceRange(
                  json.response,
                  { line: cursorPosition.line, ch: cursorPosition.ch + fullResponse.length - json.response.length }
                );
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
      
    } catch (error: any) {
      new Notice(`Error: ${error.message}`);
      // Remove loading indicator on error
      editor.replaceRange("", cursorPosition, {
        ch: cursorPosition.ch + 1,
        line: cursorPosition.line,
      });
    }
  }

  onunload() {
    console.log('Ollama plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

