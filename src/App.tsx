import { useEffect, useRef, useState } from "react";
import "./App.css";
import "./mocks";
import axios from "axios";
import { Task } from "./types";

const POLL_INTERVAL = 4000; // in milliseconds
const MAX_FILE_SIZE = 2; // in megabytes
const MAX_FILE_SIZE_IN_BYTES = MAX_FILE_SIZE * 1024 * 1024;

const statusColours: { [status in Task["status"]]: string } = {
  "in progress": "#d4f518",
  cancelled: "#f78f8f",
  completed: "#58ed51",
};

let intervals: { [taskId: Task["id"]]: NodeJS.Timer | null } = {};

function App() {
  const [fileSelected, setFileSelected] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState([] as Task[]);
  const fileInputRef = useRef<any>(undefined);

  function stopPolling(taskId: Task["id"]) {
    let intervalId = intervals[taskId];
    if (intervalId !== null) clearInterval(intervalId);
    intervals[taskId] = null;
  }

  async function pollTaskStatus(taskId: Task["id"]) {
    const taskResult = await axios.get<{ status: Task["status"] }>(
      `/status/${taskId.toString()}`
    );

    setTasks((tasks) => {
      const taskIndex = tasks.findIndex((task) => task.id === taskId);

      if (taskIndex === -1) stopPolling(taskId);

      if (taskResult.data.status === "completed") {
        stopPolling(taskId);
        let left = tasks.slice(0, taskIndex);
        let right = tasks.slice(taskIndex + 1);
        return [
          ...left,
          { ...tasks[taskIndex], status: "completed" },
          ...right,
        ];
      }
      return tasks;
    });
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

    setError("");
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

    setFileSelected(null);
    if (!fileInputRef.current) return;
    fileInputRef.current.value = null;
  }

  function cancelTask(taskId: Task["id"]) {
    setTasks((tasks) => {
      const taskIndex = tasks.findIndex((task) => task.id === taskId);
      const task: Task = { ...tasks[taskIndex], status: "cancelled" };
      stopPolling(taskId);
      let left = tasks.slice(0, taskIndex);
      let right = tasks.slice(taskIndex + 1);
      return [...left, task, ...right];
    });
  }

  // stop polling when component unmounts
  useEffect(() => {
    return () => {
      for (const task of tasks) {
        stopPolling(task.id);
      }
    };
  });

  return (
    <div className="App">
      <h2>Tasks</h2>
      <form style={{ marginTop: "1rem" }}>
        <input
          type="file"
          ref={fileInputRef}
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

      <table
        style={{
          width: "100%",
          alignItems: "start",
          textAlign: "start",
          padding: "1rem",
        }}
      >
        <thead>
          <tr>
            <td>ID</td>
            <td>Name</td>
            <td>Status</td>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              style={{
                backgroundColor: statusColours[task.status],
              }}
            >
              <td>{task.id}</td>
              <td>{task.name}</td>
              <td>{task.status}</td>
              <td>
                {task.status === "in progress" && (
                  <button
                    title="Cancel this task"
                    onClick={() => cancelTask(task.id)}
                  >
                    ❌
                  </button>
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
