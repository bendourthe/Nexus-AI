const original = globalThis.fetch; globalThis.fetch = (url, options) => original(String(url) === "http://127.0.0.1:11434/api/ps" ? process.env.NEXUS_OLLAMA_URL + "/api/ps" : url, options);
