import { model, consolidatorModel } from "./test-gemini.js";
import type { FunctionCall } from "@google/generative-ai";
import type { Chunk } from "./index.js";

import fs from "fs";

interface selectedCall {
  chunk: Chunk;
  calls: FunctionCall[];
}

interface DefinitionNote {
  term: string;
  explanation: string;
  start: string;
  end: string;
}
interface KeyTimestampNote {
  reason: string;
  start: string;
  end: string;
}
interface ActionItemNote {
  text: string;
  deadline: string;
  start: string;
  end: string;
}

export interface Notes {
  actionItems: ActionItemNote[];
  keyTimestamps: KeyTimestampNote[];
  definitions: DefinitionNote[];
}

export const processChunk = async (chunk: Chunk) => {
  try {
    const result = await model.generateContent(chunk.text);
    const calls = result.response.functionCalls() ?? [];
    return calls;
  } catch (error) {
    console.error("processChunk failed:", error);
    return [];
  }
};

export const processAll = async (chunks: Chunk[]) => {
  let selectedCalls = [];
  for (let chunk of chunks) {
    let calls = await processChunk(chunk);
    selectedCalls.push({ chunk: chunk, calls });
  }
  return selectedCalls;
};

export const getNotes = async (selectedCalls: selectedCall[]) => {
  let actionItems: any = [];
  let keyTimestamps: any = [];
  let definitions: any = [];

  selectedCalls.forEach(({ chunk, calls }) => {
    for (let c of calls) {
      const args = c.args as any;
      if (c.name == "mark_definition") {
        definitions.push({
          term: args.term,
          explanation: args.explanation,
          start: chunk.start,
          end: chunk.end,
        });
      }
      if (c.name == "flag_key_timestamp") {
        keyTimestamps.push({
          reason: args.reason,
          start: chunk.start,
          end: chunk.end,
        });
      }
      if (c.name == "extract_action_item") {
        actionItems.push({
          text: args.text,
          deadline: args.deadline,
          start: chunk.start,
          end: chunk.end,
        });
      }
    }
  });
  return { actionItems, keyTimestamps, definitions };
};

export const changedNotes = async (notes: Notes, chunks: Chunk[]) => {
  const batchSize = 5;
  for (let j = 0; j < chunks.length; j += batchSize) {
    const batch = chunks.slice(j, j + batchSize);
    try {
      const prompt = `Here are ${batch.length} chunks of a video transcript:\n${JSON.stringify(
        batch.map((c) => ({ text: c.text, start: c.start, end: c.end })),
        null,
        2,
      )}\n\nHere are the notes extracted so far, across the whole video:\n${JSON.stringify(notes, null, 2)}\n\nCarefully check: do these chunks contain any genuine definition, action item, or key moment that is NOT already reflected in the notes above? If so, call add_missed_note for each one you find. If everything in these chunks is already captured, don't call any tool.`;
      const result = await consolidatorModel.generateContent(prompt);
      const batchCalls = result.response.functionCalls() ?? [];
      if (batchCalls.length > 0) {
        notes = await applyChanges(notes, batchCalls);
      }
    } catch (error) {
      console.error("gap-check failed for batch:", error);
    }
  }

  let i = 0;
  let calls: FunctionCall[] = [];
  while (i < 3) {
    try {
      const prompt = `Here are the current notes, as JSON with numeric indexes implied by array position:\n${JSON.stringify(notes, null, 2)}\n\nHere are the original transcript chunks, for reference:\n${JSON.stringify(
        chunks.map((c) => ({ text: c.text, start: c.start, end: c.end })),
        null,
        2,
      )}\n\nReview the notes and chunks carefully:\n- If two or more notes are duplicates or overlapping, use merge_definitions, merge_key_timestamps, or merge_action_items.\n- If a note is incorrect or irrelevant, use delete_note.\n- If a note is too sparse and could be improved using the original chunk text, use enrich_definition, enrich_key_timestamp, or enrich_action_item.\n- If the chunks contain a genuine definition, action item, or key moment that is NOT reflected in any current note at all, use add_missed_note to add it.\nIf nothing needs fixing, don't call any tool.`;
      const result = await consolidatorModel.generateContent(prompt);
      calls = result.response.functionCalls() ?? [];
      if (calls.length === 0) break;
      notes = await applyChanges(notes, calls);
      i += 1;
    } catch (error) {
      console.error("failed:", error);
      return notes;
    }
  }

  return notes;
};

export const applyChanges = async (notes: Notes, calls: FunctionCall[]) => {
  for (let c of calls) {
    const args = c.args as any;
    if (c.name == "delete_note") {
      (notes as any)[args.category].splice(Number(args.index), 1);
    }
    if (c.name == "merge_definitions") {
      const indexes = args.indexesToMerge
        .split(",")
        .map((s: string) => Number(s));

      const sortedList = indexes.sort((a: number, b: number) => b - a);
      const start = notes.definitions[indexes[indexes.length - 1]]!.start;
      const end = notes.definitions[indexes[0]]!.end;
      for (let l of sortedList) {
        notes.definitions.splice(l, 1);
      }
      notes.definitions.push({
        term: args.mergedTerm,
        explanation: args.mergedExplanation,
        start,
        end,
      });
    }
    if (c.name == "merge_key_timestamps") {
      const indexes = args.indexesToMerge
        .split(",")
        .map((s: string) => Number(s));
      const sortedList = indexes.sort((a: number, b: number) => b - a);
      const start = notes.keyTimestamps[indexes[indexes.length - 1]]!.start;
      const end = notes.keyTimestamps[indexes[0]]!.end;
      for (let l of sortedList) {
        notes.keyTimestamps.splice(l, 1);
      }
      notes.keyTimestamps.push({ reason: args.mergedReason, start, end });
    }
    if (c.name == "merge_action_items") {
      const indexes = args.indexesToMerge
        .split(",")
        .map((s: string) => Number(s));
      const sortedList = indexes.sort((a: number, b: number) => b - a);
      const start = notes.actionItems[indexes[indexes.length - 1]]!.start;
      const end = notes.actionItems[indexes[0]]!.end;
      for (let l of sortedList) {
        notes.actionItems.splice(l, 1);
      }
      notes.actionItems.push({
        text: args.mergedText,
        deadline: args.mergedDeadline,
        start,
        end,
      });
    }
    if (c.name == "enrich_definition") {
      const idx = Number(args.index);
      notes.definitions[idx]!.explanation = args.updatedExplanation;
      if (args.updatedTerm) {
        notes.definitions[idx]!.term = args.updatedTerm;
      }
    }

    if (c.name == "enrich_key_timestamp") {
      const idx = Number(args.index);
      notes.keyTimestamps[idx]!.reason = args.updatedReason;
    }
    if (c.name == "enrich_action_item") {
      const idx = Number(args.index);
      if (args.updatedDeadline) {
        notes.actionItems[idx]!.deadline = args.updatedDeadline;
      }
      notes.actionItems[idx]!.text = args.updatedText;
    }
    if (c.name == "add_missed_note") {
      const newNote: any = { start: args.start, end: args.end };
      if (args.category === "definitions") {
        newNote.term = args.term;
        newNote.explanation = args.text;
      } else if (args.category === "keyTimestamps") {
        newNote.reason = args.text;
      } else {
        newNote.text = args.text;
      }
      (notes as any)[args.category].push(newNote);
    }
  }

  return notes;
};
