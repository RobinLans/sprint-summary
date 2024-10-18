import { useState } from "react";
import OpenAI from "openai";
import "./App.css";
import Markdown from "react-markdown";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPEN_AI_KEY,
  dangerouslyAllowBrowser: true,
});

const teams = [
  { name: "Team Business", id: 139 },
  { name: "Team Bilpriser", id: 147 },
  { name: "Team CaM", id: 151 },
  { name: "Team Process", id: 138 },
];

function App() {
  const [sprints, setSprints] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gptLoading, setGPTLoading] = useState(false);
  const [contentFromGPT, setContentFromGPT] = useState(null);

  async function getSprints(id) {
    setSelectedSprint(null);
    setIsLoading(true);
    const url = `http://localhost:3000/api/sprints/${id}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const data = await response.json();

      const sortedSprints = data
        .sort((a, b) => b.id - a.id)
        .filter((sprint) => sprint.originBoardId === id);
      // .filter((sprint) => sprint.state === "closed");

      setSprints(sortedSprints);
    } catch (error) {
      console.error(error.message);
    }
    setIsLoading(false);
  }

  function handleSelect(sprint) {
    setSelectedSprint({ name: sprint.name, id: sprint.id });
  }

  async function summarizeSprint(id) {
    setIsLoading(true);

    const allIssues = async () => {
      const url = `http://localhost:3000/api/sprint/${id}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();

        const completedIssues = data.sort(
          (issue) => issue.fields.status.name === "Done"
        );
        return completedIssues;
      } catch (error) {
        console.error(error.message);
      }
    };

    async function createPrompt(issues) {
      const issuesToString = issues
        .map((issue) => {
          if (issue.fields.description) {
            return `title: ${issue.fields.summary},
            description: ${
              issue.fields.description.length > 500
                ? ""
                : issue.fields.description
            },`;
          } else {
            return `title: ${issue.fields.summary}, description: None`;
          }
        })
        .join(". ")
        .replace(/(\r\n|\n|\r)/gm, "");

      const prompt = `I need a summary of the work that my team has done in the sprint. I will provide you with a issue title and an issue description. Some issues may be in Swedish, so please translate those into English. The issues will come in this format: "title: <some-title>, description: <some-description:>". Some more context is that FE means Frontend, BE means Backend. If issues share a resemblance such as frontend maintenance issues, try to combine them to keep the summary short. Here are all the issues: ${issuesToString}`;
      return prompt;
    }

    const prompt = await createPrompt(await allIssues());

    async function callChatGPT(prompt) {
      setGPTLoading(true);
      const chatCompletion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      setContentFromGPT(chatCompletion.choices[0].message.content);
      setGPTLoading(false);
    }

    callChatGPT(prompt);

    setIsLoading(false);
  }

  return (
    <div className='container'>
      <h1>Sprint Summarizer</h1>
      <div className='team-container'>
        <h3>Pick team:</h3>
        {teams.map((team) => {
          return (
            <button
              onClick={() => {
                setContentFromGPT(null);
                getSprints(team.id);
              }}
            >
              {team.name}
            </button>
          );
        })}
      </div>

      {isLoading && <h3>Loading...</h3>}
      {sprints && (
        <div className='sprint-container'>
          {sprints.length > 0 ? (
            <>
              <h3>Select a sprint:</h3>
              {sprints.map((sprint) => {
                return (
                  <button onClick={() => handleSelect(sprint)}>
                    {sprint.name} | ({sprint.state.toUpperCase()})
                  </button>
                );
              })}
            </>
          ) : (
            <h3>No Sprints found</h3>
          )}
        </div>
      )}
      <div className='summarize-container'>
        {selectedSprint && (
          <>
            <h3>Selected sprint: {selectedSprint.name}</h3>
            {!contentFromGPT && (
              <button onClick={() => summarizeSprint(selectedSprint.id)}>
                SUMMARIZE SPRINT
              </button>
            )}
          </>
        )}
        {gptLoading && <h3>Loading...</h3>}
        {contentFromGPT && (
          <div className='card'>
            <Markdown>{contentFromGPT}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
