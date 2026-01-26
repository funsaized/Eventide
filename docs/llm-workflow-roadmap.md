# Next.js + Tailwind CSS Project Roadmap
## AI-Augmented Development Workflow: Ideation → Design → Development → Iteration

---

## Overview: Model Selection Strategy

| Phase | Primary Model | Use Case | Why |
|-------|---------------|----------|-----|
| **Ideation & Spec** | Gemini 2.5 Pro | Initial spec generation, screen recording analysis | Strong multimodal, good at creative expansion |
| **Architecture & Planning** | GPT-5.2 / o3 | Complex architectural decisions, system design | Deep reasoning for big-picture structure |
| **Spec Refinement** | Claude (Opus 4.5) | Interview-based spec drilling, detail extraction | AskUserQuestionTool, nuanced understanding |
| **Package Research** | ChatGPT (w/ search) | Finding GitHub packages, library comparison | Real-time search, community assessment |
| **Implementation** | Claude Code (Opus 4.5) | Primary coding, complex features | Best code generation, agentic coding |
| **Quick Edits & Polish** | Sonnet 4.5 | Code review, small fixes, refactoring | Fast, accurate for targeted changes |
| **Explanations & Helpers** | Haiku 4.5 | Quick answers, small utilities, explanations | Speed, cost-effective for simple tasks |
| **Design & Creativity** | Gemini 2.5 Pro | UI/UX exploration, design system decisions | Creative exploration, visual thinking |

---

## Phase 1: Ideation & Requirements Capture (Days 1-3)

### Step 1.1: Screen Recording Spec Generation
**Tool:** Loom/Screen Studio + Gemini 2.5 Pro

**Process:**
1. Record yourself walking through competitor apps or rough sketches
2. Narrate what you want: features, flows, pain points to solve
3. Upload to Gemini 2.5 Pro with this prompt:

```
Analyze this screen recording of me walking through [competitor/sketch].
Extract:
1. All features I mentioned or demonstrated
2. User flows and interactions
3. Pain points I want to solve
4. Implicit requirements I may have hinted at
5. Technical requirements inferred from the UI

Output as a structured specification document in markdown (PRD).
```

### Step 1.2: Spec Refinement via AI Interview
**Tool:** Claude (Opus 4.5) with AskUserQuestionTool

**Prompt:**
```
Read this @spec.md and interview me in detail using the AskUserQuestionTool 
about literally anything: technical implementation, UI & UX, concerns, 
tradeoffs, etc. 

Rules:
- Questions should NOT be obvious
- Be very in-depth and specific
- Continue interviewing me continually until complete
- Challenge my assumptions
- Ask about edge cases, error states, mobile considerations
- Probe on data models, state management, authentication flows

When complete, write the refined spec back to a new file spec-v2.md  (comprehensive, interview-refined specification).
```

**Output:** `SPEC-v2.md` - Comprehensive, interview-refined specification

---

## Phase 2: Architecture & Package Research (Days 4-5)

### Step 2.1: Architecture Planning
**Tool:** GPT-5.2 / o3 (or current best reasoning model)

**When to use:** When the spec is going to be big and you need structural clarity

**Prompt:**
```
Given this specification for a Next.js + Tailwind CSS application:

[paste SPEC-v2.md]

Provide architectural guidance:
1. Recommended folder structure for this scale
2. State management approach
3. Data fetching patterns (Server Components vs. Client, when to use each)
4. Authentication architecture 
5. Database schema high-level design
6. API route organization
7. Component composition strategy
8. Testing strategy appropriate for this scope

Consider: scalability, team size of 1-3, iteration speed, and maintainability.
```

**Output:** `ARCHITECTURE.md`

### Step 2.2: Package Research
**Tool:** ChatGPT with web search enabled

**Prompt:**
```
Using this specification:

[paste SPEC-v2.md]

Search online and find relevant GitHub packages useful for developing this 
Next.js + Tailwind CSS application.

Requirements:
- Well-maintained (updated within last 3 months)
- Reliable communities (>1000 GitHub stars preferred)
- Compatible with Next.js 15+ and React 19
- Compatible with Tailwind CSS v4

For each feature area, propose 2-3 options with:
- Package name and GitHub link
- Last update date
- Star count
- Bundle size
- Pros/cons comparison
- Your recommendation and why

Feature areas to research:
1. UI Component library (shadcn/ui, Radix, etc.)
2. Form handling (React Hook Form, Conform, etc.)
3. Authentication (NextAuth, Clerk, Lucia, etc.)
4. Database ORM (Prisma, Drizzle, etc.)
5. State management (if needed beyond React Query)
6. Animation library (Framer Motion, etc.)
7. [Add specific features from your spec]
```

**Output:** `PACKAGES.md` - Curated package recommendations

---

## Phase 3: Design & UI/UX (Days 6-10)

### Step 3.1: Design System Foundation
**Tool:** Gemini 2.5 Pro (for creativity) + v0.dev or Claude Artifacts

