import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_SETTINGS } from "data/defaultSettings";
import { OllamaCommand } from "model/OllamaCommand";
import { Ollama } from "Ollama";

export class OllamaSettingTab extends PluginSettingTab {
  plugin: Ollama;

  constructor(app: App, plugin: Ollama) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // ===== AI Providers Section =====
    containerEl.createEl("h2", { text: "🤖 AI Providers" });

    // Ollama Settings
    containerEl.createEl("h3", { text: "🦙 Ollama (Local)" });
    
    new Setting(containerEl)
      .setName("Enable Ollama")
      .setDesc("Use local Ollama for AI generation")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.providers.ollama.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.ollama.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Ollama URL")
      .setDesc("URL of the Ollama server (e.g. http://localhost:11434)")
      .addText((text) =>
        text
          .setPlaceholder("http://localhost:11434")
          .setValue(this.plugin.settings.providers.ollama.url)
          .onChange(async (value) => {
            this.plugin.settings.providers.ollama.url = value;
            this.plugin.settings.ollamaUrl = value; // Legacy
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default Ollama Model")
      .setDesc("Name of the default ollama model to use")
      .addText((text) =>
        text
          .setPlaceholder("llama2")
          .setValue(this.plugin.settings.providers.ollama.defaultModel)
          .onChange(async (value) => {
            this.plugin.settings.providers.ollama.defaultModel = value;
            this.plugin.settings.defaultModel = value; // Legacy
            await this.plugin.saveSettings();
          })
      );

    // OpenAI Settings
    containerEl.createEl("h3", { text: "🤖 OpenAI (GPT)" });
    
    new Setting(containerEl)
      .setName("Enable OpenAI")
      .setDesc("Use OpenAI GPT models")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.providers.openai.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.openai.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("OpenAI API Key")
      .setDesc("Your OpenAI API key from platform.openai.com")
      .addText((text) =>
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.providers.openai.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.providers.openai.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("OpenAI Model")
      .setDesc("Default OpenAI model to use")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("gpt-4o", "GPT-4o")
          .addOption("gpt-4o-mini", "GPT-4o Mini")
          .addOption("gpt-4-turbo", "GPT-4 Turbo")
          .addOption("gpt-4", "GPT-4")
          .addOption("gpt-3.5-turbo", "GPT-3.5 Turbo")
          .setValue(this.plugin.settings.providers.openai.defaultModel)
          .onChange(async (value) => {
            this.plugin.settings.providers.openai.defaultModel = value;
            await this.plugin.saveSettings();
          })
      );

    // Anthropic Settings
    containerEl.createEl("h3", { text: "🧠 Anthropic (Claude)" });
    
    new Setting(containerEl)
      .setName("Enable Anthropic")
      .setDesc("Use Anthropic Claude models")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.providers.anthropic.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.anthropic.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Anthropic API Key")
      .setDesc("Your Anthropic API key from console.anthropic.com")
      .addText((text) =>
        text
          .setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.providers.anthropic.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.providers.anthropic.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Anthropic Model")
      .setDesc("Default Claude model to use")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("claude-3-opus-20240229", "Claude 3 Opus")
          .addOption("claude-3-sonnet-20240229", "Claude 3 Sonnet")
          .addOption("claude-3-haiku-20240307", "Claude 3 Haiku")
          .setValue(this.plugin.settings.providers.anthropic.defaultModel)
          .onChange(async (value) => {
            this.plugin.settings.providers.anthropic.defaultModel = value;
            await this.plugin.saveSettings();
          })
      );

    // Groq Settings
    containerEl.createEl("h3", { text: "⚡ Groq (Fast)" });
    
    new Setting(containerEl)
      .setName("Enable Groq")
      .setDesc("Use Groq for ultra-fast inference")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.providers.groq.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.groq.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Groq API Key")
      .setDesc("Your Groq API key from console.groq.com")
      .addText((text) =>
        text
          .setPlaceholder("gsk_...")
          .setValue(this.plugin.settings.providers.groq.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.providers.groq.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Groq Model")
      .setDesc("Default Groq model to use")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("llama2-70b-4096", "LLaMA2 70B")
          .addOption("mixtral-8x7b-32768", "Mixtral 8x7B")
          .addOption("gemma-7b-it", "Gemma 7B")
          .setValue(this.plugin.settings.providers.groq.defaultModel)
          .onChange(async (value) => {
            this.plugin.settings.providers.groq.defaultModel = value;
            await this.plugin.saveSettings();
          })
      );

    // Gemini Settings
    containerEl.createEl("h3", { text: "✨ Google Gemini" });
    
    new Setting(containerEl)
      .setName("Enable Gemini")
      .setDesc("Use Google Gemini (free tier available)")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.providers.gemini.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.gemini.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Gemini API Key")
      .setDesc("Get your free API key from ai.google.dev")
      .addText((text) =>
        text
          .setPlaceholder("AIza...")
          .setValue(this.plugin.settings.providers.gemini.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.providers.gemini.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Gemini Model")
      .setDesc("Default Gemini model to use")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("gemini-1.5-pro", "Gemini 1.5 Pro")
          .addOption("gemini-1.5-flash", "Gemini 1.5 Flash")
          .addOption("gemini-pro", "Gemini Pro")
          .setValue(this.plugin.settings.providers.gemini.defaultModel)
          .onChange(async (value) => {
            this.plugin.settings.providers.gemini.defaultModel = value;
            await this.plugin.saveSettings();
          })
      );

    // ===== Chat Settings Section =====
    containerEl.createEl("h2", { text: "💬 Chat Settings" });

    new Setting(containerEl)
      .setName("System Prompt")
      .setDesc("Custom system prompt for the chat assistant")
      .addTextArea((text) => {
        text
          .setPlaceholder("You are a helpful AI assistant...")
          .setValue(this.plugin.settings.chatSystemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.chatSystemPrompt = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 4;
        text.inputEl.cols = 50;
      });

    new Setting(containerEl)
      .setName("Temperature")
      .setDesc("Controls randomness (0 = focused, 1 = creative)")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.chatTemperature)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.chatTemperature = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Max Tokens")
      .setDesc("Maximum response length")
      .addSlider((slider) =>
        slider
          .setLimits(256, 8192, 256)
          .setValue(this.plugin.settings.chatMaxTokens)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.chatMaxTokens = value;
            await this.plugin.saveSettings();
          })
      );

    // ===== Commands Section =====
    containerEl.createEl("h2", { text: "⚡ Quick Commands" });

    const newCommand: OllamaCommand = {
      name: "",
      prompt: "",
      model: "",
      temperature: undefined,
    };

    new Setting(containerEl).setName("New command name").addText((text) => {
      text.setPlaceholder("e.g. Summarize selection");
      text.onChange(async (value) => {
        newCommand.name = value;
      });
    });

    new Setting(containerEl)
      .setName("New command prompt")
      .addTextArea((text) => {
        text.setPlaceholder(
          "e.g. Act as a writer. Summarize the text in a view sentences highlighting the key takeaways. Output only the text and nothing else, do not chat, no preamble, get to the point."
        );
        text.onChange(async (value) => {
          newCommand.prompt = value;
        });
      });

    new Setting(containerEl).setName("New command model").addText((text) => {
      text.setPlaceholder("e.g. llama2");
      text.onChange(async (value) => {
        newCommand.model = value;
      });
    });

    new Setting(containerEl)
      .setName("New command temperature")
      .addSlider((slider) => {
        slider.setLimits(0, 1, 0.01);
        slider.setValue(0.2);
        slider.onChange(async (value) => {
          newCommand.temperature = value;
        });
      });

    new Setting(containerEl)
      .setDesc("This requires a reload of obsidian to take effect.")
      .addButton((button) =>
        button.setButtonText("Add Command").onClick(async () => {
          if (!newCommand.name) {
            new Notice("Please enter a name for the command.");
            return;
          }

          if (
            this.plugin.settings.commands.find(
              (command) => command.name === newCommand.name
            )
          ) {
            new Notice(
              `A command with the name "${newCommand.name}" already exists.`
            );
            return;
          }

          if (!newCommand.prompt) {
            new Notice("Please enter a prompt for the command.");
            return;
          }

          if (!newCommand.model) {
            new Notice("Please enter a model for the command.");
            return;
          }

          this.plugin.settings.commands.push(newCommand);
          await this.plugin.saveSettings();
          this.display();
        })
      );

    containerEl.createEl("h4", { text: "Existing Commands" });

    this.plugin.settings.commands.forEach((command) => {
      new Setting(containerEl)
        .setName(command.name)
        .setDesc(`${command.prompt} - ${command.model}`)
        .addButton((button) =>
          button.setButtonText("Remove").onClick(async () => {
            this.plugin.settings.commands =
              this.plugin.settings.commands.filter(
                (c) => c.name !== command.name
              );
            await this.plugin.saveSettings();
            this.display();
          })
        );
    });

    containerEl.createEl("h4", { text: "Reset Commands" });

    new Setting(containerEl)
      .setName("Update Commands")
      .setDesc(
        "Update commands to the default commands. This cannot be undone and will overwrite some commands by matching names. This requires a reload of obsidian to take effect."
      )
      .addButton((button) => {
        button.setWarning();
        return button.setButtonText("Update").onClick(async () => {
          DEFAULT_SETTINGS.commands.forEach((command) => {
            const existingCommand = this.plugin.settings.commands.find(
              (c) => c.name === command.name
            );

            if (existingCommand) {
              existingCommand.prompt = command.prompt;
              existingCommand.model = command.model;
              existingCommand.temperature = command.temperature;
            } else {
              this.plugin.settings.commands.push(command);
            }
          });
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Reset Commands")
      .setDesc(
        "Reset all commands to the default commands. This cannot be undone and will delete all your custom commands. This requires a reload of obsidian to take effect."
      )
      .addButton((button) => {
        button.setWarning();
        return button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.commands = DEFAULT_SETTINGS.commands;
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }
}
