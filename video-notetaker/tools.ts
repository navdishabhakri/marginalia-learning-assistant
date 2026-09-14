import { SchemaType, type FunctionDeclaration } from "@google/generative-ai"

export const extractActionItemTool:FunctionDeclaration = {
    name:"extract_action_item",
    description: "Extracts a genuine action item the viewer should personally do to learn or practice the material — such as trying an exercise, reviewing a concept, or completing an assignment. Do NOT call this for channel-related requests like liking, subscribing, or sign-offs (e.g. 'see you next time', 'bye bye', 'happy coding').",
    parameters:{
        type:SchemaType.OBJECT,
        properties:{
            text:{type: SchemaType.STRING, description: "The action item text itself"},
             deadline: { type: SchemaType.STRING, description: "When it's due, if mentioned" }
        },
        required:["text"]
    }
}

export const flagKeyTimestampTool:FunctionDeclaration  = {
  name: "flag_key_timestamp",
  description: "Flags a moment in the text as an important key point worth highlighting, along with a brief reason why.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      reason: { type: SchemaType.STRING, description: "Why this moment is important or worth highlighting" }
    },
    required: ["reason"]
  }
}

export const markDefinitionTool:FunctionDeclaration  = {
  name: "mark_definition",
  description: "Marks a term and its definition when the text explains what something means.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      term: { type: SchemaType.STRING, description: "The term being defined" },
      explanation: { type: SchemaType.STRING, description: "The explanation or definition given" }
    },
    required: ["term", "explanation"]
  }
}


 
export const mergeDefinitionsTool: FunctionDeclaration = {
  name: "merge_definitions",
  description: "Merges two or more duplicate definitions of the same term into one clean definition.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      indexesToMerge: { type: SchemaType.STRING, description: "Comma-separated indexes of the definitions to merge, e.g. '2,5'" },
      mergedTerm: { type: SchemaType.STRING, description: "The single, correct term name after merging" },
      mergedExplanation: { type: SchemaType.STRING, description: "The single, clean, combined explanation after merging" }
    },
    required: ["indexesToMerge", "mergedTerm", "mergedExplanation"]
  }
}

export const mergeKeyTimestampsTool: FunctionDeclaration = {
  name: "merge_key_timestamps",
  description: "Merges two or more overlapping or duplicate key timestamps into one.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      indexesToMerge: { type: SchemaType.STRING, description: "Comma-separated indexes of the key timestamps to merge, e.g. '2,5'" },
      mergedReason: { type: SchemaType.STRING, description: "The single, clean, combined reason after merging" }
    },
    required: ["indexesToMerge", "mergedReason"]
  }
}

export const mergeActionItemsTool: FunctionDeclaration = {
  name: "merge_action_items",
  description: "Merges two or more duplicate action items into one.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      indexesToMerge: { type: SchemaType.STRING, description: "Comma-separated indexes of the action items to merge, e.g. '2,5'" },
      mergedText: { type: SchemaType.STRING, description: "The single, clean, combined action item text after merging" },
      mergedDeadline: { type: SchemaType.STRING, description: "The deadline, if any of the merged items had one" }
    },
    required: ["indexesToMerge", "mergedText"]
  }
}


export const deleteNoteTool: FunctionDeclaration = {
  name: "delete_note",
  description: "Deletes a note that is incorrect, irrelevant, or not genuinely useful (e.g. a channel subscribe request mistakenly flagged as an action item).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category: { type: SchemaType.STRING, description: "Which list this affects: 'definitions', 'keyTimestamps', or 'actionItems'" },
      index: { type: SchemaType.STRING, description: "The index of the note to delete" }
    },
    required: ["category", "index"]
  }
}