**Process:**
1. Use Gemini for design exploration:
```
Based on this app specification:
[paste SPEC-v2.md]

Propose a design system including:
1. Color palette (with Tailwind color names)
2. Typography scale
3. Spacing system
4. Component style direction (rounded vs sharp, shadows, borders)
5. Animation philosophy (subtle, playful, professional)
6. Reference sites/apps for inspiration

Consider the target audience: [describe users]
```

2. Use v0.dev or Claude Artifacts for rapid UI prototyping:
```
Create a [specific component/page] for a [app description].
Use Next.js, Tailwind CSS, and shadcn/ui components.
Style: [paste design direction from Gemini]
```

### Step 3.2: Component Inventory
**Tool:** Claude (Sonnet 4.5) - fast for this task

**Prompt:**
```
Based on this spec and these wireframes/descriptions:
[paste relevant sections]

Create a component inventory listing:
1. All unique UI components needed
2. Their variants (sizes, states)
3. Props each component needs
4. Which can use shadcn/ui directly
5. Which need customization
6. Which are fully custom

Output as a checklist I can track during development.
```

**Output:** `COMPONENTS.md`

---

## Phase 4: Development Setup (Day 11)

### Step 4.1: Project Initialization
**Tool:** Terminal + Claude Code (Haiku for speed)

```bash
# Create Next.js project
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir

# Initialize shadcn/ui
npx shadcn@latest init

# Install core dependencies from PACKAGES.md
npm install [packages from research phase]
```

### Step 4.2: Spec-Based Phase Breakdown
**Tool:** Claude Code (Opus 4.5)

**Critical Step:** Break the full spec into implementable phases

**Prompt:**
```
Read @SPEC-v2.md, @ARCHITECTURE.md, and @PACKAGES.md

Break this project into sequential implementation phases. Each phase should:
1. Be completable in 1-3 coding sessions
2. Result in something testable/demoable
3. Build on previous phases
4. Have clear acceptance criteria

Create a PHASES.md file with:
- [ ] Phase 1: [Name] - [Description]
  - Acceptance criteria: ...
  - Files to create/modify: ...
- [ ] Phase 2: ...
(continue for all phases)

As we complete each phase, you will check it off in this file.
```

**Output:** `PHASES.md` - Your development roadmap checklist

---

## Phase 5: Implementation (Days 12+)

### Step 5.1: Primary Development Loop
**Tool:** Claude Code (Opus 4.5) with Planning Mode enabled

**Session Start Prompt:**
```
We're implementing Phase [X] of @PHASES.md

Context:
- Spec: @SPEC-v2.md
- Architecture: @ARCHITECTURE.md  
- Packages: @PACKAGES.md

Rules:
1. Use libraries from PACKAGES.md - don't reinvent
2. Follow patterns established in ARCHITECTURE.md
3. Check off completed items in PHASES.md
4. Create tests for critical paths
5. Use shadcn/ui components where applicable

Begin with Phase [X]: [Name]
```

### Step 5.2: Planning Mode Sub-Agents
**When:** Complex features requiring exploration

Claude Code's planning mode will:
1. Spin up **explore sub-agents** to find established patterns
2. Pass findings to **planning sub-agent** 
3. Create execution plan for implementation agents

**Tip from notes:** Don't split frontend/backend sub-agents within same codebase - they coordinate poorly. Instead, use sub-agents for:
- Context control (isolating exploration)
- Multi-angle problem analysis
- Specific tool/MCP server usage

**Example:**
```
Spin up an Opus sub-agent to analyze this bug from multiple angles:
1. State management perspective
2. Race condition perspective  
3. Component lifecycle perspective

Use the @browser MCP server to check the network tab behavior.
```

### Step 5.3: Quick Fixes & Polish
**Tool:** Claude Sonnet 4.5

**Use for:**
- Code review of completed phases
- Small refactoring tasks
- Type improvements
- Linting fixes

```
Review the code in @src/components/[feature] for:
1. TypeScript strictness improvements
2. Unnecessary re-renders
3. Accessibility issues
4. Tailwind class optimization
```

### Step 5.4: Quick Answers & Small Helpers
**Tool:** Claude Haiku 4.5

**Use for:**
- "How do I do X in Tailwind?"
- "What's the syntax for Y?"
- Small utility function generation
- Quick explanations

---

## Phase 6: Testing & Iteration (Ongoing)

### Step 6.1: Test Generation
**Tool:** Claude Code (Sonnet 4.5)

```
Generate tests for @src/features/[feature]:
1. Unit tests for utilities
2. Component tests with React Testing Library
3. Integration tests for API routes
4. E2E test scenarios (Playwright)

Focus on critical user paths from the spec.
```

### Step 6.2: Bug Analysis
**Tool:** Claude Code (Opus 4.5) with sub-agents

```
Analyze this bug: [description]

Spin up sub-agents to consider:
1. An Opus sub-agent examining state flow
2. A sub-agent checking the database queries
3. A sub-agent reviewing the component tree

Synthesize findings and propose fix.
```

