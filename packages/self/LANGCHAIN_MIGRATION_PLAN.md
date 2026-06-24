# LangChain Migration Plan (`packages/self`)

## Objective
Convert `routes/image.ts` and `routes/match.ts` from static, hard-coded OpenAI SDK completions into modular, scalable LangChain.js Agents/Chains using LangChain Expression Language (LCEL).

## Phase 1: Dependencies & Setup
1. **Remove Raw OpenAI SDK**
   * Uninstall the direct OpenAI client: `bun remove openai` (if it is no longer used elsewhere).
2. **Install LangChain Core & Providers**
   * Install LangChain base modules: `bun add @langchain/core`
   * Install the modern OpenAI wrapper for LangChain: `bun add @langchain/openai`
   * *(Optional but recommended)* Install Zod for strict JSON schema typing: `bun add zod`

## Phase 2: Refactoring `routes/image.ts` into a Complaint Extraction Agent
Currently, this file formats a massive string and sends it as a raw `messages` array, parsing the JSON manually. We will rewrite this into a fully capable LangChain Agent.

1. **Adopt Structured Output & Tools**
   * Define a Zod schema representing the expected output: 
     ```typescript
     const complaintSchema = z.object({
       category: z.string(),
       subCategory: z.string(),
       complaint: z.string()
     });
     ```
   * Provide the model with specific Tools using `bindTools()` (e.g., for looking up valid categories dynamically) and define the structured output schema.
   
2. **Implement Agent Prompt & Memory**
   * Replace the hardcoded `messages` array with an Agent-focused `ChatPromptTemplate`.
   * Include a `MessagesPlaceholder` for the Agent's scratchpad so it can iteratively reason about the image contents and category options before returning the final classification.

3. **Initialize the Agent Executor**
   * Create the LangChain Agent (or LangGraph state graph) that leverages the multimodal LLM and any bound tools.
   * Execute the Agent, passing in the base64 image and allowing it to determine the best category autonomously.

## Phase 3: Refactoring `routes/match.ts` into an Image Comparison Agent
Currently, this file compares two images using raw vision capabilities. We will upgrade this into a dedicated, reasoning Image Comparison Agent.

1. **Adopt Structured Output**
   * Define a strict Matching Schema:
     ```typescript
     const matchSchema = z.object({
       match: z.boolean(),
       confidence: z.number().min(0).max(1),
       reason: z.string()
     });
     ```
   * Provide the Agent with the ability to structure its final conclusion using this schema securely.

2. **Multimodal Agent Prompting**
   * Use `HumanMessage` setups that allow the Agent to inspect two dynamic base64 images natively.
   * Add a `MessagesPlaceholder` to enable the Agent to "think" (using its scratchpad) about the differences and similarities across both images iteratively.

3. **Initialize the Agent Executor**
   * Instantiate the second LangChain Agent dedicated explicitly to image comparison.
   * Run the Agent executor to determine the match outcome, allowing it to self-correct if the initially observed features are ambiguous.

## Phase 4: Implementing a Manual Input Verification Agent (New Feature)
Currently, when a user manually enters a `subCategory` and `complaint` description (bypassing AI auto-fill), they can submit random gibberish (e.g., Category: "Infrastructure", Sub-Category: "xwerein", Description: "dofin"). We need a 3rd Agent to validate these text inputs for relevance and legibility before saving them.

1. **Adopt Structured Output**
   * Define a strict Zod schema for the validation results:
     ```typescript
     const validationSchema = z.object({
       isValid: z.boolean(),
       reason: z.string(), // e.g., "The word 'xwerein' is gibberish and does not relate to 'Infrastructure'."
       correctedSubCategory: z.string().optional() // Optional: Provide a cleaned-up version if there are minor typos.
     });
     ```
   * Bind this schema using `.withStructuredOutput(validationSchema)`, ensuring the backend gets a concrete boolean `isValid` flag to act upon.

2. **Agent Prompting Strategy**
   * Create a `ChatPromptTemplate` passing the selected `category`, along with the user's custom `subCategory` and `complaint` text.
   * Add a `SystemMessage` giving strict instructions: "You are a content validation agent. Ensure the user's inputs are legible, not random keyboard smashes, and logically fall under the provided parent category."

3. **Initialize the Validation Agent/Chain**
   * Create a new route (e.g., `routes/verify.ts`).
   * Instantiate the LangChain Agent.
   * If `isValid` returns `false`, the backend will reject the submission and return a `400 Bad Request` containing the Agent's `reason` so the frontend can prompt the user to fix their gibberish.

## Why Do This? (The Benefits)
* **Model Agnosticism (Future Proofing):** By using standard LangChain interfaces (`ChatOpenAI`, `ChatAnthropic`, `ChatGoogleGenerativeAI`), you can switch between models instantly with a single line change in your imports.
* **Guaranteed JSON Structure:** LangChain's structured output tools handle bad formatting, retries, and strict schema mapping behind the scenes.
* **LangSmith Observability:** By moving to LangChain, you can just set `LANGCHAIN_TRACING_V2=true` in your environment. You'll instantly see precisely what each Agent "saw", the tools they called, and their thought processes.
* **Extensibility:** By structuring these as true Agents from the start, adding new capabilities (e.g., giving the Complaint Agent a tool to search a database of existing complaints to verify locations) becomes trivial using `bindTools()`.
