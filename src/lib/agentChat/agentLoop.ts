import type { ChatMessage } from "@/lib/agentChat/types";

export type AgentChatRunMode = "chat" | "computer";

export interface AgentLoopTransport {
  runAgentChat: (session: { access_token: string }, userMsg: ChatMessage, assistantId: string) => Promise<void>;
  runAgentChatWithBrowser: (session: { access_token: string }, userMsg: ChatMessage, assistantId: string) => Promise<void>;
  runEmployeeChat: (session: { access_token: string }, userMsg: ChatMessage, assistantId: string) => Promise<void>;
  runComputerMode: (session: { access_token: string }, userMsg: ChatMessage, assistantId: string) => Promise<void>;
}

/**
 * Single branching point for assistant execution (chat vs computer, with/without employees/files).
 */
export async function runAgentLoop(params: {
  session: { access_token: string };
  userMsg: ChatMessage;
  assistantId: string;
  isActionMode: boolean;
  extensionConnected: boolean;
  transport: AgentLoopTransport;
}): Promise<void> {
  const { session, userMsg, assistantId, isActionMode, extensionConnected, transport } = params;
  const hasFiles = !!(userMsg.files && userMsg.files.length > 0);
  const hasEmployees = !!(userMsg.employees && userMsg.employees.length > 0);
  const computer = isActionMode && extensionConnected;
  const employeeComputer = computer && hasEmployees;
  const agentBrowser = computer && !hasEmployees;

  if (hasFiles && hasEmployees) {
    await transport.runEmployeeChat(session, userMsg, assistantId);
    return;
  }
  if (hasFiles) {
    await transport.runAgentChat(session, userMsg, assistantId);
    return;
  }
  if (employeeComputer) {
    await transport.runComputerMode(session, userMsg, assistantId);
    return;
  }
  if (agentBrowser) {
    await transport.runAgentChatWithBrowser(session, userMsg, assistantId);
    return;
  }
  if (hasEmployees) {
    await transport.runEmployeeChat(session, userMsg, assistantId);
    return;
  }
  await transport.runAgentChat(session, userMsg, assistantId);
}