---

## Workflow Summary Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         IDEATION                                 │
├─────────────────────────────────────────────────────────────────┤
│  Screen Recording ──► Gemini 2.5 Pro ──► Initial Spec          │
│                              │                                   │
│                              ▼                                   │
│                    Claude Opus (Interview)                       │
│                              │                                   │
│                              ▼                                   │
│                       SPEC-v2.md                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE & RESEARCH                       │
├─────────────────────────────────────────────────────────────────┤
│  GPT-5.2/o3 ──► Architecture Decisions ──► ARCHITECTURE.md      │
│                                                                  │
│  ChatGPT + Search ──► Package Research ──► PACKAGES.md          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DESIGN                                   │
├─────────────────────────────────────────────────────────────────┤
│  Gemini 2.5 Pro ──► Design Direction                            │
│                              │                                   │
│  v0.dev / Claude ──► Rapid Prototypes                           │
│                              │                                   │
│  Sonnet 4.5 ──► Component Inventory ──► COMPONENTS.md           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IMPLEMENTATION                              │
├─────────────────────────────────────────────────────────────────┤
│  Claude Code (Opus 4.5) ──► Phase Breakdown ──► PHASES.md       │
│            │                                                     │
│            ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Development Loop (per phase):                          │    │
│  │                                                         │    │
│  │  Opus 4.5 ──► Complex Implementation                    │    │
│  │  Sonnet 4.5 ──► Review & Polish                        │    │
│  │  Haiku 4.5 ──► Quick Answers                           │    │
│  │                                                         │    │
│  │  Planning Mode ──► Sub-agents for exploration          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TESTING & ITERATION                           │
├─────────────────────────────────────────────────────────────────┤
│  Sonnet 4.5 ──► Test Generation                                 │
│  Opus 4.5 + Sub-agents ──► Bug Analysis                         │
│  Haiku 4.5 ──► Quick Fixes                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tool Setup Checklist

### Required Tools
- [ ] **Claude Code** - Primary coding agent (install via `npm install -g @anthropic-ai/claude-code`)
- [ ] **Cursor / VS Code** - IDE with AI integration
- [ ] **Gemini 2.5 Pro access** - Google AI Studio or API
- [ ] **ChatGPT Plus** - For web search capabilities
- [ ] **v0.dev** - Rapid UI prototyping
- [ ] **Loom / Screen Studio** - Screen recording for specs

### Optional Enhancements
- [ ] **Codex CLI** - OpenAI's coding agent (investigate as alternative)
- [ ] **MCP Servers** - For extended Claude Code capabilities
- [ ] **Multiple Claude Code instances** - Parallel task execution (watch for git merge conflicts)

---

## Anti-Patterns to Avoid

Based on the notes:

1. **Don't let agents write from scratch** when libraries exist
   - Always provide PACKAGES.md context
   - Explicitly instruct: "Use [library] for this, don't implement yourself"

2. **Don't use frontend/backend sub-agents in same codebase**
   - They misinterpret requirements and coordinate poorly
   - Use sub-agents for context control and multi-angle analysis instead

3. **Don't give limited context to implementation agents**
   - Always provide: Spec + Architecture + Packages + Current phase
   - Outdated context = reinventing wheels

4. **Don't forget to check off phases**
   - Maintains progress visibility
   - Helps agent understand what's done vs. remaining

---

## Quick Reference: Which Model When?

| Task | Model | Time |
|------|-------|------|
| "Analyze this screen recording" | Gemini 2.5 Pro | 2-5 min |
| "Interview me about the spec" | Claude Opus 4.5 | 15-30 min |
| "How should I architect this?" | GPT-5.2 / o3 | 5-10 min |
| "Find packages for feature X" | ChatGPT + Search | 5-10 min |
| "Build the auth flow" | Claude Code Opus | 30-60 min |
| "Review this code" | Claude Sonnet 4.5 | 2-5 min |
| "What's the Tailwind class for...?" | Claude Haiku 4.5 | <30 sec |
| "Explore design directions" | Gemini 2.5 Pro | 5-10 min |
| "Analyze bug from multiple angles" | Opus + Sub-agents | 10-20 min |

---

## Getting Started: Day 1 Actions

1. **Record a 5-10 minute Loom** walking through your app idea
2. **Upload to Gemini 2.5 Pro** with the spec extraction prompt
3. **Pass output to Claude** for interview-based refinement
4. **Create project folder** with:
   ```
   /project-root
   ├── docs/
   │   ├── SPEC-v1.md (Gemini output)
   │   ├── SPEC-v2.md (Claude refined)
   │   ├── ARCHITECTURE.md (GPT-5.2)
   │   ├── PACKAGES.md (ChatGPT research)
   │   ├── COMPONENTS.md (Component inventory)
   │   └── PHASES.md (Development checklist)
   └── src/ (Next.js app)
   ```

You're ready to build! 🚀
