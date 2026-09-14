import type { FunctionCall } from "@google/generative-ai";
import { quizModel } from "./test-gemini.js";
import type { Notes } from "./agent.js";
import fs from "fs"
import { cosineSimilarity, queryEmbeddings } from "./test-embed.js";

export const generateQuiz = async (notes: Notes, count: number, quizType: string) => {
  const questions: FunctionCall[] = [];
  const askedQuestions: string[] = [];
  
  let attempts = 0;
  const maxAttempts = count * 2; // Safeguard: never try more than double the requested count

  // Loop continues until we have EXACTLY the requested number of questions (or hit the safety limit)
  while (questions.length < count && attempts < maxAttempts) {
    attempts++;
    let instructionText = "";
    
    // Base the mixed logic on how many successful questions we currently have, not the attempt number
    const currentIndex = questions.length; 

    if (quizType === "mcq") {
      instructionText = "Generate ONE multiple-choice question using create_mcq_question.";
    } else if (quizType === "freeText") {
      instructionText = "Generate ONE free-text question using create_free_text_question.";
    } else {
      const useMcq = currentIndex % 2 === 0;
      instructionText = useMcq
        ? "Generate ONE multiple-choice question using create_mcq_question."
        : "Generate ONE free-text question using create_free_text_question.";
    }

    const prompt = `Here are the notes from a video:\n${JSON.stringify(notes, null, 2)}\n\nQuestions already asked so far:\n${JSON.stringify(askedQuestions, null, 2)}\n\n${instructionText}\n\nBase the question directly on the content in the notes above. It MUST cover a different concept than any question already asked.`;
    
    try {
      const result = await quizModel.generateContent(prompt);
      const calls = result.response.functionCalls() ?? [];
      
      if (calls.length > 0) {
        questions.push(calls[0]!);
        askedQuestions.push((calls[0]!.args as any).question);
      } else {
        console.warn(`Attempt ${attempts} failed: LLM did not return a function call.`);
      }
    } catch (error) {
      console.error(`Attempt ${attempts} generation failed:`, error);
    }
  }
  
  if (questions.length < count) {
    console.warn(`Only generated ${questions.length} questions out of ${count} requested before hitting the maximum attempt limit.`);
  }

  return questions;
}

export const formatQuiz = (questions: any) => {
  let list: any[] = [];
  for (let call of questions) {
    if (call.name == "create_mcq_question") {
      list.push({ type: "mcq", question: call.args.question, choice: call.args.choice, correctAnswer: call.args.correctAnswer });
    } else if (call.name == "create_free_text_question") {
      list.push({ type: "freeText", question: call.args.question, correctAnswer: call.args.correctAnswer });
    }
  }
  return list;
}

export const gradeFreeText = async (question: string, correctAnswer: string, studentAnswer: string) => {
  const prompt = `Question: "${question}"\nExpected answer: "${correctAnswer}"\nStudent's answer: "${studentAnswer}"\n\nJudge whether the student's answer is substantively correct, even if worded differently from the expected answer. Use grade_free_text_answer to report your verdict and brief feedback.`;
  const result = await quizModel.generateContent(prompt);
  const calls = result.response.functionCalls() ?? [];
  if (calls.length > 0) {
    return calls[0]!.args as any;
  }
  return { isCorrect: false, feedback: "Could not grade this answer." };
}

export const gradeMcq = (correctAnswer: string, studentAnswer: string) => {
  return correctAnswer.trim().toLowerCase() === studentAnswer.trim().toLowerCase();
}