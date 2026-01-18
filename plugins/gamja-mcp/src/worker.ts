interface Env {
  JCG_GAMJA_API_URL: string;
  MCP_AUTH_TOKEN: string; // Cloudflare Secret으로 설정
  MCP_API_KEY: string; // jcg-gamza API 인증 키
}

// ==================== Types ====================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface Subject {
  slug: string;
  name: string;
  fileCount: number;
}

interface TheoryFile {
  filename: string;
  title: string | null;
  description: string | null;
  tags: string[];
}

interface TheoryContent extends TheoryFile {
  content: string;
}

interface SearchResult {
  subject: string;
  filename: string;
  title: string | null;
  matchedContent: string;
  matchCount: number;
}

interface ExamRegistrationFile {
  filename: string;
  title: string | null;
  description: string | null;
  tags: string[];
}

interface ExamRegistrationContent extends ExamRegistrationFile {
  content: string;
}

// ==================== MCP Protocol Types ====================

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ==================== MCP Tools Definition ====================

const MCP_TOOLS: McpTool[] = [
  {
    name: "list_subjects",
    description: "jcg-gamza의 이론 과목 목록을 조회합니다",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_theory_files",
    description: "특정 과목의 이론 파일 목록을 조회합니다",
    inputSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "과목 slug (예: db, network-os, sw-design, sw-dev, security-newtech)",
        },
      },
      required: ["subject"],
    },
  },
  {
    name: "read_theory",
    description: "특정 이론 파일의 전체 MDX 내용을 조회합니다",
    inputSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "과목 slug",
        },
        filename: {
          type: "string",
          description: "파일명 (확장자 제외)",
        },
      },
      required: ["subject", "filename"],
    },
  },
  {
    name: "search_content",
    description: "jcg-gamza 콘텐츠에서 키워드를 검색합니다",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "검색 키워드 (2글자 이상)",
        },
        subject: {
          type: "string",
          description: "특정 과목으로 제한 (선택사항)",
        },
        limit: {
          type: "number",
          description: "결과 개수 제한 (기본값: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "extract_patterns",
    description: "이론 MDX 파일에서 키워드 표 패턴을 추출합니다 (에이전트 개발용)",
    inputSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "특정 과목으로 제한 (선택사항)",
        },
        limit: {
          type: "number",
          description: "샘플 파일 수 (기본값: 3)",
        },
      },
    },
  },
  {
    name: "list_exam_registration_files",
    description: "시험 응시(접수) 관련 파일 목록을 조회합니다",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "read_exam_registration",
    description: "특정 시험 응시(접수) 파일의 전체 MDX 내용을 조회합니다",
    inputSchema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "파일명 (확장자 제외)",
        },
      },
      required: ["filename"],
    },
  },
];

// ==================== API Helper ====================

