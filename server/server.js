const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
const port = 3000;

const jiraApi = axios.create({
  baseURL: process.env.JIRA_BASE_URL,
  auth: {
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_ACCESS_TOKEN,
  },
});

app.get("/api/sprints/:id", async (req, res) => {
  const boardId = req.params.id;

  try {
    const response = await jiraApi.get(
      `/rest/agile/1.0/board/${boardId}/sprint`,
      { params: { startAt: 50, state: "closed, active" } }
    );
    const sprints = response.data.values;
    res.json(sprints);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sprints" });
  }
});

app.get("/api/sprint/:id", async (req, res) => {
  const sprintId = req.params.id;

  try {
    const response = await jiraApi.get(
      `/rest/agile/1.0/sprint/${sprintId}/issue`
    );
    const issues = response.data.issues;

    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sprints" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
