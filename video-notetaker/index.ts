import express, { json } from "express";
import type { Request, Response } from "express";
import { execFile } from "child_process"; // curly braces because its not the default export so you have to mention what you are exporting
import { URL } from "url";
import fs from "fs";
import Multer from "multer";
import { randomUUID } from "crypto";
import { answerQuestion, getEmbeddings } from "./test-embed.js";
import { processAll, getNotes, changedNotes } from "./agent.js";
import { formatQuiz, generateQuiz, gradeFreeText, gradeMcq } from "./quiz.js";
import cors from "cors";
import { getProgress, setProgress } from "./progress.js";

const app = express();
const upload = Multer({ dest: "downloads/" });
const PORT = 8080;

export interface Chunk {
  start: string;
  end: string;
  text: string;
  embedding: any;
}

export type quizType = "mixed" | "mcq" | "freeText";

const options = {
  origin: "http://localhost:5173",
};
app.use(cors(options));
app.use("/media", express.static("downloads"));
app.get("/health", (req: Request, res: Response) => {
  res.send({ status: "ok" });
});
app.use(express.json()); // middleware which helps to parse req.body to js object

app.listen(PORT, () => {
  console.log(`app running on ${PORT}`);
});

app.post("/process-url", (req, res) => {
  const url = req.body.url;
  const id = new URL(url).searchParams.get("v"); // search params helps to read the key value pairs , so this command will give value of the key "v"
  res.status(202).json({ id: id });
  if (!fs.existsSync(`downloads/${id}`)) {
    fs.mkdirSync(`downloads/${id}`);
  }
  setProgress(id!, "downloading", "Downloading audio...");
  const file = execFile(
    "yt-dlp",
    [
      "-x",
      "--audio-format",
      "mp3",
      "--extractor-args",
      "youtube:player_client=android,web",
      "--add-header",
      "User-Agent: Mozilla/5.0",
      "-o",
      `downloads/${id}/audio.mp3`,
      url,
    ],
    (error, stdout, stderr) => {
      if (error) {
        setProgress(id!, "error", error.message);
        return;
      }
      setProgress(id!, "transcribing", "Whisper is transcribing audio...");
      const transcript = execFile(
        "whisper-cli",
        [
          "-m",
          "models/ggml-small.en.bin",
          "-f",
          `downloads/${id}/audio.mp3`,
          "-oj",
          "-of",
          `downloads/${id}/transcript`,
        ],
        async (error, stdout, stderr) => {
          if (error) {
            setProgress(id!, "error", error.message);
            return;
          }
          const chunks = chunkTranscript(`downloads/${id}/transcript.json`);
          setProgress(id!, "chunking", "Chunking and embedding...");
          await getEmbeddings(chunks);
          setProgress(id!, "extracting", "Extracting notes...");
          const selectedCalls = await processAll(chunks);
          const notes = await getNotes(selectedCalls);
          const content = JSON.stringify(chunks);
          setProgress(id!, "consolidating", "Consolidating and cleaning up...");
          const finalNotes = await changedNotes(notes, chunks);
          fs.writeFileSync(`downloads/${id}/notes.json`, JSON.stringify(notes));
          fs.writeFileSync(
            `downloads/${id}/notes-reviewed.json`,
            JSON.stringify(finalNotes, null, 2),
          );
          fs.writeFileSync(`downloads/${id}/chunks.json`, content); //fs.writeFileSync(path, data) expects data to be a string
          setProgress(id!, "done", "Processing complete");
        },
      );
    },
  );
});

app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }
  const oldPath = file.path;
  const ext = file?.originalname.split(".").at(-1);
  const id = randomUUID();
  res.status(202).json({ id: id });
  const newPath = `downloads/${id}/video.${ext}`;
  if (!fs.existsSync(`downloads/${id}`)) {
    fs.mkdirSync(`downloads/${id}`);
  }
  fs.renameSync(oldPath, newPath); // move audio from old path to new path
  setProgress(id, "downloading", "Downloading video...");
  const mp3 = execFile(
    "ffmpeg",
    [
      "-i",
      `downloads/${id}/video.${ext}`,
      "-vn",
      "-acodec",
      "libmp3lame",
      `downloads/${id}/audio.mp3`,
    ],
    (error, stdout, stderr) => {
      if (error) {
        setProgress(id, "error", error.message);
        return;
      }
      setProgress(id, "transcribing", "Whisper is transcribing audio...");
      const transcript = execFile(
        "whisper-cli",
        [
          "-m",
          "models/ggml-small.en.bin",
          "-f",
          `downloads/${id}/audio.mp3`,
          "-oj",
          "-of",
          `downloads/${id}/transcript`,
        ],
        async (error, stdout, stderr) => {
          if (error) {
            setProgress(id, "error", error.message);
            return;
          }
          const output = stdout;
          const chunks = chunkTranscript(`downloads/${id}/transcript.json`);
          setProgress(id, "chunking", "Chunking and embedding...");
          await getEmbeddings(chunks);
          const content = JSON.stringify(chunks);
          setProgress(id, "extracting", "Extracting notes...");
          const selectedCalls = await processAll(chunks);
          const notes = await getNotes(selectedCalls);
          setProgress(id, "consolidating", "Consolidating and cleaning up...");
          const finalNotes = await changedNotes(notes, chunks);
          fs.writeFileSync(
            `downloads/${id}/notes-reviewed.json`,
            JSON.stringify(finalNotes, null, 2),
          );
          fs.writeFileSync(`downloads/${id}/chunks.json`, content);
          fs.writeFileSync(`downloads/${id}/notes.json`, JSON.stringify(notes)); // stringify bevause we can only use text with writsyncpath and not object
          setProgress(id, "done", "Processing complete");
        },
      );
    },
  );
});