// --- Enrich tools ---
export const enrichDefinitionTool: FunctionDeclaration = {
  name: "enrich_definition",
  description: "Adds missing detail to a definition that's too sparse, using the original chunk text for context.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      index: { type: SchemaType.STRING, description: "The index of the definition to enrich" },
    updatedTerm: { type: SchemaType.STRING, description: "The corrected or improved term name, if it needs adjustment" },
      updatedExplanation: { type: SchemaType.STRING, description: "The improved, more detailed explanation" }
    },
    required: ["index", "updatedExplanation"]
  }
}

export const enrichKeyTimestampTool: FunctionDeclaration = {
  name: "enrich_key_timestamp",
  description: "Adds missing detail to a key timestamp's reason that's too sparse, using the original chunk text for context.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      index: { type: SchemaType.STRING, description: "The index of the key timestamp to enrich" },
      updatedReason: { type: SchemaType.STRING, description: "The improved, more detailed reason" }
    },
    required: ["index", "updatedReason"]
  }
}

export const enrichActionItemTool: FunctionDeclaration = {
  name: "enrich_action_item",
  description: "Adds missing detail to an action item that's too sparse, using the original chunk text for context.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      index: { type: SchemaType.STRING, description: "The index of the action item to enrich" },
    updatedDeadline: { type: SchemaType.STRING, description: "The deadline, if one can be identified from the original chunk text" },
      updatedText: { type: SchemaType.STRING, description: "The improved, more detailed action item text" }
    },
    required: ["index", "updatedText"]
  }
}

export const addMissedNoteTool: FunctionDeclaration = {
  name: "add_missed_note",
  description: "Adds a completely new note that was missed in the first extraction pass, based on the original chunk text. Use this when the chunks contain a genuine definition, action item, or key moment that isn't reflected in the current notes at all.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category: { type: SchemaType.STRING, description: "'definitions', 'keyTimestamps', or 'actionItems'" },
      term: { type: SchemaType.STRING, description: "For definitions only: the term being defined" },
      text: { type: SchemaType.STRING, description: "The main content: explanation (definitions), reason (keyTimestamps), or action text (actionItems)" },
      deadline: { type: SchemaType.STRING, description: "For actionItems only: deadline, if mentioned" },
      start: { type: SchemaType.STRING, description: "Start timestamp from the source chunk" },
      end: { type: SchemaType.STRING, description: "End timestamp from the source chunk" }
    },
    required: ["category", "text", "start", "end"]
  }
}

export const createMcqQuestionTool: FunctionDeclaration={
    name:"create_mcq_question",
    description:"Create mcq questions as per user choice with four options",
    parameters:{
        type: SchemaType.OBJECT,
        properties: {
            question: {type: SchemaType.STRING, description: "what to ask student"},
            correctAnswer:{type: SchemaType.STRING, description: "correct answer to the question"},
            choice:{type: SchemaType.ARRAY, items:{type:SchemaType.STRING}, description:"Four possible answer choices"},
        },
        required: ["question", "correctAnswer", "choice"]
    }

}

export const createFreeTextQuestionTool: FunctionDeclaration={
    name:"create_free_text_question",
    description:"Create a free-text question that requires the student to write their own answer, along with the expected correct answer for grading.",
    parameters:{
        type: SchemaType.OBJECT,
        properties: {
            question: {type: SchemaType.STRING, description: "what to ask student"},
            correctAnswer:{type: SchemaType.STRING, description: "correct answer to the question"},
        },
        required: ["question", "correctAnswer"]
    }

}

export const gradeFreeTextAnswerTool: FunctionDeclaration={
    name:"grade_free_text_answer",
    description:"takes the question, the expected answer, and the student's actual submitted answer, and returns whether it's correct plus brief feedback.",
    parameters:{
        type: SchemaType.OBJECT,
        properties: {
            isCorrect: {type: SchemaType.BOOLEAN, description: "is the answer correct?"},
            feedback:{type: SchemaType.STRING, description: "feedback of the student's answer to the question"},
        },
        required: ["isCorrect", "feedback"]
    }

}