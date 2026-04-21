export const TOKEN_REGISTRY: Record<string, string> = {
  "STRK": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  "STARK": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  "STARKNET": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  "ETH": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  "ETHER": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  "USDC": "0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb",
  "USD": "0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb",
  "USDC.E": "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  "USDC_E": "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  "USDC_NATIVE": "0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb",
  "LORDS": "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49"
};

export const VALIDATOR_REGISTRY: Record<string, string> = {
  "karnot": "0x07e2c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7",
  "twinstake": "0x01aca15766cb615c3b7ca0fc3680cbde8b21934bb2e7b41594b9d046d7412c00",
  "braavos": "0x04b00f97e2d2168b91fe64ceeace4a41fc274a85bbdd0adc402c3d0cf9f91bbb",
  "avnu": "0x036963c7b56f08105ffdd7f12560924bdc0cb29ce210417ecbc8bf3c7e4b9090",
  "nethermind": "0x02952d1e0de1de08fbe6a75d9d0e388e3e89d5d9d42d5f85906ec42ea02e35de",
  "luganodes": "0x012aca15766cb615c3b7ca0fc3680cbde8b21934bb2e7b41594b9d046d7412c01"
};

export const SYSTEM_PROMPT = `
### IDENTITY
You are the **StarkAgent** Knowledge Oracle, the cognitive intelligence core of the **StarkHub** ecosystem. You are a world-class educational AI specialized in Starknet, Cairo, ZK-Rollups, and the broader Cryptocurrency ecosystem. 

### CORE MANDATE
- Your SOLE PURPOSE is to answer questions, clear doubts, and educate users about Starknet and Crypto.
- You are strictly an INFORMATIONAL CONSULTANT.
- You are FORBIDDEN from generating transaction intents, DeFi actions, or formatting payloads.
- If a user asks to "swap", "send", "stake", or "lend", simply explain that they should use the manual commands (e.g., "type 'swap' to start") or use the dedicated UI buttons.

### KNOWLEDGE DOMAIN
- Starknet Architecture (STARKs, Sequencers, Provers).
- Cairo Programming Language and Smart Contracts.
- DeFi Concepts (Liquidity Pools, Lending Protocols, AMMs).
- General Blockchain (Consensus, Wallets, Governance).

### OUTPUT FORMAT
- Always provide clear, distinct, and helpful text answers.
- Use a professional, slightly cyberpunk/technical tone matching the terminal aesthetic.
- You MUST output valid JSON only.

JSON SCHEMA:
{
  "content": "Your detailed educational answer or explanation here."
}
`;

export interface CommandResponse {
  content: string;
}

export async function parseCommand(userInput: string, history: { type: string, content: string }[] = []): Promise<CommandResponse> {
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY || "";
  
  const historyContext = history.slice(-6).map(m => 
    `${m.type.toUpperCase()}: ${m.content}`
  ).join("\n");

  const prompt = `
${SYSTEM_PROMPT}

### CONVERSATION_HISTORY
${historyContext || "START_OF_SESSION"}

USER_INPUT: "${userInput}"
`;

  console.log("[StarkAgent] Full Prompt Context:", prompt);
  if (!API_KEY) throw new Error("API_KEY_MISSING");

  try {
    // DIRECT FETCH TO V1BETA ENDPOINT (Using Gemma 3 1B as requested)
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-1b-it:generateContent?key=${API_KEY}`;
    
    console.log("[StarkAgent] Dispatching direct fetch to v1beta (gemma-3-1b-it)...");

    const response = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("[StarkAgent] Google API Error Details:", JSON.stringify(errData, null, 2));
      throw new Error(`API_RESPONSE_ERROR: ${response.status} - ${errData.error?.message || 'Unknown Error'}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("[StarkAgent] AI Raw Output:", rawText);

    if (!rawText) throw new Error("EMPTY_AI_RESPONSE");

    try {
      const cleanText = rawText.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanText);
    } catch (e) {
      console.error("[StarkAgent] JSON Parse Error:", rawText);
      throw new Error("COGNITIVE_DECODE_FAILED");
    }

  } catch (error: any) {
    console.error("[StarkAgent] Execution Error:", error);
    throw error;
  }
}
