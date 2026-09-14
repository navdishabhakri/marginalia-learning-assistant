import { pipeline } from "@xenova/transformers";
import type { Chunk } from "./index.js";
import fs from "fs";
import { Answer } from "./test-gemini.js";

export const getEmbeddings = async (chunks: Chunk[]) => {
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  ); // model which convert text to vector embedding
  for (let chunk of chunks) {
    let result = await extractor(chunk.text, {
      pooling: "mean",
      normalize: true,
    }); //pooling: 'mean' — averages all the per-token vectors into one single vector representing the whole input
    //normalize: true — scales the vector to a standard length (unit length), which cosine similarity calculations expect for correct, comparable results
    chunk.embedding = Array.from(result.data); // array.from is used to avoid the tensor object
  }
};

export const queryEmbeddings = async (query: string) => {
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  ); // model which convert text to vector embedding
  const embedding = await extractor(query, {
    pooling: "mean",
    normalize: true,
  }); //pooling: 'mean' — averages all the per-token vectors into one single vector representing the whole input
  //normalize: true — scales the vector to a standard length (unit length), which cosine similarity calculations expect for correct, comparable results
  return embedding;
};

export const cosineSimilarity = (A: number[], B: number[]) => {
  // takes two embeddings
  let sum = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    sum += A[i]! * B[i]!;
    normA += A[i]! * A[i]!;
    normB += B[i]! * B[i]!;
  }
  let magnitudeA = Math.sqrt(normA);
  let magnitudeB = Math.sqrt(normB);
  let similarity = sum / (magnitudeA * magnitudeB);
  return similarity;
};

interface Match {
  text: string;
  similarity: number;
  start: string;
  end: string;
}

export const findRelevantChunks = async (query: string, chunks: Chunk[]) => {
  let match: Match[] = [];
  let embeddedQuery = await queryEmbeddings(query);
  for (let chunk of chunks) {
    let similarity = cosineSimilarity(
      chunk.embedding, // Array.from(someFloat32Array) converts that specialized typed array into a genuine, plain JavaScript array (number[])
      Array.from(embeddedQuery.data),
    );
    match.push({
      text: chunk.text,
      similarity,
      start: chunk.start,
      end: chunk.end,
    });
  }
  match.sort((a, b) => b.similarity - a.similarity);
  return match.slice(0, 5);
};

export const answerQuestion = async (question: string, chunks: Chunk[]) => {
  const matches = await findRelevantChunks(question, chunks);

  try {
    const contextChunks = matches.map((m) => m.text).join("\n");

    // Then send that context straight to Gemini:
    // Change your prompt variable in the backend to this:

const prompt = `You are a friendly, expert AI study tutor built into a video learning app called Marginalia. 
The user is watching a lecture and asking you a question about it. 
Use the provided video transcript chunks to answer their question accurately.

CRITICAL INSTRUCTIONS:
1. NEVER say "Based on the provided text," "According to the transcript," or mention that you are reading chunks. Speak naturally as if you just know the material.
2. Keep your tone conversational, encouraging, and easy to digest.
3. If the user asks a broad question, synthesize the concepts smoothly rather than just listing bullet points rigidly.

Video Transcript Context:
${contextChunks}

User Question:
${question}`;

    const result = await Answer.generateContent(prompt);
    return { confident: true, answer: result.response.text() };
  } catch (error) {
    console.error("answerQuestion failed:", error);
    return {
      confident: false,
      answer:
        "Something went wrong generating an answer. Please try again in a moment.",
    };
  }
};
