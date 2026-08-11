# AI Use and Reflection

I used OpenAI Codex, a GPT-5 based coding agent, to help interpret the Lab 1 documents, configure the project foundation, diagnose setup problems, and verify the acceptance criteria. I reviewed the generated commands, source files, dependencies, and test results before accepting them.

## Selected Key Prompts

| Prompt name | Actual prompt text | Reflection |
| --- | --- | --- |
| Read Lab 1 | Read the Labsheet, Glossary, and Git/GitHub Cheat Sheet in detail and understand the task first. | Supplying all three documents helped separate required behavior from Git terminology and workflow. |
| Explain Step 1 | Teach Step 1 again after I created the repository in GitHub Desktop. | Asking for command-by-command explanations made the Git setup easier to verify. |
| Check Git status | Check the status and make sure I did it correctly. | This exposed that `.gitignore` had accidentally been created as a directory. |
| Implement foundation | Implement Issue 1 according to the requirements. | The first implementation established both applications, tests, Prisma, and documentation, but database reachability still needed separate proof. |
| Audit against Labsheet | Use grill-with-docs to check whether Issue 1 is complete and correct against the Labsheet. | A strict requirement-by-requirement audit found missing PostgreSQL evidence, GitHub workflow gaps, and duplicate test execution. |
| Correct the audit findings | Fix everything correctly, leaving only commit and push for me. | The follow-up improved the test layout, isolated the database to localhost, proved Prisma connectivity, and made the evidence more reproducible. |
| Implement the health check | Read the Issue 2 requirements with grill-with-docs, then implement the API health check and its UI behavior. | Defining idle, loading, online, and offline states before coding made the API contract and tests explicit. |
| Implement category seed | Implement the required Category model, migration, and idempotent seed on the Issue 3 branch without adding the Issue 4 API or UI. | Keeping the database preparation separate made the migration and repeated seed behavior easier to verify. |
| Implement category list | Implement Issue 4 as a full-stack slice that reads seeded categories through Prisma, returns them from Express, and displays API data with loading and error states in React. | Testing the API against PostgreSQL and mocking non-required category names in the UI test proved that the list was not hard-coded. |

## Reflection

Broad prompts were useful for understanding the whole lab, but smaller prompts produced results that were easier to inspect and explain. The most important improvement was asking the agent to prove each acceptance criterion rather than treating successful compilation as proof of the complete stack. For example, a valid Prisma schema did not prove that PostgreSQL was reachable, so I required a real database command. I also learned to verify generated test discovery because a passing count can be misleading when compiled tests run twice.

No production secrets or production data were used. A generated local-development database credential is stored only in the ignored `server/.env` file and is not part of the commit.
