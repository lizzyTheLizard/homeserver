export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
  execute(args: Record<string, unknown>): Promise<string>
}
