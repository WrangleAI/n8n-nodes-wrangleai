# WrangleAI Node for n8n

![npm version](https://img.shields.io/npm/v/n8n-nodes-wrangleai?color=3D5AFE&label=n8n-nodes-wrangleai)
![License](https://img.shields.io/npm/l/n8n-nodes-wrangleai)

The official **WrangleAI** integration for n8n. This node allows you to plug WrangleAI's optimized model routing directly into your n8n AI Agents.

It functions as a drop-in replacement for standard LLM nodes (like OpenAI), automatically routing your prompts to the most cost-effective and capable models via the WrangleAI Gateway.

## Features

* **Smart Routing:** Automatically routes text inputs to the best model using `model: "auto"`.
* **AI Agent Compatible:** Designed to snap directly into n8n's **AI Agent** and **LLM Chain** nodes.
* **Full Configuration:** Supports standard parameters including Temperature, Max Tokens, Top P, and Stop Sequences.
* **Secure:** Enterprise-grade credential handling for your WrangleAI API keys.

## Installation

You can install this node directly within n8n.

### Option 1: Via n8n Community Nodes (Recommended)
1.  Open your n8n instance.
2.  Go to **Settings** > **Community Nodes**.
3.  Click **Install**.
4.  Search for: `n8n-nodes-wrangleai`
5.  Click **Install**.

### Option 2: Manual Installation
If you are self-hosting n8n, go to your n8n root directory and run:
```bash
npm install n8n-nodes-wrangleai
