# 🦙 Obsidian Ollama Chat

A powerful AI Chat interface for [Obsidian](https://obsidian.md) with [Ollama](https://ollama.ai) integration. Features a **Copilot-like chat panel**, streaming responses, note attachment, and customizable prompts.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🗨️ Chat Interface (New!)
- **Copilot-like Chat Panel** - A beautiful sidebar chat interface
- **Real-time Streaming** - See responses as they generate
- **Cancel Generation** - Stop any request mid-generation
- **Note Attachment** - Attach your current note to the chat with one click
- **Markdown Rendering** - Full markdown support in responses
- **Copy & Insert** - Copy responses or insert directly into your notes

### ⚡ Quick Commands
Pre-configured prompts for common tasks:
- 📝 **Summarize selection** - Get a quick summary
- 💡 **Explain selection** - Simple explanations
- 📈 **Expand selection** - Add more details
- 🎓 **Rewrite (formal)** - Professional tone
- 💬 **Rewrite (casual)** - Friendly tone
- 🎯 **Rewrite (active voice)** - Direct writing
- 📋 **Rewrite (bullet points)** - List format
- 📌 **Caption selection** - Generate headings

### 🎨 Customizable
- Create your own prompts
- Choose different models per command
- Adjust temperature for creativity
- Configure Ollama URL

## 🚀 Installation

### Prerequisites
1. Install [Ollama](https://ollama.ai) on your machine
2. Pull a model: `ollama pull llama2` or `ollama pull mistral`
3. Make sure Ollama is running (default: `http://localhost:11434`)

### Plugin Installation
1. Open Obsidian Settings → Community Plugins
2. Search for "Ollama Chat"
3. Install and enable the plugin

### Manual Installation
1. Download the latest release
2. Extract to `.obsidian/plugins/ollama/`
3. Enable in Community Plugins settings

## 📖 Usage

### Opening the Chat
- Click the 💬 icon in the left ribbon
- Or use command palette: "Open AI Chat"
- Or use the keyboard shortcut (customizable)

### Chatting with AI
1. Type your message in the input field
2. Press `Ctrl+Enter` or click Send
3. Watch the streaming response!

### Attaching Notes
1. Open a note you want to discuss
2. Click the 📎 button in the chat
3. Ask questions about your note!

### Using Quick Commands
1. Select text in your note (or use entire note)
2. Open command palette (`Ctrl+P`)
3. Search for the command (e.g., "Summarize selection")
4. Result is inserted at cursor position

## ⚙️ Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Ollama URL | Server address | `http://localhost:11434` |
| Default Model | Model for prompts | `llama2` |
| Commands | Custom prompts | 8 presets |

## 🔧 Troubleshooting

### "Cannot connect to Ollama"
1. Make sure Ollama is running: `ollama serve`
2. Check the URL in settings
3. Try `curl http://localhost:11434/api/tags`

### "Model not found"
1. Pull the model: `ollama pull <model-name>`
2. List available models: `ollama list`

### Slow responses
- Use a smaller model (e.g., `phi` or `tinyllama`)
- Check your system resources

## 🛣️ Roadmap

- [x] Phase 1: Chat interface with streaming
- [x] Phase 1: Note attachment
- [x] Phase 1: Cancel generation
- [ ] Phase 2: Chat history persistence
- [ ] Phase 2: Multiple chat sessions
- [ ] Phase 3: Multi-provider support (OpenAI, Anthropic, Groq)
- [ ] Phase 3: Custom system prompts per chat

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Credits

- Original plugin by [hinterdupfinger](https://github.com/hinterdupfinger)
- Enhanced by [m-alizadeh7](https://github.com/m-alizadeh7)
- Built for [Obsidian](https://obsidian.md)
- Powered by [Ollama](https://ollama.ai)