async function fetchApi<T>(baseUrl: string, endpoint: string, apiKey: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        "x-mcp-api-key": apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ==================== Tool Implementations ====================

async function listSubjects(baseUrl: string, apiKey: string): Promise<string> {
  const result = await fetchApi<Subject[]>(baseUrl, "/api/content/subjects", apiKey);

  if (!result.success || !result.data) {
    return `오류: ${result.error || "과목 목록을 가져올 수 없습니다"}`;
  }

  const formatted = result.data
    .map((s) => `- ${s.name} (${s.slug}): ${s.fileCount}개 파일`)
    .join("\n");

  return `## jcg-gamza 과목 목록\n\n${formatted}`;
}

async function listTheoryFiles(baseUrl: string, apiKey: string, subject: string): Promise<string> {
  const result = await fetchApi<{ subject: string; files: TheoryFile[] }>(
    baseUrl,
    `/api/content/theory?subject=${encodeURIComponent(subject)}`,
    apiKey
  );

  if (!result.success || !result.data) {
    return `오류: ${result.error || "파일 목록을 가져올 수 없습니다"}`;
  }

  const formatted = result.data.files
    .map((f) => {
      const tags = f.tags.length > 0 ? ` [${f.tags.join(", ")}]` : "";
      return `- **${f.filename}**: ${f.title || "(제목 없음)"}${tags}`;
    })
    .join("\n");

  return `## ${subject} 이론 파일 목록 (${result.data.files.length}개)\n\n${formatted}`;
}

async function readTheory(baseUrl: string, apiKey: string, subject: string, filename: string): Promise<string> {
  const result = await fetchApi<TheoryContent>(
    baseUrl,
    `/api/content/theory?subject=${encodeURIComponent(subject)}&file=${encodeURIComponent(filename)}`,
    apiKey
  );

  if (!result.success || !result.data) {
    return `오류: ${result.error || "파일을 가져올 수 없습니다"}`;
  }

  const { title, description, tags, content } = result.data;
  const header = [
    `# ${title || filename}`,
    description ? `\n> ${description}` : "",
    tags.length > 0 ? `\n\n**태그**: ${tags.join(", ")}` : "",
    "\n\n---\n\n",
  ].join("");

  return header + content;
}

async function searchContent(
  baseUrl: string,
  apiKey: string,
  query: string,
  subject?: string,
  limit: number = 10
): Promise<string> {
  if (query.length < 2) {
    return "오류: 검색어는 2글자 이상이어야 합니다";
  }

  let endpoint = `/api/content/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (subject) {
    endpoint += `&subject=${encodeURIComponent(subject)}`;
  }

  const result = await fetchApi<{
    query: string;
    totalResults: number;
    results: SearchResult[];
  }>(baseUrl, endpoint, apiKey);

  if (!result.success || !result.data) {
    return `오류: ${result.error || "검색에 실패했습니다"}`;
  }

  if (result.data.results.length === 0) {
    return `"${query}"에 대한 검색 결과가 없습니다.`;
  }

  const formatted = result.data.results
    .map((r, i) => {
      return [
        `### ${i + 1}. ${r.title || r.filename}`,
        `- **위치**: ${r.subject}/${r.filename}`,
        `- **매칭 횟수**: ${r.matchCount}회`,
        `- **내용 미리보기**:\n  ${r.matchedContent.replace(/\n/g, "\n  ")}`,
      ].join("\n");
    })
    .join("\n\n");

  return `## "${query}" 검색 결과 (총 ${result.data.totalResults}개 중 ${result.data.results.length}개 표시)\n\n${formatted}`;
}

async function extractPatterns(
  baseUrl: string,
  apiKey: string,
  subject?: string,
  limit: number = 3
): Promise<string> {
  const subjectsToCheck = subject
    ? [subject]
    : ["db", "network-os", "sw-design", "sw-dev", "security-newtech"];

  const patterns: string[] = [];

  for (const subj of subjectsToCheck) {
    if (patterns.length >= limit) break;

    const listResult = await fetchApi<{ subject: string; files: TheoryFile[] }>(
      baseUrl,
      `/api/content/theory?subject=${subj}`,
      apiKey
    );

    if (!listResult.success || !listResult.data) continue;

    for (const file of listResult.data.files.slice(0, limit - patterns.length)) {
      const contentResult = await fetchApi<TheoryContent>(
        baseUrl,
        `/api/content/theory?subject=${subj}&file=${file.filename}`,
        apiKey
      );

      if (!contentResult.success || !contentResult.data) continue;

      const content = contentResult.data.content;
      const tableMatch = content.match(/\|.+\|[\s\S]*?\n\n/);
      if (tableMatch) {
        patterns.push(
          `### ${subj}/${file.filename}\n\`\`\`markdown\n${tableMatch[0].trim()}\n\`\`\``
        );
      }
    }
  }

  if (patterns.length === 0) {
    return "키워드 표 패턴을 찾을 수 없습니다.";
  }

  return `## 키워드 표 패턴 샘플 (${patterns.length}개)\n\n${patterns.join("\n\n")}`;
}

async function listExamRegistrationFiles(baseUrl: string, apiKey: string): Promise<string> {
  const result = await fetchApi<{ files: ExamRegistrationFile[] }>(
    baseUrl,
    "/api/content/exam-registration",
    apiKey
  );

  if (!result.success || !result.data) {
    return `오류: ${result.error || "시험 응시 파일 목록을 가져올 수 없습니다"}`;
  }

  const formatted = result.data.files
    .map((f) => {
      const tags = f.tags.length > 0 ? ` [${f.tags.join(", ")}]` : "";
      return `- **${f.filename}**: ${f.title || "(제목 없음)"}${tags}`;
    })
    .join("\n");

  return `## 시험 응시 파일 목록 (${result.data.files.length}개)\n\n${formatted}`;
}

