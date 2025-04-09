import { useEffect, useState } from "react";
import "./App.css";
import "./mocks";
import axios from "axios";
import { Task } from "./types";

const POLL_INTERVAL = 4000; // in milliseconds
const MAX_FILE_SIZE = 2; // in megabytes
const MAX_FILE_SIZE_IN_BYTES = MAX_FILE_SIZE * 1024 * 1024;
let intervals: { [taskId: Task["id"]]: NodeJS.Timer | null } = {};

function App() {
  const [fileSelected, setFileSelected] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState([] as Task[]);

  async function pollTaskStatus(taskId: Task["id"]) {
    const taskResult = await axios.get<{ status: Task["status"] }>(
      `/status/${taskId.toString()}`
    );

    if (taskResult.data.status === "completed") {
      intervals[taskId] && clearInterval(intervals[taskId]);
      intervals[taskId] = null;
      setTasks((tasks) => {
        const taskIndex = tasks.findIndex((task) => task.id === taskId);
        let left = tasks.slice(0, taskIndex);
        let right = tasks.slice(taskIndex + 1);
        return [
          ...left,
          { ...tasks[taskIndex], status: "completed" },
          ...right,
        ];
      });
    }
  }

  async function uploadFile(e: any) {
    e.preventDefault();
    if (!fileSelected || !fileSelected.length) {
      setError("No file selected");
      return;
    }

    if (
      !fileSelected[0].type.includes("image/") &&
      !fileSelected[0].type.includes("application/pdf")
    ) {
      setError("This file is not a image or a .pdf file");
      return;
    }

    if (fileSelected[0].size >= MAX_FILE_SIZE_IN_BYTES) {
      setError("This file is not under 2MB");
      return;
    }
    const result = await axios.get<{ task_id: number }>("/task");
    const taskId = result.data.task_id;
    setTasks([
      ...tasks,
      {
        id: taskId,
        name: fileSelected[0].name,
        status: "in progress",
      },
    ]);

    intervals = {
      [taskId]: setInterval(() => pollTaskStatus(taskId), POLL_INTERVAL),
    };
  }

  function cancelTask(taskId: Task["id"]) {
    setTasks((tasks) => {
      const taskIndex = tasks.findIndex((task) => task.id === taskId);
      let left = tasks.slice(0, taskIndex);
      let right = tasks.slice(taskIndex + 1);
      return [...left, ...right];
    });
  }

  return (
    <div className="App">
      <form>
        <input
          type="file"
          onChange={(e) => setFileSelected(e.target.files)}
          accept=".pdf,image/*"
        />
        {fileSelected && (
          <button type="submit" onClick={uploadFile}>
            Upload
          </button>
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>

      <table>
        <thead>
          <tr>
            <td>Task Id</td>
            <td>Task Name</td>
            <td>Status</td>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>{task.id}</td>
              <td>{task.name}</td>
              <td>{task.status}</td>
              <td>
                {task.status !== "completed" && (
                  <button onClick={() => cancelTask(task.id)}>❌</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