app.post("/videos/:id/ask", async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;
  const chunks = JSON.parse(
    fs.readFileSync(`downloads/${id}/chunks.json`, "utf-8"),
  );
  const result = await answerQuestion(question, chunks);
  res.status(200).json(result);
});

app.post("/videos/:id/approve-notes", (req, res) => {
  const { id } = req.params;
  const editedNotes = req.body.notes;
  const notesToFinalize =
    editedNotes ??
    JSON.parse(fs.readFileSync(`downloads/${id}/notes-reviewed.json`, "utf-8"));

  fs.writeFileSync(
    `downloads/${id}/notes-final.json`,
    JSON.stringify(notesToFinalize, null, 2),
  );
  res
    .status(200)
    .json({ message: "Notes approved and finalized", notes: notesToFinalize });
});

app.post("/videos/:id/generate-quiz", async (req, res) => {
  const { id } = req.params;
  const { count, quizType } = req.body;
  try {
    const notes = JSON.parse(
      fs.readFileSync(`downloads/${id}/notes-final.json`, "utf-8"),
    );
    const rawQuestions = await generateQuiz(notes, count, quizType);
    const quiz = formatQuiz(rawQuestions);
    fs.writeFileSync(
      `downloads/${id}/quiz.json`,
      JSON.stringify(quiz, null, 2),
    );
    res.status(200).json({ quiz });
  } catch (error) {
    res.status(400).json({ error });
  }
});

app.post("/videos/:id/generate-mcq-grade", async (req, res) => {
  const { id } = req.params;
  const { questionIndex, studentAnswer } = req.body;
  const quizContent = JSON.parse(
    fs.readFileSync(`downloads/${id}/quiz.json`, "utf-8"),
  );
  if (quizContent[questionIndex]!.type == "mcq") {
    const reply = gradeMcq(
      quizContent[questionIndex]!.correctAnswer,
      studentAnswer,
    );
    return res.status(200).json({ reply });
  } else if (quizContent[questionIndex]!.type == "freeText") {
    const reply = await gradeFreeText(
      quizContent[questionIndex]!.question,
      quizContent[questionIndex]!.correctAnswer,
      studentAnswer,
    );
    return res.status(200).json({ reply });
  }
});

app.get("/stream/:id", (req, res) => {
  const { id } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const interval = setInterval(async () => {
    const currentProgress = getProgress(id);

    if (currentProgress) {
      res.write("data: " + JSON.stringify(currentProgress) + "\n\n");
      if (currentProgress.step == "done" || currentProgress.step == "error") {
        clearInterval(interval);
        res.end();
      }
    }
  }, 500);
  req.on("close", () => clearInterval(interval)); // if user closed their browser then clear interval
});

app.get("/stream-data/:id", (req, res) => {
  const { id } = req.params;
  const notes = JSON.parse(
    fs.readFileSync(`downloads/${id}/notes-reviewed.json`, "utf-8"),
  );
  res.status(200).json({ notes });
});

const chunkTranscript = (path: string): Chunk[] => {
  const chunks: Chunk[] = [];
  let start = "";
  let end = "";
  let text = "";
  const content = fs.readFileSync(path, "utf-8"); //reads a file's contents as a plain string
  const transcript = JSON.parse(content);
  for (const segment of transcript.transcription) {
    if (text.length < 500) {
      text += segment["text"];
      if (start == "") start = segment["timestamps"]["from"];
      end = segment["timestamps"]["to"];
    } else {
      chunks.push({ start, end, text, embedding: [] });
      text = segment["text"];
      start = segment["timestamps"]["from"];
      end = segment["timestamps"]["to"];
    }
  }
  chunks.push({ start, end, text, embedding: [] });
  return chunks;
};