async function readExamRegistration(baseUrl: string, apiKey: string, filename: string): Promise<string> {
  const result = await fetchApi<ExamRegistrationContent>(
    baseUrl,
    `/api/content/exam-registration?file=${encodeURIComponent(filename)}`,
    apiKey
  );

  if (!result.success || !result.data) {
    return `오류: ${result.error || "파일을 가져올 수 없습니다"}`;
  }

  const { title, description, tags, content } = result.data;
  const header = [
    `# ${title || filename}`,
    description ? `\n> ${description}` : "",
    tags.length > 0 ? `\n\n**태그**: ${tags.join(", ")}` : "",
    "\n\n---\n\n",
  ].join("");

  return header + content;
}

// ==================== MCP Request Handler ====================

async function handleMcpRequest(request: JsonRpcRequest, env: Env): Promise<JsonRpcResponse> {
  const baseUrl = env.JCG_GAMJA_API_URL || "https://jeongcheogi.edugamja.com";
  const apiKey = env.MCP_API_KEY;

  switch (request.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "gamja-mcp-server",
            version: "1.0.0",
          },
        },
      };

    case "notifications/initialized":
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {},
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: MCP_TOOLS,
        },
      };

    case "tools/call": {
      const params = request.params as { name: string; arguments?: Record<string, unknown> };
      const args = params.arguments || {};
      let resultText: string;

      switch (params.name) {
        case "list_subjects":
          resultText = await listSubjects(baseUrl, apiKey);
          break;
        case "list_theory_files":
          resultText = await listTheoryFiles(baseUrl, apiKey, args.subject as string);
          break;
        case "read_theory":
          resultText = await readTheory(baseUrl, apiKey, args.subject as string, args.filename as string);
          break;
        case "search_content":
          resultText = await searchContent(
            baseUrl,
            apiKey,
            args.query as string,
            args.subject as string | undefined,
            (args.limit as number) || 10
          );
          break;
        case "extract_patterns":
          resultText = await extractPatterns(
            baseUrl,
            apiKey,
            args.subject as string | undefined,
            (args.limit as number) || 3
          );
          break;
        case "list_exam_registration_files":
          resultText = await listExamRegistrationFiles(baseUrl, apiKey);
          break;
        case "read_exam_registration":
          resultText = await readExamRegistration(baseUrl, apiKey, args.filename as string);
          break;
        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: `Unknown tool: ${params.name}`,
            },
          };
      }

      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: resultText,
            },
          ],
        },
      };
    }

    default:
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`,
        },
      };
  }
}

// ==================== Auth Helper ====================

function validateAuth(request: Request, env: Env): { valid: boolean; error?: string } {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return { valid: false, error: "Authorization header required" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Invalid authorization format. Use: Bearer <token>" };
  }

  const token = authHeader.slice(7);

  if (!env.MCP_AUTH_TOKEN) {
    return { valid: false, error: "Server auth not configured" };
  }

  if (token !== env.MCP_AUTH_TOKEN) {
    return { valid: false, error: "Invalid token" };
  }

  return { valid: true };
}

// ==================== HTTP Handler ====================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check (public)
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          name: "gamja-mcp-server",
          version: "1.0.0",
          description: "MCP server for jcg-gamza educational content",
          status: "running",
          mcp_endpoint: "/mcp",
          auth: "Bearer token required",
          usage: "claude mcp add --transport http gamja-mcp <url> --header 'Authorization: Bearer <token>'",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // MCP HTTP endpoint (protected)
    if (url.pathname === "/mcp") {
      // Validate authentication
      const auth = validateAuth(request, env);
      if (!auth.valid) {
        return new Response(
          JSON.stringify({ error: auth.error }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "WWW-Authenticate": "Bearer",
            },
          }
        );
      }

      // HTTP Transport: only POST
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed. Use POST for MCP requests." }),
          {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const body = await request.json() as JsonRpcRequest;
        const response = await handleMcpRequest(body, env);

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: "2.0",
          id: 0,
          error: {
            code: -32700,
            message: "Parse error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
        };

        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 404 for other paths
    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  },
};
