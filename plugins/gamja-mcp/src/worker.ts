interface Env {
  JCG_GAMJA_API_URL: string;
  MCP_AUTH_TOKEN: string; // Cloudflare Secret으로 설정
  MCP_API_KEY: string; // jcg-gamza API 인증 키
  AUTH_USERNAME: string; // 로그인 아이디
  AUTH_PASSWORD: string; // 로그인 패스워드
  OAUTH_STORE: KVNamespace; // OAuth authorization codes & tokens
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

// ==================== OAuth 2.1 Types & Constants ====================

const OAUTH_SCOPES = ["mcp:read", "mcp:write"];
const AUTH_CODE_TTL = 600; // 10 minutes
const ACCESS_TOKEN_TTL = 3600; // 1 hour

interface AuthorizationCodeData {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  expiresAt: number;
}

interface OAuthTokenData {
  accessToken: string;
  clientId: string;
  scope: string;
  expiresAt: number;
}

// ==================== OAuth 2.1 Utility Functions ====================

function getServerUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifyPKCE(codeVerifier: string, codeChallenge: string, method: string): Promise<boolean> {
  if (method !== "S256") {
    return false;
  }
  const hash = await sha256(codeVerifier);
  const computed = base64UrlEncode(hash);
  return computed === codeChallenge;
}

// ==================== HTML Templates ====================

function renderHomePage(serverUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gamja MCP Server</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #e8e8e8;
      line-height: 1.6;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    header {
      text-align: center;
      margin-bottom: 48px;
    }
    .logo {
      font-size: 64px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }
    .version {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .description {
      font-size: 1.1rem;
      color: #a0a0a0;
      max-width: 500px;
      margin: 0 auto;
    }
    .status-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(46, 213, 115, 0.15);
      border: 1px solid rgba(46, 213, 115, 0.3);
      padding: 16px 24px;
      border-radius: 12px;
      margin-bottom: 40px;
    }
    .status-dot {
      width: 12px;
      height: 12px;
      background: #2ed573;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(46, 213, 115, 0.4); }
      50% { opacity: 0.8; box-shadow: 0 0 0 8px rgba(46, 213, 115, 0); }
    }
    .status-text {
      color: #2ed573;
      font-weight: 600;
      font-size: 1rem;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 24px;
      backdrop-filter: blur(10px);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .card-icon {
      font-size: 1.5rem;
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #fff;
    }
    .endpoint-list {
      list-style: none;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      margin-bottom: 10px;
      transition: all 0.2s ease;
    }
    .endpoint-item:hover {
      background: rgba(102, 126, 234, 0.2);
      transform: translateX(4px);
    }
    .endpoint-item:last-child { margin-bottom: 0; }
    .endpoint-name {
      font-weight: 500;
      color: #e8e8e8;
    }
    .endpoint-url {
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
      font-size: 0.85rem;
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      padding: 4px 10px;
      border-radius: 6px;
      word-break: break-all;
    }
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
    }
    .tool-item {
      background: rgba(0, 0, 0, 0.2);
      padding: 16px;
      border-radius: 10px;
      border-left: 3px solid #667eea;
    }
    .tool-name {
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 6px;
    }
    .tool-desc {
      font-size: 0.9rem;
      color: #a0a0a0;
    }
    .auth-info {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border: 1px solid rgba(102, 126, 234, 0.3);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .auth-info p {
      color: #a0a0a0;
      margin-bottom: 8px;
    }
    .auth-highlight {
      font-weight: 600;
      color: #667eea;
    }
    footer {
      text-align: center;
      padding: 32px 0;
      color: #666;
      font-size: 0.9rem;
    }
    footer a {
      color: #667eea;
      text-decoration: none;
    }
    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">🍠</div>
      <h1>Gamja MCP Server</h1>
      <span class="version">v2.0.0</span>
      <p class="description">jcg-gamza 교육 콘텐츠를 위한 Model Context Protocol 서버</p>
    </header>

    <div class="status-banner">
      <div class="status-dot"></div>
      <span class="status-text">서버가 정상 작동 중입니다</span>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-icon">🔐</span>
        <h2 class="card-title">OAuth 2.1 엔드포인트</h2>
      </div>
      <ul class="endpoint-list">
        <li class="endpoint-item">
          <span class="endpoint-name">Protected Resource Metadata</span>
          <code class="endpoint-url">${serverUrl}/.well-known/oauth-protected-resource</code>
        </li>
        <li class="endpoint-item">
          <span class="endpoint-name">Authorization Server Metadata</span>
          <code class="endpoint-url">${serverUrl}/.well-known/oauth-authorization-server</code>
        </li>
        <li class="endpoint-item">
          <span class="endpoint-name">Authorization Endpoint</span>
          <code class="endpoint-url">${serverUrl}/oauth/authorize</code>
        </li>
        <li class="endpoint-item">
          <span class="endpoint-name">Token Endpoint</span>
          <code class="endpoint-url">${serverUrl}/oauth/token</code>
        </li>
      </ul>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-icon">🔌</span>
        <h2 class="card-title">API 엔드포인트</h2>
      </div>
      <ul class="endpoint-list">
        <li class="endpoint-item">
          <span class="endpoint-name">MCP Endpoint</span>
          <code class="endpoint-url">${serverUrl}/mcp</code>
        </li>
        <li class="endpoint-item">
          <span class="endpoint-name">Health Check</span>
          <code class="endpoint-url">${serverUrl}/health</code>
        </li>
      </ul>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-icon">🛠️</span>
        <h2 class="card-title">사용 가능한 도구</h2>
      </div>
      <div class="tools-grid">
        <div class="tool-item">
          <div class="tool-name">list_subjects</div>
          <div class="tool-desc">이론 과목 목록 조회</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">list_theory_files</div>
          <div class="tool-desc">특정 과목의 이론 파일 목록</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">read_theory</div>
          <div class="tool-desc">이론 파일 내용 조회</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">search_content</div>
          <div class="tool-desc">콘텐츠 키워드 검색</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">extract_patterns</div>
          <div class="tool-desc">키워드 표 패턴 추출</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">list_exam_registration_files</div>
          <div class="tool-desc">시험 응시 파일 목록</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">read_exam_registration</div>
          <div class="tool-desc">시험 응시 파일 내용</div>
        </div>
      </div>
    </div>

    <div class="auth-info">
      <p>인증 방법</p>
      <p class="auth-highlight">Claude Code에서 Authenticate 버튼을 사용하세요</p>
      <p>OAuth 2.1 + PKCE 방식으로 안전하게 인증됩니다</p>
    </div>

    <footer>
      <p>Gamja MCP Server &copy; 2025 | <a href="https://jeongcheogi.edugamja.com" target="_blank">jcg-gamza</a></p>
    </footer>
  </div>
</body>
</html>`;
}

function renderHealthPage(serverUrl: string): string {
  const timestamp = new Date().toISOString();
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gamja MCP - Health Status</title>
  <meta http-equiv="refresh" content="30">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #e8e8e8;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .health-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 48px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(10px);
    }
    .health-icon {
      font-size: 80px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .version {
      color: #a0a0a0;
      margin-bottom: 32px;
    }
    .status-container {
      background: rgba(46, 213, 115, 0.1);
      border: 2px solid rgba(46, 213, 115, 0.3);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .status-label {
      font-size: 0.9rem;
      color: #a0a0a0;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .status-value {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .status-dot {
      width: 16px;
      height: 16px;
      background: #2ed573;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(46, 213, 115, 0.4); }
      50% { opacity: 0.8; box-shadow: 0 0 0 12px rgba(46, 213, 115, 0); }
    }
    .status-text {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2ed573;
    }
    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }
    .metric {
      background: rgba(0, 0, 0, 0.2);
      padding: 20px;
      border-radius: 12px;
    }
    .metric-label {
      font-size: 0.8rem;
      color: #888;
      margin-bottom: 6px;
    }
    .metric-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: #667eea;
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
    }
    .timestamp {
      font-size: 0.85rem;
      color: #666;
    }
    .refresh-note {
      font-size: 0.75rem;
      color: #555;
      margin-top: 8px;
    }
    .back-link {
      display: inline-block;
      margin-top: 24px;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    .back-link:hover {
      color: #764ba2;
    }
  </style>
</head>
<body>
  <div class="health-card">
    <div class="health-icon">💓</div>
    <h1>Gamja MCP Server</h1>
    <p class="version">Version 2.0.0</p>

    <div class="status-container">
      <div class="status-label">Server Status</div>
      <div class="status-value">
        <div class="status-dot"></div>
        <span class="status-text">Healthy</span>
      </div>
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Protocol</div>
        <div class="metric-value">MCP 2024-11-05</div>
      </div>
      <div class="metric">
        <div class="metric-label">Auth</div>
        <div class="metric-value">OAuth 2.1</div>
      </div>
      <div class="metric">
        <div class="metric-label">Tools</div>
        <div class="metric-value">7 Available</div>
      </div>
      <div class="metric">
        <div class="metric-label">Runtime</div>
        <div class="metric-value">Cloudflare</div>
      </div>
    </div>

    <p class="timestamp">Last checked: ${timestamp}</p>
    <p class="refresh-note">This page auto-refreshes every 30 seconds</p>

    <a href="/" class="back-link">← Back to Home</a>
  </div>
</body>
</html>`;
}

// ==================== OAuth 2.1 Metadata Endpoints ====================

function getProtectedResourceMetadata(serverUrl: string): object {
  return {
    resource: serverUrl,
    authorization_servers: [serverUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: OAUTH_SCOPES,
    resource_documentation: `${serverUrl}/docs`,
  };
}

function getAuthorizationServerMetadata(serverUrl: string): object {
  return {
    issuer: serverUrl,
    authorization_endpoint: `${serverUrl}/oauth/authorize`,
    token_endpoint: `${serverUrl}/oauth/token`,
    registration_endpoint: `${serverUrl}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: OAUTH_SCOPES,
  };
}

// ==================== OAuth 2.1 Dynamic Client Registration ====================

interface ClientRegistrationRequest {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}

interface ClientRegistrationResponse {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  client_id_issued_at: number;
}

async function handleOAuthRegister(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "invalid_request", error_description: "Method must be POST" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json() as ClientRegistrationRequest;

    if (!body.redirect_uris || body.redirect_uris.length === 0) {
      return new Response(
        JSON.stringify({ error: "invalid_client_metadata", error_description: "redirect_uris is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate a unique client_id
    const clientId = `client_${generateRandomString(24)}`;
    const issuedAt = Math.floor(Date.now() / 1000);

    const clientData: ClientRegistrationResponse = {
      client_id: clientId,
      client_name: body.client_name,
      redirect_uris: body.redirect_uris,
      grant_types: body.grant_types || ["authorization_code"],
      response_types: body.response_types || ["code"],
      token_endpoint_auth_method: body.token_endpoint_auth_method || "none",
      client_id_issued_at: issuedAt,
    };

    // Store client registration (no expiration - permanent until deleted)
    await env.OAUTH_STORE.put(`client:${clientId}`, JSON.stringify(clientData));

    return new Response(JSON.stringify(clientData), {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "invalid_client_metadata",
        error_description: error instanceof Error ? error.message : "Invalid request body"
      }),
      { status: 400, headers: corsHeaders }
    );
  }
}

// ==================== OAuth 2.1 Authorize Endpoint ====================

function renderLoginPage(
  clientId: string,
  redirectUri: string,
  state: string,
  scope: string,
  codeChallenge: string,
  codeChallengeMethod: string,
  error?: string
): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gamja MCP - 로그인</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 8px;
      font-size: 24px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .error {
      background: #fee;
      color: #c00;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      margin-bottom: 6px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .client-info {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Gamja MCP</h1>
    <p class="subtitle">Claude Code에서 접근을 요청합니다</p>
    ${error ? `<div class="error">${error}</div>` : ""}
    <form method="POST">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="state" value="${state}">
      <input type="hidden" name="scope" value="${scope}">
      <input type="hidden" name="code_challenge" value="${codeChallenge}">
      <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">
      <div class="form-group">
        <label for="username">아이디</label>
        <input type="text" id="username" name="username" required autocomplete="username">
      </div>
      <div class="form-group">
        <label for="password">패스워드</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>
      <button type="submit">로그인 및 승인</button>
    </form>
    <div class="client-info">
      <strong>클라이언트:</strong> ${clientId}<br>
      <strong>권한:</strong> ${scope || "mcp:read"}
    </div>
  </div>
</body>
</html>`;
}

async function handleOAuthAuthorize(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "GET") {
    // Show login form
    const clientId = url.searchParams.get("client_id") || "";
    const redirectUri = url.searchParams.get("redirect_uri") || "";
    const state = url.searchParams.get("state") || "";
    const scope = url.searchParams.get("scope") || "mcp:read";
    const codeChallenge = url.searchParams.get("code_challenge") || "";
    const codeChallengeMethod = url.searchParams.get("code_challenge_method") || "S256";

    if (!clientId || !redirectUri || !codeChallenge) {
      return new Response(
        renderLoginPage(clientId, redirectUri, state, scope, codeChallenge, codeChallengeMethod,
          "필수 파라미터가 누락되었습니다 (client_id, redirect_uri, code_challenge)"),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new Response(
      renderLoginPage(clientId, redirectUri, state, scope, codeChallenge, codeChallengeMethod),
      { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (request.method === "POST") {
    // Process login form
    const formData = await request.formData();
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const clientId = formData.get("client_id") as string;
    const redirectUri = formData.get("redirect_uri") as string;
    const state = formData.get("state") as string;
    const scope = formData.get("scope") as string || "mcp:read";
    const codeChallenge = formData.get("code_challenge") as string;
    const codeChallengeMethod = formData.get("code_challenge_method") as string || "S256";

    // Validate credentials
    if (username !== env.AUTH_USERNAME || password !== env.AUTH_PASSWORD) {
      return new Response(
        renderLoginPage(clientId, redirectUri, state, scope, codeChallenge, codeChallengeMethod,
          "아이디 또는 패스워드가 올바르지 않습니다"),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Generate authorization code
    const authCode = generateRandomString(32);
    const codeData: AuthorizationCodeData = {
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      scope,
      expiresAt: Date.now() + AUTH_CODE_TTL * 1000,
    };

    // Store authorization code in KV
    await env.OAUTH_STORE.put(`code:${authCode}`, JSON.stringify(codeData), {
      expirationTtl: AUTH_CODE_TTL,
    });

    // Redirect back to client
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("code", authCode);
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    return Response.redirect(redirectUrl.toString(), 302);
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
}

// ==================== OAuth 2.1 Token Endpoint ====================

async function handleOAuthToken(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "invalid_request", error_description: "Method must be POST" }),
      { status: 405, headers: corsHeaders }
    );
  }

  let grantType: string, code: string, codeVerifier: string, clientId: string, redirectUri: string;

  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json() as Record<string, string>;
    grantType = body.grant_type;
    code = body.code;
    codeVerifier = body.code_verifier;
    clientId = body.client_id;
    redirectUri = body.redirect_uri;
  } else {
    const formData = await request.formData();
    grantType = formData.get("grant_type") as string;
    code = formData.get("code") as string;
    codeVerifier = formData.get("code_verifier") as string;
    clientId = formData.get("client_id") as string;
    redirectUri = formData.get("redirect_uri") as string;
  }

  if (grantType !== "authorization_code") {
    return new Response(
      JSON.stringify({ error: "unsupported_grant_type", error_description: "Only authorization_code is supported" }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (!code || !codeVerifier) {
    return new Response(
      JSON.stringify({ error: "invalid_request", error_description: "Missing code or code_verifier" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Retrieve and delete authorization code
  const codeDataStr = await env.OAUTH_STORE.get(`code:${code}`);
  if (!codeDataStr) {
    return new Response(
      JSON.stringify({ error: "invalid_grant", error_description: "Invalid or expired authorization code" }),
      { status: 400, headers: corsHeaders }
    );
  }
  await env.OAUTH_STORE.delete(`code:${code}`);

  const codeData: AuthorizationCodeData = JSON.parse(codeDataStr);

  // Verify PKCE
  const pkceValid = await verifyPKCE(codeVerifier, codeData.codeChallenge, codeData.codeChallengeMethod);
  if (!pkceValid) {
    return new Response(
      JSON.stringify({ error: "invalid_grant", error_description: "PKCE verification failed" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Verify client_id and redirect_uri match
  if (clientId && clientId !== codeData.clientId) {
    return new Response(
      JSON.stringify({ error: "invalid_grant", error_description: "Client ID mismatch" }),
      { status: 400, headers: corsHeaders }
    );
  }
  if (redirectUri && redirectUri !== codeData.redirectUri) {
    return new Response(
      JSON.stringify({ error: "invalid_grant", error_description: "Redirect URI mismatch" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Generate access token
  const accessToken = generateRandomString(48);
  const tokenData: OAuthTokenData = {
    accessToken,
    clientId: codeData.clientId,
    scope: codeData.scope,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL * 1000,
  };

  // Store access token in KV
  await env.OAUTH_STORE.put(`token:${accessToken}`, JSON.stringify(tokenData), {
    expirationTtl: ACCESS_TOKEN_TTL,
  });

  return new Response(
    JSON.stringify({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL,
      scope: codeData.scope,
    }),
    { status: 200, headers: corsHeaders }
  );
}

// ==================== Auth Helper ====================

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await request.json() as LoginRequest;
    const { username, password } = body;

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Username and password are required" } as LoginResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 환경변수에서 설정된 자격 증명과 비교
    if (username === env.AUTH_USERNAME && password === env.AUTH_PASSWORD) {
      return new Response(
        JSON.stringify({
          success: true,
          token: env.MCP_AUTH_TOKEN,
        } as LoginResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid credentials" } as LoginResponse),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Invalid JSON body: ${error instanceof Error ? error.message : "Unknown error"}`,
      } as LoginResponse),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function validateAuth(request: Request, env: Env): Promise<{ valid: boolean; error?: string }> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return { valid: false, error: "Authorization header required" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Invalid authorization format. Use: Bearer <token>" };
  }

  const token = authHeader.slice(7);

  // First, check if it's the legacy static token
  if (env.MCP_AUTH_TOKEN && token === env.MCP_AUTH_TOKEN) {
    return { valid: true };
  }

  // Then, check if it's an OAuth access token
  const tokenDataStr = await env.OAUTH_STORE.get(`token:${token}`);
  if (tokenDataStr) {
    const tokenData: OAuthTokenData = JSON.parse(tokenDataStr);
    if (tokenData.expiresAt > Date.now()) {
      return { valid: true };
    }
    // Token expired, delete it
    await env.OAUTH_STORE.delete(`token:${token}`);
    return { valid: false, error: "Token expired" };
  }

  return { valid: false, error: "Invalid token" };
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

    // OAuth 2.1 Metadata endpoints (public)
    if (url.pathname === "/.well-known/oauth-protected-resource") {
      const serverUrl = getServerUrl(request);
      return new Response(JSON.stringify(getProtectedResourceMetadata(serverUrl)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/.well-known/oauth-authorization-server") {
      const serverUrl = getServerUrl(request);
      return new Response(JSON.stringify(getAuthorizationServerMetadata(serverUrl)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OAuth 2.1 Dynamic Client Registration (public)
    if (url.pathname === "/oauth/register") {
      return handleOAuthRegister(request, env);
    }

    // OAuth 2.1 Authorization endpoint (public)
    if (url.pathname === "/oauth/authorize") {
      return handleOAuthAuthorize(request, env);
    }

    // OAuth 2.1 Token endpoint (public)
    if (url.pathname === "/oauth/token") {
      return handleOAuthToken(request, env);
    }

    // Legacy login endpoint (public)
    if (url.pathname === "/auth/login") {
      return handleLogin(request, env);
    }

    // Home page (public)
    if (url.pathname === "/") {
      const serverUrl = getServerUrl(request);
      return new Response(renderHomePage(serverUrl), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Health check page (public)
    if (url.pathname === "/health") {
      const serverUrl = getServerUrl(request);
      return new Response(renderHealthPage(serverUrl), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // MCP HTTP endpoint (protected)
    if (url.pathname === "/mcp") {
      // Validate authentication
      const auth = await validateAuth(request, env);
      if (!auth.valid) {
        const serverUrl = getServerUrl(request);
        const resourceMetadataUrl = `${serverUrl}/.well-known/oauth-protected-resource`;
        return new Response(
          JSON.stringify({ error: auth.error }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
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
