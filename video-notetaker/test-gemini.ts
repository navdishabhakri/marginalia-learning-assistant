import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    deleteNoteTool,
  enrichActionItemTool,
  enrichDefinitionTool,
  enrichKeyTimestampTool,
  extractActionItemTool,
  flagKeyTimestampTool,
  markDefinitionTool,
  mergeActionItemsTool,
  mergeDefinitionsTool,
  mergeKeyTimestampsTool,
  addMissedNoteTool,
  gradeFreeTextAnswerTool,
  createFreeTextQuestionTool,
  createMcqQuestionTool

} from "./tools.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const modelName = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

export const Answer = genAI.getGenerativeModel({
  model: modelName
})

  export const model = genAI.getGenerativeModel({
  model: modelName,
  tools: [
    {
      functionDeclarations: [
        extractActionItemTool,
        flagKeyTimestampTool,
        markDefinitionTool,
       
      ],
    },
  ],
});

export const consolidatorModel = genAI.getGenerativeModel({
  model: modelName,
  tools: [
    {
      functionDeclarations: [
          extractActionItemTool,
  flagKeyTimestampTool,
  markDefinitionTool,
  deleteNoteTool,
  mergeDefinitionsTool,
  mergeKeyTimestampsTool,
  mergeActionItemsTool,
  enrichDefinitionTool,
  enrichKeyTimestampTool,
  enrichActionItemTool,
   addMissedNoteTool
      ],
    },
  ],
});



export const quizModel = genAI.getGenerativeModel({
  model: modelName,
  tools: [
    {
      functionDeclarations: [
        createFreeTextQuestionTool,
        createMcqQuestionTool,
        gradeFreeTextAnswerTool
        
      ],
    },
  ],
});

