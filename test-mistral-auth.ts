#!/usr/bin/env ts-node-dev
/**
 * Test Mistral API authentication
 * Diagnoses 401 Unauthorized errors
 */

import { Mistral } from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config({ path: process.env.TRUST_AGENT_ENV_PATH || ".env" });

async function testMistralAuth() {
  console.log("=== Mistral API Authentication Test ===\n");

  const apiKey = process.env.TRUST_AGENT_LLM_API_KEY || process.env.MISTRAL_API_KEY;
  const provider = process.env.TRUST_AGENT_LLM_PROVIDER;
  const baseUrl = process.env.TRUST_AGENT_LLM_BASE_URL;

  console.log("Configuration:");
  console.log(`  Provider: ${provider}`);
  console.log(`  BaseURL: ${baseUrl}`);
  console.log(`  API Key: ${apiKey ? apiKey.substring(0, 8) + "..." : "NOT SET"}`);
  console.log(`  API Key Length: ${apiKey?.length || 0}`);
  
  if (!apiKey) {
    console.error("\n❌ CRITICAL: No API key configured!");
    process.exit(1);
  }

  if (provider !== "mistral") {
    console.warn(`\n⚠️  Provider is '${provider}', not 'mistral'. This test is for Mistral only.`);
  }

  try {
    console.log("\n📡 Testing Mistral API connection...");
    const client = new Mistral({ apiKey });

    const response = await client.chat.complete({
      model: "mistral-small",
      messages: [
        {
          role: "user",
          content: "Say 'Authentication successful!' in one sentence."
        }
      ]
    });

    console.log("✅ Connection successful!");
    console.log(`\nResponse: ${response.choices[0]?.message?.content}`);
    console.log("\n✅ Mistral API authentication is working correctly.");
    
  } catch (error: any) {
    console.error("\n❌ Connection failed!");
    console.error(`Error: ${error.message}`);
    console.error(`Status: ${error.status || "Unknown"}`);
    
    if (error.status === 401) {
      console.error("\n🔍 Diagnosis: 401 Unauthorized");
      console.error("Possible causes:");
      console.error("  1. API key is invalid or expired");
      console.error("  2. API key has insufficient permissions");
      console.error("  3. Account is suspended or rate-limited");
      console.error("\nSolution: Check your Mistral API key at https://console.mistral.ai/");
    }
    
    if (error.response?.body) {
      console.error("\nAPI Response:", JSON.stringify(error.response.body, null, 2));
    }
    
    process.exit(1);
  }
}

testMistralAuth();
