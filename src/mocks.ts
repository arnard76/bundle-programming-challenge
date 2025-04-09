import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { Task } from "./types";

const mock = new AxiosMockAdapter(axios);

mock.onGet("/task").reply(200, {
  task_id: Math.floor(Math.random() * 100),
});

const taskStatusURL = new RegExp("/status/*");
mock.onGet(taskStatusURL).reply<{ status: Task["status"] }>(200, {
  status: Math.random() > 0.8 ? "in progress" : "completed",
});
