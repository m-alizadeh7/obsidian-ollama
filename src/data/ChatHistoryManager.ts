/**
 * Chat History Manager - Save chat sessions to .obsidian folder
 */

import { App, TFolder } from 'obsidian';
import { ChatMessage, ChatSession } from '../model/AIProvider';

export class ChatHistoryManager {
  private app: App;
  private historyFolder: TFolder | null = null;
  private readonly HISTORY_DIR = '.obsidian/plugins/obsidian-ollama/chat-history';

  constructor(app: App) {
    this.app = app;
    this.initializeFolder();
  }

  private async initializeFolder() {
    // Ensure the folder exists
    try {
      const folder = this.app.vault.getAbstractFileByPath(this.HISTORY_DIR);
      if (folder && folder instanceof TFolder) {
        this.historyFolder = folder;
      } else {
        await this.app.vault.createFolder(this.HISTORY_DIR);
        const newFolder = this.app.vault.getAbstractFileByPath(this.HISTORY_DIR);
        if (newFolder instanceof TFolder) {
          this.historyFolder = newFolder;
        }
      }
    } catch (e) {
      console.error('Failed to initialize chat history folder:', e);
    }
  }

  async saveSession(session: ChatSession): Promise<void> {
    if (!this.historyFolder) {
      await this.initializeFolder();
    }

    if (!this.historyFolder) {
      console.error('Chat history folder not available');
      return;
    }

    try {
      const timestamp = new Date(session.updatedAt);
      const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const filename = `${dateStr}_${timeStr}_chat.md`;

      const content = this.formatSessionAsMarkdown(session);
      
      // Create or overwrite the file
      const filepath = `${this.HISTORY_DIR}/${filename}`;
      const existingFile = this.app.vault.getAbstractFileByPath(filepath);
      
      if (existingFile && existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, content);
      } else {
        await this.app.vault.create(filepath, content);
      }
    } catch (error) {
      console.error('Failed to save chat session:', error);
    }
  }

  private formatSessionAsMarkdown(session: ChatSession): string {
    const timestamp = new Date(session.updatedAt).toLocaleString();
    
    let markdown = `# Chat Session\n\n`;
    markdown += `**Date:** ${timestamp}\n`;
    markdown += `**Provider:** ${session.provider}\n`;
    markdown += `**Model:** ${session.model}\n`;
    markdown += `**Session ID:** ${session.id}\n\n`;
    markdown += `---\n\n`;

    for (const message of session.messages) {
      const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
      const time = new Date(message.timestamp || 0).toLocaleTimeString();
      
      markdown += `### ${role} (${time})\n\n`;
      markdown += `${message.content}\n\n`;
      
      if (message.attachedNote) {
        markdown += `> 📎 **Attached Note:** \`${message.attachedNote.path}\`\n\n`;
      }
      
      if (message.error) {
        markdown += `> ❌ **Error:** ${message.error}\n\n`;
      }
      
      markdown += `---\n\n`;
    }

    return markdown;
  }

  async getAllSessions(): Promise<string[]> {
    if (!this.historyFolder) {
      await this.initializeFolder();
    }

    if (!this.historyFolder) {
      return [];
    }

    try {
      const files = this.historyFolder.children || [];
      return files
        .filter(file => file.name.endsWith('_chat.md'))
        .map(file => file.name)
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      return [];
    }
  }

  async deleteSession(filename: string): Promise<void> {
    if (!this.historyFolder) {
      await this.initializeFolder();
    }

    if (!this.historyFolder) {
      return;
    }

    try {
      const file = this.app.vault.getAbstractFileByPath(`${this.HISTORY_DIR}/${filename}`);
      if (file) {
        await this.app.vault.trash(file, false);
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  }
}

import { TFile } from 'obsidian';
