import "./App.css";
import { BrowserRouter, Navigate, Route,Routes } from "react-router-dom";
import Layout from "./Layout";
import UploadPage from "./pages/UploadPage";
import ProcessingPage from "./pages/ProcessingPage";
import NotesPage from "./pages/NotesPage";
import PlayerPage from "./pages/PlayerPage";
import ChatPage from "./pages/ChatPage";
import QuizPage from "./pages/QuizPage";

function App() {

  return (

    <Routes>
      <Route path="/" element={<Layout/>}>
      <Route index element={<Navigate to="/upload" replace />} /> 
      <Route path="upload" element={<UploadPage/>} />
      <Route path ="processing" element = {<ProcessingPage/>}/>
      <Route path="notes" element={<NotesPage />} />
      <Route path="player" element={<PlayerPage />} />
      <Route path="chat" element={<ChatPage />} />
      <Route path="quiz" element={<QuizPage />} />
      </Route>
    </Routes>

  )
}

export default App;
