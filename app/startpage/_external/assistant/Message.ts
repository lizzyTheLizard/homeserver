export type Message = (UserMessage | AssistantMessage | SystemMessage | ToolResponseMessage | ToolCallMessage) & BaseMessage

interface BaseMessage { id: number, hidden: boolean }

interface UserMessage { role: 'user', content: string }

interface AssistantMessage { role: 'assistant', content: string }

interface SystemMessage { role: 'system', content: string }

interface ToolResponseMessage { role: 'tool', content: string, tool_call_id: string }

interface ToolCallMessage { role: 'assistant', tool_calls: ToolCall[] }

interface ToolCall { id: string, function: { arguments: string, name: string }, type: 'function' }

export interface InitialContext { location: { lat: number, lon: number } }
